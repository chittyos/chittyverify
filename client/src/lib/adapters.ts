/**
 * Data shape adapters: evidence.chitty.cc responses → SPA component shapes
 */

export interface EvidenceDocument {
  id: string;
  file_name: string;
  content_hash: string;
  document_type: string;
  processing_status: string;
  ocr_text?: string;
  metadata?: string;
  case_id?: string;
  client_id?: string;
  privilege_flag?: string;
  evidence_strength_score?: number;
  created_at: string;
  updated_at: string;
  entity_names?: string;
}

export interface DocumentDetail {
  document: EvidenceDocument;
  entities: Array<{
    id: string;
    entity_type: string;
    name: string;
    role?: string;
  }>;
  authorities: Array<{
    id: string;
    authority_type: string;
    grantor_name: string;
    grantee_name: string;
  }>;
  family: {
    parents: unknown[];
    children: unknown[];
  };
  summary: {
    summary_text?: string;
    bullet_points?: string;
    claim_count?: number;
  } | null;
}

/** Shape that existing SPA components expect */
export interface EvidenceCardData {
  id: string;
  artifactId: string;
  title: string;
  description: string;
  type: string;
  status: string;
  trustScore: number;
  uploadedAt: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
  verifyStatus?: string;
  mintingStatus?: string;
}

/** Transform evidence.chitty.cc document → SPA evidence card */
export function toEvidenceCard(doc: EvidenceDocument): EvidenceCardData {
  const meta = doc.metadata ? safeParse(doc.metadata) : {};
  return {
    id: doc.id,
    artifactId: doc.content_hash?.slice(0, 12)?.toUpperCase() || doc.id.slice(0, 12).toUpperCase(),
    title: meta.title || doc.file_name || doc.id,
    description: meta.description || doc.document_type || '',
    type: doc.document_type || 'unknown',
    status: mapProcessingStatus(doc.processing_status),
    trustScore: Math.round((doc.evidence_strength_score || 0) * 100),
    uploadedAt: doc.created_at,
    caseId: doc.case_id,
    metadata: meta,
    verifyStatus: doc.processing_status === 'completed' ? 'ChittyVerified' : 'Pending',
    mintingStatus: 'Pending',
  };
}

/** Transform document detail response → SPA evidence detail */
export function toEvidenceDetail(detail: DocumentDetail): EvidenceCardData & {
  entities: DocumentDetail['entities'];
  summary: DocumentDetail['summary'];
} {
  return {
    ...toEvidenceCard(detail.document),
    entities: detail.entities,
    summary: detail.summary,
  };
}

function mapProcessingStatus(status: string): string {
  switch (status) {
    case 'completed': return 'verified';
    case 'processing': return 'pending';
    case 'queued': return 'pending';
    case 'error': return 'failed';
    default: return status || 'unknown';
  }
}

function safeParse(json: string): Record<string, unknown> {
  try { return JSON.parse(json); } catch { return {}; }
}
