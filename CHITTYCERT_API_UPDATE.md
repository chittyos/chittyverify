# ChittyCert API Update Summary

## Changes Made

Updated ChittyVerify's ChittyCert integration to use the correct API endpoints.

### Domain Change
- **Old:** `https://cert.chitty.foundation`
- **New:** `https://cert.chitty.cc`

### Endpoint Updates

| Purpose | Old Endpoint | New Endpoint |
|---------|-------------|--------------|
| Certificate Issuance | `/api/v1/issue` | `/api/v1/x509/ca/issue` |
| OCSP Revocation Check | N/A | `/api/v1/x509/ocsp/:serial` |
| Chain Validation | N/A | `/api/v1/x509/validate` |
| CRL Download | N/A | `/api/v1/x509/crl/:caName.crl` |
| Get Certificate | N/A | `/api/v1/x509/certificates/:serial` |

## Files Updated

### 1. `server/chittycert-service.ts`
- ✅ Updated domain: `cert.chitty.foundation` → `cert.chitty.cc`
- ✅ Updated issuance endpoint: `/api/v1/issue` → `/api/v1/x509/ca/issue`
- ✅ Added `checkOCSPRevocation()` method
- ✅ Added `validateCertificateChain()` method
- ✅ Added `downloadCRL()` method
- ✅ Added `getCertificateBySerial()` method
- ✅ Updated `validateCertificate()` to use ChittyCert API for full validation

### 2. `CHITTYCERT_INTEGRATION.md`
- ✅ Updated all domain references
- ✅ Updated setup instructions with correct endpoint
- ✅ Added comprehensive API endpoint documentation
- ✅ Added usage examples for all new methods
- ✅ Added ChittyCert API examples (OCSP, validation, etc.)
- ✅ Updated certificate validation section

## New Features

### Enhanced Certificate Validation
The certificate validation now performs complete validation:

1. **Chain Validation** - Verifies certificate chain against ChittyCert root CA
2. **OCSP Revocation Check** - Real-time revocation status via OCSP
3. **Fallback Validation** - Basic validation if ChittyCert API unavailable

### Additional API Methods

```typescript
// Check if certificate is revoked
const ocspResult = await certService.checkOCSPRevocation(serial);

// Validate certificate chain
const chainResult = await certService.validateCertificateChain(certPem);

// Download Certificate Revocation List
const crl = await certService.downloadCRL('ChittyCert');

// Get full certificate details
const cert = await certService.getCertificateBySerial(serial);
```

## Environment Variables

Update your `.env` file:

```bash
# Old
CHITTYCERT_URL=https://cert.chitty.foundation

# New
CHITTYCERT_URL=https://cert.chitty.cc
```

## API Examples

### Issue Certificate
```bash
curl -X POST https://cert.chitty.cc/api/v1/x509/ca/issue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestorChittyId": "CH-...",
    "requestorService": "chittyverify",
    "usage": "document_signing",
    "subject": {
      "commonName": "ChittyVerify Evidence Signing",
      "organization": "ChittyOS"
    },
    "publicKeyPem": "...",
    "validityYears": 2
  }'
```

### Check Revocation (OCSP)
```bash
curl https://cert.chitty.cc/api/v1/x509/ocsp/CERT-12345678 \
  -H "Authorization: Bearer $TOKEN"
```

### Validate Chain
```bash
curl -X POST https://cert.chitty.cc/api/v1/x509/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certificatePem": "-----BEGIN CERTIFICATE-----..."}'
```

### Get Certificate Details
```bash
curl https://cert.chitty.cc/api/v1/x509/certificates/CERT-12345678 \
  -H "Authorization: Bearer $TOKEN"
```

## Migration Checklist

- [ ] Update `CHITTYCERT_URL` environment variable to `https://cert.chitty.cc`
- [ ] Re-request document signing certificate from new endpoint
- [ ] Update stored certificate references
- [ ] Test certificate signing with new API
- [ ] Verify OCSP revocation checking works
- [ ] Test certificate chain validation

## Backward Compatibility

All existing signature verification functionality remains unchanged. Only the certificate issuance and validation logic has been updated to use the correct ChittyCert API endpoints.

## Testing

To test the updated integration:

```bash
# 1. Sign evidence
curl -X POST http://localhost:5000/api/v1/evidence/:id/sign

# 2. Verify signature (now uses full validation)
curl http://localhost:5000/api/v1/evidence/:id/verify

# 3. Check signature info
curl http://localhost:5000/api/v1/evidence/:id/signature-info
```

## Support

For issues with ChittyCert API:
- Documentation: https://cert.chitty.cc/api/docs
- ChittyTrust Repo: `/chittyfoundation/chittytrust`
