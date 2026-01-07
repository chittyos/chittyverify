# ChittyCert Integration for ChittyVerify

This document describes the certificate-based evidence signing system integrated into ChittyVerify using ChittyCert PKI.

## Overview

ChittyVerify now supports cryptographic signing of evidence using X.509 certificates issued by ChittyCert (ChittyTrust's PKI service). This provides:

- **Cryptographic Chain of Custody**: Evidence is signed with RSASSA-PKCS1-v1_5 signatures
- **Non-repudiation**: Signatures prove evidence integrity and origin
- **Certificate Trust Chain**: Signatures verified against ChittyCert's root CA
- **Court Admissibility**: Certificate-based signatures enhance legal validity

## Architecture

### Components

1. **ChittyTrust Client Library** (`src/lib/chittytrust-client.ts`)
   - Interface to ChittyTrust PKI services
   - Certificate request and management
   - Key pair generation utilities

2. **ChittyCert Service** (`server/chittycert-service.ts`)
   - Evidence signing with certificates
   - Signature verification
   - Certificate validation

3. **Database Schema** (`shared/schema.ts`)
   - New fields in `masterEvidence` table:
     - `signature` - Base64-encoded RSASSA-PKCS1-v1_5 signature
     - `signerCertificatePem` - Full PEM certificate
     - `signedByCertSerial` - Certificate serial number
     - `signatureTimestamp` - When evidence was signed

4. **API Endpoints** (`server/routes.ts`)
   - `POST /api/v1/evidence/:id/sign` - Sign evidence
   - `GET /api/v1/evidence/:id/verify` - Verify signature
   - `GET /api/v1/evidence/:id/signature-info` - Get signature details

5. **UI Components** (`client/src/components/verification/`)
   - `SignatureVerificationBadge` - Display verification status
   - `EvidenceSigningButton` - Sign evidence from UI

## Setup Instructions

### 1. Request Document Signing Certificate

ChittyVerify needs a document signing certificate from ChittyCert:

```bash
# Set environment variables
export CHITTYCERT_URL="https://cert.chitty.cc"
export CHITTYCERT_SERVICE_TOKEN="<your-service-token>"
export CHITTYVERIFY_CHITTY_ID="<chittyverify-chitty-id>"

# The certificate will be requested automatically on first use
# Or manually request via ChittyCert API:
curl -X POST https://cert.chitty.cc/api/v1/x509/ca/issue \
  -H "Authorization: Bearer $CHITTYCERT_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestorChittyId": "'$CHITTYVERIFY_CHITTY_ID'",
    "requestorService": "chittyverify",
    "usage": "document_signing",
    "subject": {
      "commonName": "ChittyVerify Evidence Signing",
      "organization": "ChittyOS",
      "organizationalUnit": "Legal Technology",
      "country": "US"
    },
    "publicKeyPem": "<public-key-pem>",
    "validityYears": 2
  }'
```

### 2. Store Certificate Securely

Store the certificate and private key in environment variables or secrets:

```bash
# .env file
CHITTYCERT_CERTIFICATE_PEM="-----BEGIN CERTIFICATE-----..."
CHITTYCERT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
CHITTYCERT_CERTIFICATE_SERIAL="CERT-12345678"
```

### 3. Initialize ChittyCert Service

In your server startup code (`server/index.ts`):

```typescript
import { initChittyCertService } from './chittycert-service';

// Initialize on startup
const certService = initChittyCertService({
  certServiceUrl: process.env.CHITTYCERT_URL || 'https://cert.chitty.cc',
  serviceToken: process.env.CHITTYCERT_SERVICE_TOKEN!,
  chittyId: process.env.CHITTYVERIFY_CHITTY_ID!
});

// Load existing certificate or request new one
if (process.env.CHITTYCERT_CERTIFICATE_PEM && process.env.CHITTYCERT_PRIVATE_KEY_PEM) {
  certService.loadCertificate({
    certificatePem: process.env.CHITTYCERT_CERTIFICATE_PEM,
    privateKeyPem: process.env.CHITTYCERT_PRIVATE_KEY_PEM,
    serialNumber: process.env.CHITTYCERT_CERTIFICATE_SERIAL!,
    publicKeyPem: process.env.CHITTYCERT_PUBLIC_KEY_PEM!,
    validFrom: process.env.CHITTYCERT_VALID_FROM!,
    validUntil: process.env.CHITTYCERT_VALID_UNTIL!
  });
} else {
  // Request new certificate
  const cert = await certService.requestDocumentSigningCertificate();
  console.log('New certificate obtained:', cert.serialNumber);
  // IMPORTANT: Store cert.certificatePem and cert.privateKeyPem securely!
}
```

### 4. Update Database Schema

Run the database migration to add signature fields:

```bash
npm run db:push
```

Or manually run:

```sql
ALTER TABLE master_evidence
ADD COLUMN signature TEXT,
ADD COLUMN signer_certificate_pem TEXT,
ADD COLUMN signed_by_cert_serial TEXT,
ADD COLUMN signature_timestamp TIMESTAMP;
```

## Usage

### Backend: Sign Evidence

```typescript
import { storage } from './server/storage';

// Sign evidence by ID
const signedEvidence = await storage.signEvidence(evidenceId);

console.log('Evidence signed:', {
  signature: signedEvidence.signature,
  certificateSerial: signedEvidence.signedByCertSerial,
  signedAt: signedEvidence.signatureTimestamp
});
```

### Backend: Verify Signature

```typescript
const verificationResult = await storage.verifyEvidenceSignature(evidenceId);

if (verificationResult.valid) {
  console.log('Signature is valid!');
} else {
  console.log('Signature invalid:', verificationResult.details);
}
```

### Backend: Check Certificate Revocation (OCSP)

```typescript
import { getChittyCertService } from './server/chittycert-service';

const certService = getChittyCertService();

// Check if certificate is revoked
const ocspResult = await certService.checkOCSPRevocation(certificateSerial);

if (ocspResult.revoked) {
  console.log('Certificate revoked:', ocspResult.reason);
  console.log('Revoked at:', ocspResult.revokedAt);
} else {
  console.log('Certificate is valid');
}
```

### Backend: Validate Certificate Chain

```typescript
import { getChittyCertService } from './server/chittycert-service';

const certService = getChittyCertService();

// Validate certificate chain
const chainResult = await certService.validateCertificateChain(certificatePem);

if (chainResult.valid) {
  console.log('Certificate chain valid');
  console.log('Chain:', chainResult.chain);
} else {
  console.log('Certificate chain invalid:', chainResult.errors);
}
```

### Backend: Get Certificate Details

```typescript
import { getChittyCertService } from './server/chittycert-service';

const certService = getChittyCertService();

// Get full certificate details
const cert = await certService.getCertificateBySerial(serialNumber);

console.log('Certificate:', {
  serial: cert.serialNumber,
  subject: cert.subject,
  issuer: cert.issuer,
  validFrom: cert.validFrom,
  validUntil: cert.validUntil,
  status: cert.status
});
```

### API: Sign Evidence

```bash
curl -X POST http://localhost:5000/api/v1/evidence/:evidenceId/sign \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "message": "Evidence signed successfully",
  "data": {
    "evidenceId": "...",
    "artifactId": "ART-12345678",
    "signature": "base64-signature...",
    "certificateSerial": "CERT-12345678",
    "signedAt": "2025-11-08T...",
    "algorithm": "RSASSA-PKCS1-v1_5",
    "hashAlgorithm": "SHA-256"
  }
}
```

### API: Verify Signature

```bash
curl http://localhost:5000/api/v1/evidence/:evidenceId/verify
```

Response:
```json
{
  "success": true,
  "data": {
    "evidenceId": "...",
    "signatureValid": true,
    "certificateValid": true,
    "overallValid": true,
    "details": "Signature and certificate are valid",
    "verifiedAt": "2025-11-08T..."
  }
}
```

### API: Get Signature Information

```bash
curl http://localhost:5000/api/v1/evidence/:evidenceId/signature-info
```

Response:
```json
{
  "success": true,
  "data": {
    "evidenceId": "...",
    "artifactId": "ART-12345678",
    "isSigned": true,
    "certificateSerial": "CERT-12345678",
    "signedAt": "2025-11-08T...",
    "certificatePem": "-----BEGIN CERTIFICATE-----...",
    "algorithm": "RSASSA-PKCS1-v1_5",
    "hashAlgorithm": "SHA-256"
  }
}
```

### ChittyCert API: Check OCSP Revocation

```bash
curl https://cert.chitty.cc/api/v1/x509/ocsp/CERT-12345678 \
  -H "Authorization: Bearer $CHITTYCERT_SERVICE_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "revoked": false
  }
}
```

### ChittyCert API: Validate Certificate Chain

```bash
curl -X POST https://cert.chitty.cc/api/v1/x509/validate \
  -H "Authorization: Bearer $CHITTYCERT_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certificatePem": "-----BEGIN CERTIFICATE-----..."}'
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "chain": ["cert1", "cert2", "root"]
  }
}
```

### ChittyCert API: Get Certificate Details

```bash
curl https://cert.chitty.cc/api/v1/x509/certificates/CERT-12345678 \
  -H "Authorization: Bearer $CHITTYCERT_SERVICE_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "certificatePem": "-----BEGIN CERTIFICATE-----...",
    "serialNumber": "CERT-12345678",
    "subject": {
      "commonName": "ChittyVerify Evidence Signing",
      "organization": "ChittyOS"
    },
    "issuer": {
      "commonName": "ChittyCert CA",
      "organization": "ChittyFoundation"
    },
    "validFrom": "2025-11-08T00:00:00Z",
    "validUntil": "2027-11-08T00:00:00Z",
    "status": "active"
  }
}
```

### Frontend: Display Signature Status

```tsx
import { SignatureVerificationBadge } from '@/components/verification';

function EvidenceCard({ evidence }) {
  return (
    <div>
      <h3>{evidence.artifactId}</h3>
      <SignatureVerificationBadge
        evidenceId={evidence.id}
        showDetails={true}
        autoVerify={true}
      />
    </div>
  );
}
```

### Frontend: Sign Evidence Button

```tsx
import { EvidenceSigningButton } from '@/components/verification';

function EvidenceActions({ evidenceId }) {
  return (
    <EvidenceSigningButton
      evidenceId={evidenceId}
      onSigned={() => {
        console.log('Evidence signed!');
        // Refresh evidence list
      }}
    />
  );
}
```

### Auto-Sign on Upload

Evidence can be automatically signed when uploaded:

```typescript
// Create evidence with auto-signing
const response = await fetch(`/api/cases/${caseId}/evidence`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userBinding: userId,
    evidenceType: 'Document',
    evidenceTier: 'GOVERNMENT',
    contentHash: 'sha256-hash...',
    originalFilename: 'document.pdf',
    autoSign: true  // ← Auto-sign after upload
  })
});
```

## Chain of Custody

Every signature operation creates:

1. **Chain of Custody Entry**
   - Transfer method: `CRYPTOGRAPHIC_SIGNATURE`
   - Integrity check: `CERTIFICATE_SIGNATURE`
   - Notes include certificate serial number

2. **Audit Trail Entry**
   - Action type: `Sign` or `Verify`
   - Details include algorithm and certificate info
   - Success/failure status

## Security Considerations

### Private Key Storage

**CRITICAL**: The certificate private key must be stored securely:

- ✅ Use environment variables or secrets management (Vault, AWS Secrets Manager, etc.)
- ✅ Encrypt at rest if storing in database
- ✅ Restrict access to authorized services only
- ❌ Never commit to version control
- ❌ Never transmit over insecure channels
- ❌ Never log or expose in API responses

### Certificate Validation

Full certificate validation is implemented using ChittyCert API:

1. ✅ Verify certificate chain against ChittyCert root CA (`POST /api/v1/x509/validate`)
2. ✅ Check certificate revocation status via OCSP (`GET /api/v1/x509/ocsp/:serial`)
3. ✅ Fallback to basic validation if ChittyCert API is unavailable
4. ⚠️ Certificate expiration checking (dates extracted from PEM)
5. ⚠️ Usage constraints validation (requires full X.509 parser)

**ChittyCert API Endpoints:**
- `POST /api/v1/x509/ca/issue` - Issue new certificate
- `GET /api/v1/x509/ocsp/:serial` - OCSP revocation check
- `POST /api/v1/x509/validate` - Validate certificate chain
- `GET /api/v1/x509/crl/:caName.crl` - Download CRL
- `GET /api/v1/x509/certificates/:serial` - Get certificate details

### Signature Format

- Algorithm: `RSASSA-PKCS1-v1_5`
- Hash: `SHA-256`
- Encoding: Base64
- Format: Raw signature bytes (not ASN.1 wrapped)

## Integration with ChittyChain

Certificate signatures enhance blockchain minting:

1. Evidence signed with ChittyCert certificate
2. Signature verified before minting
3. Certificate serial included in blockchain metadata
4. Creates verifiable audit trail from upload → signing → minting

## Troubleshooting

### "ChittyCert service not initialized"

Ensure you call `initChittyCertService()` in your server startup:

```typescript
import { initChittyCertService } from './chittycert-service';

initChittyCertService({
  certServiceUrl: process.env.CHITTYCERT_URL!,
  serviceToken: process.env.CHITTYCERT_SERVICE_TOKEN!,
  chittyId: process.env.CHITTYVERIFY_CHITTY_ID!
});
```

### "No certificate loaded"

Load certificate before signing:

```typescript
const certService = getChittyCertService();
certService.loadCertificate({
  certificatePem: process.env.CHITTYCERT_CERTIFICATE_PEM!,
  privateKeyPem: process.env.CHITTYCERT_PRIVATE_KEY_PEM!,
  // ... other fields
});
```

### "Evidence must have a content hash to be signed"

Evidence must have a valid `contentHash` before signing. Generate hash on upload:

```typescript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
```

## Future Enhancements

- [ ] Implement full X.509 certificate parsing (not simplified version)
- [ ] Add CRL/OCSP certificate revocation checking
- [ ] Support batch signing of multiple evidence items
- [ ] Add certificate renewal automation
- [ ] Implement timestamping service integration
- [ ] Support multiple signing authorities
- [ ] Add signature verification UI in evidence viewer
- [ ] Generate PDF certificates of authenticity

## ChittyCert API Reference

**Base URL:** `https://cert.chitty.cc`

**Endpoints:**
- `POST /api/v1/x509/ca/issue` - Issue new certificate
- `GET /api/v1/x509/ocsp/:serial` - OCSP revocation check
- `POST /api/v1/x509/validate` - Validate certificate chain
- `GET /api/v1/x509/crl/:caName.crl` - Download CRL
- `GET /api/v1/x509/certificates/:serial` - Get certificate details

**Documentation:**
- ChittyCert API Documentation: https://cert.chitty.cc/api/docs
- ChittyTrust PKI: See `/chittyfoundation/chittytrust/README.md`
- Integration Guide: See `/chittyfoundation/chittytrust/INTEGRATION_GUIDE.md`

**Standards:**
- RSASSA-PKCS1-v1_5: RFC 8017
- X.509 Certificates: RFC 5280
- OCSP Protocol: RFC 6960
