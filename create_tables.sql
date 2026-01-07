-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR PRIMARY KEY,
    case_id VARCHAR NOT NULL UNIQUE,
    title VARCHAR NOT NULL,
    description TEXT,
    case_type VARCHAR,
    case_number VARCHAR NOT NULL,
    jurisdiction VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active',
    created_by VARCHAR NOT NULL,
    priority VARCHAR DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create master_evidence table
CREATE TABLE IF NOT EXISTS master_evidence (
    id VARCHAR PRIMARY KEY,
    artifact_id VARCHAR NOT NULL UNIQUE,
    title VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR NOT NULL,
    subtype VARCHAR,
    status VARCHAR DEFAULT 'uploaded',
    case_id VARCHAR,
    case_binding VARCHAR,
    user_binding VARCHAR NOT NULL,
    evidence_type VARCHAR NOT NULL,
    evidence_tier VARCHAR,
    file_path VARCHAR,
    file_size INTEGER,
    file_hash VARCHAR,
    upload_timestamp TIMESTAMP DEFAULT NOW(),
    trust_score DECIMAL DEFAULT 0.0,
    verification_status VARCHAR DEFAULT 'pending',
    verify_status VARCHAR DEFAULT 'Unverified',
    verify_timestamp TIMESTAMP,
    verify_signature VARCHAR,
    minting_status VARCHAR DEFAULT 'Pending',
    blockchain_hash VARCHAR,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create atomic_facts table
CREATE TABLE IF NOT EXISTS atomic_facts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_document VARCHAR NOT NULL,
    fact_type VARCHAR NOT NULL,
    fact_content TEXT NOT NULL,
    confidence DECIMAL DEFAULT 0.0,
    source VARCHAR,
    extracted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO cases (id, case_id, title, description, case_type, case_number, jurisdiction, created_by) VALUES 
('case-1', 'COOK-2025-PROPERTY-001', 'Property Tax Assessment Challenge', 'Challenging the 2024 property tax assessment for 123 Main St', 'property', 'PROP-2025-001', 'Cook County', 'CH-2025-VER-0001-A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_evidence (id, artifact_id, title, description, type, subtype, case_binding, user_binding, evidence_type, evidence_tier) VALUES 
('evidence-1', 'ART-PROP-001', 'Property Tax Statement 2024', 'Official Cook County property tax statement', 'document', 'tax_document', 'case-1', 'CH-2025-VER-0001-A', 'Document', 'GOVERNMENT'),
('evidence-2', 'ART-PROP-002', 'Property Assessment Notice', 'Notice of property value assessment', 'document', 'assessment', 'case-1', 'CH-2025-VER-0001-A', 'Document', 'GOVERNMENT')
ON CONFLICT (artifact_id) DO NOTHING;
