-- Migration: 001_add_signature_fields_v2.sql
-- CORRECTED VERSION with TIMESTAMPTZ
-- Created: 2025-11-09
-- Description: Adds ChittyCert certificate-based digital signature fields

BEGIN;

-- Add signature fields to master_evidence table
ALTER TABLE master_evidence
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signer_certificate_pem TEXT,
ADD COLUMN IF NOT EXISTS signed_by_cert_serial TEXT,
ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ; -- CORRECTED: Now uses TIMESTAMPTZ

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_evidence_cert_serial
ON master_evidence(signed_by_cert_serial);

CREATE INDEX IF NOT EXISTS idx_master_evidence_signature_timestamp
ON master_evidence(signature_timestamp);

-- Optional: Composite index for audit queries
CREATE INDEX IF NOT EXISTS idx_master_evidence_signing_audit
ON master_evidence(signature_timestamp DESC, signed_by_cert_serial)
WHERE signature IS NOT NULL;

-- Add column comments
COMMENT ON COLUMN master_evidence.signature IS
'Base64-encoded RSASSA-PKCS1-v1_5 signature of content hash';

COMMENT ON COLUMN master_evidence.signer_certificate_pem IS
'Full PEM-encoded X.509 certificate used to sign evidence';

COMMENT ON COLUMN master_evidence.signed_by_cert_serial IS
'X.509 certificate serial number (hex) for quick lookup';

COMMENT ON COLUMN master_evidence.signature_timestamp IS
'When evidence was cryptographically signed (TIMESTAMPTZ for legal compliance)';

-- Validation check
DO $$
DECLARE
  col_count INTEGER;
  idx_count INTEGER;
BEGIN
  -- Check columns exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'master_evidence'
    AND column_name IN ('signature', 'signer_certificate_pem',
                        'signed_by_cert_serial', 'signature_timestamp');

  IF col_count <> 4 THEN
    RAISE EXCEPTION 'Migration validation failed: Expected 4 columns, found %', col_count;
  END IF;

  -- Check timestamp type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_evidence'
      AND column_name = 'signature_timestamp'
      AND data_type = 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'Migration validation failed: signature_timestamp must be TIMESTAMPTZ';
  END IF;

  -- Check indexes exist
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'master_evidence'
    AND indexname IN ('idx_master_evidence_cert_serial',
                      'idx_master_evidence_signature_timestamp');

  IF idx_count < 2 THEN
    RAISE EXCEPTION 'Migration validation failed: Expected 2+ indexes, found %', idx_count;
  END IF;

  RAISE NOTICE 'Migration validation passed: All signature columns and indexes created';
END $$;

COMMIT;

-- Success message
SELECT 'Migration 001_add_signature_fields_v2 completed successfully' AS status;
