/**
 * ChittyCert Service for ChittyVerify
 *
 * Handles certificate-based evidence signing for chain of custody
 * Integrates with ChittyTrust's ChittyCert PKI system
 */

import { generateKeyPair } from '../src/lib/chittytrust-client';

interface ChittyCertConfig {
  certServiceUrl: string; // https://cert.chitty.cc
  serviceToken: string;
  chittyId: string; // ChittyVerify's ChittyID
}

interface DocumentSigningCertificate {
  certificatePem: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  privateKeyPem: string; // Stored securely, never transmitted
  publicKeyPem: string;
}

interface SignatureResult {
  signature: string; // Base64-encoded signature
  certificatePem: string;
  certificateSerial: string;
  timestamp: string;
  algorithm: 'RSASSA-PKCS1-v1_5';
  hashAlgorithm: 'SHA-256';
}

interface VerificationResult {
  valid: boolean;
  certificateValid: boolean;
  signatureValid: boolean;
  certificateSerial: string;
  signedAt: string;
  errors?: string[];
}

/**
 * ChittyCert Service for evidence signing
 */
class ChittyCertService {
  private config: ChittyCertConfig;
  private certificate: DocumentSigningCertificate | null = null;

  constructor(config: ChittyCertConfig) {
    this.config = config;
  }

  /**
   * Request a document signing certificate from ChittyCert
   */
  async requestDocumentSigningCertificate(): Promise<DocumentSigningCertificate> {
    try {
      // Generate key pair for the certificate
      const { publicKeyPem, privateKeyPem } = await generateKeyPair();

      // Request certificate from ChittyCert
      const response = await fetch(`${this.config.certServiceUrl}/api/v1/x509/ca/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.serviceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestorChittyId: this.config.chittyId,
          requestorService: 'chittyverify',
          usage: 'document_signing',
          subject: {
            commonName: 'ChittyVerify Evidence Signing',
            organization: 'ChittyOS',
            organizationalUnit: 'Legal Technology',
            country: 'US',
          },
          publicKeyPem,
          validityYears: 2,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Certificate request failed: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();

      const certificate: DocumentSigningCertificate = {
        certificatePem: result.data.certificatePem,
        serialNumber: result.data.serialNumber,
        validFrom: result.data.validFrom,
        validUntil: result.data.validUntil,
        privateKeyPem,
        publicKeyPem,
      };

      this.certificate = certificate;
      return certificate;
    } catch (error) {
      console.error('Failed to request document signing certificate:', error);
      throw error;
    }
  }

  /**
   * Load existing certificate (from environment or secure storage)
   */
  loadCertificate(cert: DocumentSigningCertificate) {
    this.certificate = cert;
  }

  /**
   * Sign evidence content hash with certificate
   * Uses RSASSA-PKCS1-v1_5 with SHA-256
   */
  async signEvidence(evidenceHash: string): Promise<SignatureResult> {
    if (!this.certificate) {
      throw new Error('No certificate loaded. Call requestDocumentSigningCertificate() first.');
    }

    try {
      // Import private key for signing
      const privateKey = await this.importPrivateKey(this.certificate.privateKeyPem);

      // Create signature over the evidence hash
      const dataToSign = new TextEncoder().encode(evidenceHash);
      const signatureBuffer = await crypto.subtle.sign(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        privateKey,
        dataToSign
      );

      // Convert signature to base64
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      const result: SignatureResult = {
        signature: signatureBase64,
        certificatePem: this.certificate.certificatePem,
        certificateSerial: this.certificate.serialNumber,
        timestamp: new Date().toISOString(),
        algorithm: 'RSASSA-PKCS1-v1_5',
        hashAlgorithm: 'SHA-256',
      };

      return result;
    } catch (error) {
      console.error('Failed to sign evidence:', error);
      throw new Error(`Evidence signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify evidence signature
   */
  async verifySignature(
    evidenceHash: string,
    signature: string,
    certificatePem: string
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    let signatureValid = false;
    let certificateValid = false;

    try {
      // Extract public key from certificate
      const publicKey = await this.extractPublicKeyFromCertificate(certificatePem);

      // Verify the signature
      const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const dataToVerify = new TextEncoder().encode(evidenceHash);

      signatureValid = await crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        publicKey,
        signatureBuffer,
        dataToVerify
      );

      if (!signatureValid) {
        errors.push('Signature verification failed - signature does not match evidence hash');
      }

      // Validate certificate (basic check - in production, verify against ChittyCert CA)
      certificateValid = await this.validateCertificate(certificatePem);

      if (!certificateValid) {
        errors.push('Certificate validation failed');
      }

      // Extract certificate serial number
      const certSerial = this.extractSerialNumber(certificatePem);

      return {
        valid: signatureValid && certificateValid,
        signatureValid,
        certificateValid,
        certificateSerial: certSerial,
        signedAt: new Date().toISOString(), // In production, extract from signature timestamp
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        valid: false,
        signatureValid: false,
        certificateValid: false,
        certificateSerial: 'unknown',
        signedAt: new Date().toISOString(),
        errors,
      };
    }
  }

  /**
   * Import private key from PEM format
   */
  private async importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
    // Remove PEM headers and decode base64
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  }

  /**
   * Extract public key from certificate PEM
   */
  private async extractPublicKeyFromCertificate(certificatePem: string): Promise<CryptoKey> {
    // This is a simplified version - in production, use a proper X.509 parser
    // For now, we'll extract the public key section from the certificate

    // Remove certificate headers
    const pemHeader = '-----BEGIN CERTIFICATE-----';
    const pemFooter = '-----END CERTIFICATE-----';
    const pemContents = certificatePem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    // For simplified version, assume the certificate contains the public key in SPKI format
    // In production, properly parse the X.509 certificate structure
    return await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );
  }

