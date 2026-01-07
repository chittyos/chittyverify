/**
 * ChittyTrust Client Library
 *
 * Client library for ChittyOS services to request certificates from ChittyTrust
 */

export interface ChittyTrustConfig {
  baseUrl: string; // https://trust.chitty.foundation
  serviceToken: string; // Service authentication token
}

export interface CertificateRequestOptions {
  commonName: string;
  organization: string;
  organizationalUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  emailAddress?: string;
  publicKeyPem: string;
  validityYears: number;
  policyId: string;
  requestorChittyId: string;
  requestorService?: string;
  metadata?: Record<string, any>;
}

export interface IntermediateCertificate {
  id: string;
  type: 'intermediate';
  commonName: string;
  serialNumber: string;
  certificatePem: string;
  publicKeyPem: string;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'revoked' | 'expired';
  issuerId: string;
}

export interface IssuanceRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  requestType: 'intermediate' | 'cross_cert' | 'renewal';
  requestorChittyId: string;
  createdAt: string;
  approvedAt?: string;
  issuedCertId?: string;
}

/**
 * ChittyTrust API Client
 */
export class ChittyTrustClient {
  private config: ChittyTrustConfig;

  constructor(config: ChittyTrustConfig) {
    this.config = config;
  }

  /**
   * Request intermediate CA certificate
   * Requires 2-of-3 approval for issuance
   */
  async requestIntermediateCA(
    options: CertificateRequestOptions
  ): Promise<IssuanceRequest> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/intermediate/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.serviceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestType: 'intermediate',
        requestorChittyId: options.requestorChittyId,
        requestorService: options.requestorService,
        subjectDN: {
          commonName: options.commonName,
          organization: options.organization,
          organizationalUnit: options.organizationalUnit,
          country: options.country || 'US',
          state: options.state,
          locality: options.locality,
          emailAddress: options.emailAddress,
        },
        publicKeyPem: options.publicKeyPem,
        policyId: options.policyId,
        validityYears: options.validityYears,
        metadata: options.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Certificate request failed: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.data.issuanceRequest;
  }

  /**
   * Get issuance request status
   */
  async getIssuanceRequest(requestId: string): Promise<IssuanceRequest> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/intermediate?status=all`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get issuance request: ${response.statusText}`);
    }

    const result = await response.json();
    const request = result.data.intermediates.find((r: any) => r.id === requestId);

    if (!request) {
      throw new Error(`Issuance request ${requestId} not found`);
    }

    return request;
  }

  /**
   * Get intermediate CA certificate by ID
   */
  async getCertificate(certId: string): Promise<IntermediateCertificate> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/intermediate/${certId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get certificate: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Download trust anchor bundle (PEM format)
   */
  async getTrustAnchors(): Promise<string> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/trust-anchors`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get trust anchors: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Validate policy before requesting certificate
   */
  async validatePolicy(
    policyId: string,
    request: CertificateRequestOptions
  ): Promise<{
    valid: boolean;
    violations: Array<{ requirement: string; message: string }>;
  }> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/policies/validate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policyId,
          request: {
            requestType: 'intermediate',
            requestorChittyId: request.requestorChittyId,
            subjectDN: {
              commonName: request.commonName,
              organization: request.organization,
            },
            publicKeyPem: request.publicKeyPem,
            policyId,
            validityYears: request.validityYears,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Policy validation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      valid: result.data.valid,
      violations: result.data.violations || [],
    };
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(
    certId: string,
    reason: string,
    revokedBy: string
  ): Promise<void> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/intermediate/${certId}/revoke`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, revokedBy }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Certificate revocation failed: ${error.error?.message || response.statusText}`);
    }
  }
}

/**
 * Create ChittyTrust client for service use
 */
export function createChittyTrustClient(config: ChittyTrustConfig): ChittyTrustClient {
  return new ChittyTrustClient(config);
}

/**
 * Helper: Generate RSA key pair for certificate request
 * Uses Web Crypto API (available in Cloudflare Workers)
 */
export async function generateKeyPair(): Promise<{
  publicKeyPem: string;
  privateKeyPem: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  // Export public key to PEM
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyB64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  // Export private key to PEM
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyB64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyB64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

  return {
    publicKeyPem,
    privateKeyPem,
  };
}
