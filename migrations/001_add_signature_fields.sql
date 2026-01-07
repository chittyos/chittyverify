-- Migration: Add ChittyCert Signature Fields to master_evidence
-- Created: 2025-11-08
-- Description: Adds certificate-based digital signature fields for evidence chain of custody

-- Add signature fields to master_evidence table
ALTER TABLE master_evidence
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signer_certificate_pem TEXT,
ADD COLUMN IF NOT EXISTS signed_by_cert_serial TEXT,
ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMP;

-- Create index on certificate serial for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_evidence_cert_serial
ON master_evidence(signed_by_cert_serial);

-- Create index on signature timestamp for auditing
CREATE INDEX IF NOT EXISTS idx_master_evidence_signature_timestamp
ON master_evidence(signature_timestamp);

-- Add comment to table
COMMENT ON COLUMN master_evidence.signature IS 'Base64-encoded RSASSA-PKCS1-v1_5 signature of content hash';
COMMENT ON COLUMN master_evidence.signer_certificate_pem IS 'Full PEM certificate used to sign evidence';
COMMENT ON COLUMN master_evidence.signed_by_cert_serial IS 'Certificate serial number for quick lookup';
COMMENT ON COLUMN master_evidence.signature_timestamp IS 'When evidence was cryptographically signed';

-- Migration complete
SELECT 'Migration 001_add_signature_fields completed successfully' AS status;