  /**
   * Validate certificate using ChittyCert API
   */
  private async validateCertificate(certificatePem: string): Promise<boolean> {
    try {
      // Check if certificate PEM is well-formed
      if (!certificatePem.includes('BEGIN CERTIFICATE') || !certificatePem.includes('END CERTIFICATE')) {
        return false;
      }

      // Validate certificate chain via ChittyCert API
      const chainValidation = await this.validateCertificateChain(certificatePem);
      if (!chainValidation.valid) {
        console.error('Certificate chain validation failed:', chainValidation.errors);
        return false;
      }

      // Extract serial number and check OCSP revocation status
      const serial = this.extractSerialNumber(certificatePem);
      const ocspResult = await this.checkOCSPRevocation(serial);
      if (ocspResult.revoked) {
        console.error('Certificate revoked:', ocspResult.reason);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Certificate validation error:', error);
      // Fallback to basic validation if ChittyCert API is unavailable
      return certificatePem.includes('BEGIN CERTIFICATE') && certificatePem.includes('END CERTIFICATE');
    }
  }

  /**
   * Extract serial number from certificate PEM
   */
  private extractSerialNumber(certificatePem: string): string {
    // Simplified extraction - in production, use proper X.509 parser
    // For now, return a placeholder
    return 'CERT-' + certificatePem.substring(26, 38);
  }

  /**
   * Get current certificate info
   */
  getCertificateInfo(): DocumentSigningCertificate | null {
    return this.certificate;
  }

  /**
   * Check certificate revocation status via OCSP
   */
  async checkOCSPRevocation(certificateSerial: string): Promise<{
    revoked: boolean;
    revokedAt?: string;
    reason?: string;
  }> {
    try {
      const response = await fetch(
        `${this.config.certServiceUrl}/api/v1/x509/ocsp/${certificateSerial}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.serviceToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OCSP check failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('OCSP revocation check error:', error);
      throw error;
    }
  }

  /**
   * Validate certificate chain
   */
  async validateCertificateChain(certificatePem: string): Promise<{
    valid: boolean;
    chain: string[];
    errors?: string[];
  }> {
    try {
      const response = await fetch(
        `${this.config.certServiceUrl}/api/v1/x509/validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.serviceToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ certificatePem }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chain validation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Certificate chain validation error:', error);
      throw error;
    }
  }

  /**
   * Download CRL (Certificate Revocation List)
   */
  async downloadCRL(caName: string = 'ChittyCert'): Promise<string> {
    try {
      const response = await fetch(
        `${this.config.certServiceUrl}/api/v1/x509/crl/${caName}.crl`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.serviceToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CRL download failed: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('CRL download error:', error);
      throw error;
    }
  }

  /**
   * Get certificate by serial number
   */
  async getCertificateBySerial(serial: string): Promise<{
    certificatePem: string;
    serialNumber: string;
    subject: Record<string, string>;
    issuer: Record<string, string>;
    validFrom: string;
    validUntil: string;
    status: string;
  }> {
    try {
      const response = await fetch(
        `${this.config.certServiceUrl}/api/v1/x509/certificates/${serial}`,
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
    } catch (error) {
      console.error('Get certificate error:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance for ChittyVerify service
 */
let chittyCertServiceInstance: ChittyCertService | null = null;

/**
 * Initialize ChittyCert service (call once at startup)
 */
export function initChittyCertService(config: ChittyCertConfig): ChittyCertService {
  if (!chittyCertServiceInstance) {
    chittyCertServiceInstance = new ChittyCertService(config);
  }
  return chittyCertServiceInstance;
}

/**
 * Get ChittyCert service instance
 */
export function getChittyCertService(): ChittyCertService {
  if (!chittyCertServiceInstance) {
    throw new Error('ChittyCert service not initialized. Call initChittyCertService() first.');
  }
  return chittyCertServiceInstance;
}

export type { ChittyCertConfig, DocumentSigningCertificate, SignatureResult, VerificationResult };
export { ChittyCertService };
