# ChittyVerify Deployment Guide
## ChittyCert Integration - Production Deployment

**Version:** 1.0.0
**Date:** 2025-11-09
**Status:** READY FOR DEPLOYMENT ✅

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [ChittyCert Certificate Setup](#chittycert-certificate-setup)
5. [Service Registration](#service-registration)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Validation](#post-deployment-validation)
8. [Rollback Procedure](#rollback-procedure)
9. [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-Deployment Checklist

### ✅ Code Changes Validated

- [x] TypeScript compilation errors fixed
- [x] **CRITICAL:** `signature_timestamp` updated to TIMESTAMPTZ
- [x] Migration script corrected (001_add_signature_fields_v2.sql)
- [x] ChittyCert service integration complete
- [x] UI components created (SignatureVerificationBadge, EvidenceSigningButton)
- [x] API endpoints implemented (sign, verify, signature-info)

### ✅ Schema Validation (chittyschema-overlord)

**Overall Score:** 8.5/10 - **APPROVED FOR DEPLOYMENT**

**Key Findings:**
- ✅ Naming conventions compliant
- ✅ Non-breaking backward compatible change
- ✅ Appropriate indexes created
- ✅ Type safety enforced
- ✅ TIMESTAMPTZ fix applied (was critical issue)

### ⚠️ Known Issues & Recommendations

**Future Enhancements (non-blocking):**
- Add `deleted_at` and `anonymized_at` for GDPR compliance
- Add Zod validators for signature field lengths
- Plan ChittyLedger integration for immutable audit
- Consider VARCHAR constraints instead of TEXT

---

## Environment Setup

### 1. Copy Environment Template

```bash
cd /Users/nb/Projects/development/chittyverify
cp .env.template .env
```

### 2. Required Environment Variables

**Critical Variables (MUST SET):**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/chittyos-core

# ChittyCert Integration
CHITTYCERT_URL=https://cert.chitty.cc
CHITTYCERT_SERVICE_TOKEN=<your_service_token>
CHITTYVERIFY_CHITTY_ID=<your_chitty_id>

# Server
NODE_ENV=production
PORT=5000
SESSION_SECRET=<min_32_characters>
JWT_SECRET=<min_32_characters>
```

**Optional But Recommended:**

```bash
# ChittyID Integration
CHITTYID_SERVICE_URL=https://id.chitty.cc
CHITTYID_SERVICE_TOKEN=<your_token>

# ChittyAuth Integration
CHITTYAUTH_SERVICE_URL=https://auth.chitty.cc
CHITTYAUTH_SERVICE_TOKEN=<your_token>

# ChittyRegistry (Service Discovery)
CHITTYREGISTRY_URL=https://registry.chitty.cc
CHITTYREGISTRY_SERVICE_TOKEN=<your_token>
```

### 3. Secrets Management

**IMPORTANT:** Never commit these to version control!

```bash
# Production: Use secrets manager
# AWS Secrets Manager, HashiCorp Vault, etc.

# Development: Use .env.local
cp .env.template .env.local
# Add .env.local to .gitignore
```

---

## Database Migration

### Step 1: Verify Database Connection

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Should output PostgreSQL version
```

### Step 2: Create Base Tables (If Needed)

```bash
# Check if master_evidence table exists
psql $DATABASE_URL -c "\d master_evidence"

# If table doesn't exist, create base tables:
psql $DATABASE_URL -f create_tables.sql
```

### Step 3: Run ChittyCert Migration

```bash
# Run the corrected migration with TIMESTAMPTZ
psql $DATABASE_URL -f migrations/001_add_signature_fields_v2.sql
```

**Expected Output:**
```
BEGIN
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
COMMENT
COMMENT
NOTICE:  Migration validation passed: All signature columns and indexes created
DO
COMMIT
                          status
-----------------------------------------------------------
 Migration 001_add_signature_fields_v2 completed successfully
(1 row)
```

### Step 4: Verify Migration

```bash
# Check new columns exist
psql $DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'master_evidence'
    AND column_name IN ('signature', 'signer_certificate_pem', 'signed_by_cert_serial', 'signature_timestamp')
  ORDER BY ordinal_position;
"
```

**Expected Output:**
```
      column_name       |          data_type          | is_nullable
------------------------+-----------------------------+-------------
 signature              | text                        | YES
 signer_certificate_pem | text                        | YES
 signed_by_cert_serial  | text                        | YES
 signature_timestamp    | timestamp with time zone    | YES
```

**Verify indexes:**
```bash
psql $DATABASE_URL -c "
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'master_evidence'
    AND indexname LIKE '%signature%'
  ORDER BY indexname;
"
```

---

## ChittyCert Certificate Setup

### Step 1: Request Document Signing Certificate

```bash
# Generate key pair (or use chittytrust-client)
# This will be done by ChittyCert service when initialized

# Request certificate from ChittyCert
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
    "publicKeyPem": "<public-key-pem-from-generated-keypair>",
    "validityYears": 2
  }'
```

### Step 2: Store Certificate Securely

**Save the response to secure secrets storage:**

```bash
# Example response:
{
  "success": true,
  "data": {
    "certificatePem": "-----BEGIN CERTIFICATE-----...",
    "serialNumber": "CERT-12345678",
    "validFrom": "2025-11-09T00:00:00Z",
    "validUntil": "2027-11-09T00:00:00Z"
  }
}

# Store in .env (or secrets manager):
CHITTYCERT_CERTIFICATE_PEM="-----BEGIN CERTIFICATE-----..."
CHITTYCERT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
CHITTYCERT_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----..."
CHITTYCERT_CERTIFICATE_SERIAL="CERT-12345678"
CHITTYCERT_VALID_FROM="2025-11-09T00:00:00Z"
CHITTYCERT_VALID_UNTIL="2027-11-09T00:00:00Z"
```

### Step 3: Initialize ChittyCert Service

**Add to server startup code** (`server/index.ts`):

```typescript
import { initChittyCertService } from './chittycert-service';

// Initialize ChittyCert service on startup
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
  console.log('✅ ChittyCert certificate loaded:', process.env.CHITTYCERT_CERTIFICATE_SERIAL);
} else {
  console.warn('⚠️  ChittyCert certificate not configured. Evidence signing disabled.');
}
```

---

## Service Registration

**Status:** Awaiting chittyregister-compliance-sergeant agent analysis

The ChittyRegistry compliance agent is currently validating ChittyVerify's registration status. Once complete:

1. Review registration status
2. Update registration payload if needed
3. Register new ChittyCert endpoints:
   - `POST /api/v1/evidence/:id/sign`
   - `GET /api/v1/evidence/:id/verify`
   - `GET /api/v1/evidence/:id/signature-info`

---

## Deployment Steps

### 1. Build Application

```bash
cd /Users/nb/Projects/development/chittyverify

# Install dependencies
npm install

# Build TypeScript
npm run build

# Expected output: No errors, all files compiled
```

### 2. Run Tests

```bash
# Type check
npm run check

# Unit tests (if available)
npm test

# Integration tests
npm run test:integration
```

### 3. Deploy to Staging

```bash
# Set staging environment
export NODE_ENV=staging
export DATABASE_URL=$STAGING_DATABASE_URL

# Run migrations on staging
psql $STAGING_DATABASE_URL -f migrations/001_add_signature_fields_v2.sql

# Start server
npm run start
```

### 4. Smoke Tests on Staging

```bash
# Test health endpoint
curl http://staging.verify.chitty.cc/health

# Test signature endpoint with test evidence
curl -X POST http://staging.verify.chitty.cc/api/v1/evidence/test-evidence-id/sign \
  -H "Authorization: Bearer $TEST_TOKEN"

# Test verification
curl http://staging.verify.chitty.cc/api/v1/evidence/test-evidence-id/verify

# Test signature info
curl http://staging.verify.chitty.cc/api/v1/evidence/test-evidence-id/signature-info
```

### 5. Deploy to Production

```bash
# Set production environment
export NODE_ENV=production
export DATABASE_URL=$PRODUCTION_DATABASE_URL

# IMPORTANT: Run migration during low-traffic window
# Expected execution time: <100ms (non-blocking for reads)

psql $PRODUCTION_DATABASE_URL -f migrations/001_add_signature_fields_v2.sql

# Start production server
npm run start

# Or use process manager
pm2 start npm --name chittyverify -- run start
```

---

## Post-Deployment Validation

### 1. Verify Migration Success

```bash
# Check all signature columns exist
psql $DATABASE_URL -c "
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_name = 'master_evidence'
    AND column_name IN ('signature', 'signer_certificate_pem', 'signed_by_cert_serial', 'signature_timestamp');
"
# Expected: 4
```

### 2. Test Evidence Signing

```bash
# Create test evidence
curl -X POST https://verify.chitty.cc/api/cases/test-case/evidence \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userBinding": "test-user",
    "evidenceType": "Document",
    "evidenceTier": "GOVERNMENT",
    "contentHash": "sha256:test-hash",
    "originalFilename": "test-evidence.pdf",
    "autoSign": true
  }'

# Response should include signature fields populated
```

### 3. Verify Backward Compatibility

```bash
# Query existing evidence (should still load with NULL signature fields)
curl https://verify.chitty.cc/api/cases/existing-case/evidence \
  -H "Authorization: Bearer $PROD_TOKEN"

# All existing evidence should load successfully with signature: null
```

### 4. Monitor Logs

```bash
# Check for ChittyCert initialization
tail -f /var/log/chittyverify/app.log | grep "ChittyCert"

# Expected:
# ✅ ChittyCert certificate loaded: CERT-12345678
```

### 5. Performance Check

```bash
# Monitor database query performance
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE tablename = 'master_evidence'
    AND indexname LIKE '%signature%';
"

# Verify indexes are being used
```

---

## Rollback Procedure

### Quick Rollback (If Issues Detected)

```bash
# Stop application
pm2 stop chittyverify

# Rollback database migration
psql $DATABASE_URL <<'EOF'
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_master_evidence_cert_serial;
DROP INDEX IF EXISTS idx_master_evidence_signature_timestamp;
DROP INDEX IF EXISTS idx_master_evidence_signing_audit;

-- Drop columns
ALTER TABLE master_evidence
DROP COLUMN IF EXISTS signature,
DROP COLUMN IF EXISTS signer_certificate_pem,
DROP COLUMN IF EXISTS signed_by_cert_serial,
DROP COLUMN IF EXISTS signature_timestamp;

-- Validate rollback
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_evidence'
      AND column_name IN ('signature', 'signer_certificate_pem')
  ) THEN
    RAISE EXCEPTION 'Rollback validation failed: Columns still exist';
  END IF;
  RAISE NOTICE 'Rollback completed successfully';
END $$;

COMMIT;
EOF

# Restart previous version
git checkout <previous-commit>
npm run build
pm2 start chittyverify
```

### Partial Rollback (Disable Signing Only)

```bash
# Comment out ChittyCert initialization in server/index.ts
# Evidence will remain unsigned but existing functionality works

# Restart server
pm2 restart chittyverify
```

---

## Monitoring & Alerts

### Metrics to Monitor

1. **Signature Success Rate**
   - Track `POST /api/v1/evidence/:id/sign` success/failure rate
   - Alert if failure rate > 5%

2. **ChittyCert API Availability**
   - Monitor connectivity to `cert.chitty.cc`
   - Alert if unavailable for > 5 minutes

3. **Certificate Expiration**
   - Check `CHITTYCERT_VALID_UNTIL` date
   - Alert 30 days before expiration

4. **Database Performance**
   - Monitor query times for signature-related queries
   - Alert if p95 latency > 100ms

5. **Error Rates**
   - Track signature verification failures
   - Track OCSP revocation check failures

### Logging

```typescript
// server/chittycert-service.ts logs:
- ✅ "Evidence signed: <evidenceId>"
- ❌ "Failed to sign evidence: <error>"
- ⚠️  "Certificate validation failed: <reason>"
- ℹ️  "OCSP revocation check: <serial> - <result>"
```

### Alerts Configuration

```yaml
# Example: Prometheus alerts
groups:
  - name: chittyverify_chittycert
    rules:
      - alert: HighSignatureFailureRate
        expr: rate(signature_errors_total[5m]) > 0.05
        for: 10m
        annotations:
          summary: "High evidence signing failure rate"

      - alert: ChittyCertServiceDown
        expr: up{job="chittycert"} == 0
        for: 5m
        annotations:
          summary: "ChittyCert service unavailable"

      - alert: CertificateExpiringSoon
        expr: (chittycert_certificate_expiry_timestamp - time()) < 2592000 # 30 days
        annotations:
          summary: "ChittyCert certificate expires in < 30 days"
```

---

## Troubleshooting

### Issue: "ChittyCert service not initialized"

**Solution:**
```bash
# Check environment variables
echo $CHITTYCERT_URL
echo $CHITTYCERT_SERVICE_TOKEN
echo $CHITTYVERIFY_CHITTY_ID

# Verify ChittyCert service initialization in logs
tail -f /var/log/chittyverify/app.log | grep "ChittyCert"
```

### Issue: "Evidence must have a content hash to be signed"

**Solution:**
Evidence requires a valid `contentHash` before signing. Ensure SHA-256 hash is generated on upload:

```typescript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
```

### Issue: "Signature verification failed"

**Possible causes:**
1. Certificate revoked (check OCSP)
2. Content hash changed after signing
3. Certificate chain invalid

**Debug:**
```bash
# Check OCSP status
curl https://cert.chitty.cc/api/v1/x509/ocsp/CERT-12345678 \
  -H "Authorization: Bearer $TOKEN"

# Validate certificate chain
curl -X POST https://cert.chitty.cc/api/v1/x509/validate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"certificatePem": "..."}'
```

---

## Success Criteria

✅ **Deployment considered successful when:**

1. Migration executed without errors
2. All 4 signature columns created with correct types (TIMESTAMPTZ)
3. Indexes created successfully
4. ChittyCert service initialized
5. Test evidence signed successfully
6. Signature verification passes
7. Backward compatibility confirmed (existing evidence loads)
8. No performance degradation
9. Chain of custody logs generated
10. Audit trail entries created

---

## Support & Documentation

- **ChittyCert API:** https://cert.chitty.cc/api/docs
- **Integration Guide:** `CHITTYCERT_INTEGRATION.md`
- **API Update:** `CHITTYCERT_API_UPDATE.md`
- **Schema Validation:** See chittyschema-overlord report above
- **ChittyTrust PKI:** `/chittyfoundation/chittytrust/README.md`

---

## Deployment Sign-Off

**Deployed By:** _________________
**Date:** _________________
**Environment:** [ ] Staging [ ] Production
**Migration Status:** [ ] Success [ ] Failed
**Rollback Tested:** [ ] Yes [ ] No
**Monitoring Configured:** [ ] Yes [ ] No

**Notes:**
_______________________________________
_______________________________________
_______________________________________
