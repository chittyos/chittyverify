import { randomUUID } from "crypto";
import { Case, MasterEvidence, InsertCase, InsertMasterEvidence } from "@shared/schema-simple";

export interface IStorage {
  // Cases
  getCase(id: string): Promise<Case | undefined>;
  getCasesByUserId(userId: string): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined>;

  // Master Evidence  
  getMasterEvidence(id: string): Promise<MasterEvidence | undefined>;
  getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]>;
  createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence>;
  updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined>;
  
  // Additional methods for ChittyVerify
  updateVerificationStatus(id: string, status: string): Promise<MasterEvidence | undefined>;
  verifyEvidenceIntegrity(id: string, contentHash: string): Promise<boolean>;
  checkEvidenceAlreadyVerified(contentHash: string): Promise<any>;
  chittyVerifyEvidence(id: string, verifyResult: any): Promise<MasterEvidence | undefined>;
  getAtomicFactsByEvidence(evidenceId: string): Promise<any[]>;
  createAtomicFact(fact: any): Promise<any>;
  getAuditTrail(): Promise<any[]>;
  getUser(id: string): Promise<any>;
}

export class MemoryStorage implements IStorage {
  private cases: Map<string, Case> = new Map();
  private evidence: Map<string, MasterEvidence> = new Map();
  private facts: Map<string, any> = new Map();
  private auditTrail: any[] = [];

  constructor() {
    this.initSampleData();
  }

  private initSampleData() {
    // Sample cases
    const sampleCase: Case = {
      id: "case-1",
      caseId: "COOK-2025-PROPERTY-001",
      title: "Property Tax Assessment Challenge",
      description: "Challenging the 2024 property tax assessment for residential property with documented evidence of market value discrepancies",
      caseType: "property",
      caseNumber: "PROP-2025-001",
      jurisdiction: "Cook County",
      status: "active",
      createdBy: "CH-2025-VER-0001-A",
      priority: "high",
      createdAt: new Date("2025-01-15"),
      updatedAt: new Date("2025-01-20")
    };

    this.cases.set("case-1", sampleCase);

    // Sample evidence
    const evidence1: MasterEvidence = {
      id: "evidence-1",
      artifactId: "ART-GOV-001",
      title: "Official Property Tax Statement 2024",
      description: "Cook County Treasurer's official property tax bill showing assessment value and tax calculations",
      type: "document",
      subtype: "tax_document",
      status: "verified",
      caseId: "case-1",
      caseBinding: "case-1",
      userBinding: "CH-2025-VER-0001-A",
      evidenceType: "Document",
      evidenceTier: "GOVERNMENT",
      filePath: "/evidence/tax-statement-2024.pdf",
      fileSize: 245760,
      fileHash: "sha256:a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
      uploadTimestamp: new Date("2025-01-16"),
      trustScore: 0.95 as any,
      verificationStatus: "verified",
      verifyStatus: "ChittyVerified",
      verifyTimestamp: new Date("2025-01-17"),
      verifySignature: "chitty:verified:2025:signature:abcd1234",
      mintingStatus: "Ready",
      blockchainHash: null,
      metadata: {
        source: "Cook County Treasurer",
        documentType: "Official Tax Statement",
        taxYear: "2024",
        propertyPIN: "14-08-203-019-0000"
      },
      createdAt: new Date("2025-01-16"),
      updatedAt: new Date("2025-01-17")
    };

    const evidence2: MasterEvidence = {
      id: "evidence-2", 
      artifactId: "ART-GOV-002",
      title: "Property Assessment Notice",
      description: "Cook County Assessor's notice detailing property valuation methodology and assessment results",
      type: "document",
      subtype: "assessment",
      status: "verified",
      caseId: "case-1",
      caseBinding: "case-1", 
      userBinding: "CH-2025-VER-0001-A",
      evidenceType: "Document",
      evidenceTier: "GOVERNMENT",
      filePath: "/evidence/assessment-notice-2024.pdf",
      fileSize: 184320,
      fileHash: "sha256:b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      uploadTimestamp: new Date("2025-01-18"),
      trustScore: 0.92 as any,
      verificationStatus: "verified",
      verifyStatus: "ChittyVerified", 
      verifyTimestamp: new Date("2025-01-19"),
      verifySignature: "chitty:verified:2025:signature:efgh5678",
      mintingStatus: "Ready",
      blockchainHash: null,
      metadata: {
        source: "Cook County Assessor",
        documentType: "Assessment Notice", 
        assessmentYear: "2024",
        assessedValue: "$285,000"
      },
      createdAt: new Date("2025-01-18"),
      updatedAt: new Date("2025-01-19")
    };

    const evidence3: MasterEvidence = {
      id: "evidence-3",
      artifactId: "ART-FIN-003", 
      title: "Bank Property Appraisal Report",
      description: "Professional property appraisal commissioned by First National Bank for mortgage refinancing",
      type: "document",
      subtype: "appraisal",
      status: "verified",
      caseId: "case-1",
      caseBinding: "case-1",
      userBinding: "CH-2025-VER-0001-A",
      evidenceType: "Document",
      evidenceTier: "FINANCIAL_INSTITUTION",
      filePath: "/evidence/bank-appraisal-2024.pdf",
      fileSize: 567890,
      fileHash: "sha256:c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      uploadTimestamp: new Date("2025-01-20"),
      trustScore: 0.88 as any,
      verificationStatus: "verified",
      verifyStatus: "ChittyVerified",
      verifyTimestamp: new Date("2025-01-21"),
      verifySignature: "chitty:verified:2025:signature:ijkl9012",
      mintingStatus: "Ready",
      blockchainHash: null,
      metadata: {
        source: "First National Bank",
        appraiser: "Certified Residential Appraiser #12345",
        appraisalDate: "2024-12-15",
        appraisedValue: "$320,000"
      },
      createdAt: new Date("2025-01-20"),
      updatedAt: new Date("2025-01-21")
    };

    this.evidence.set("evidence-1", evidence1);
    this.evidence.set("evidence-2", evidence2);  
    this.evidence.set("evidence-3", evidence3);
  }

  // Cases
  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async getCasesByUserId(userId: string): Promise<Case[]> {
    return Array.from(this.cases.values());
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const newCase: Case = {
      ...caseData,
      id: `case-${randomUUID()}`,
      caseId: caseData.caseId || `${caseData.jurisdiction}-${new Date().getFullYear()}-${caseData.caseType}-${Date.now()}`,
      description: caseData.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined> {
    const existing = this.cases.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.cases.set(id, updated);
    return updated;
  }

  // Master Evidence
  async getMasterEvidence(id: string): Promise<MasterEvidence | undefined> {
    return this.evidence.get(id);
  }

  async getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]> {
    return Array.from(this.evidence.values()).filter(e => e.caseBinding === caseId);
  }

  async createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence> {
    const newEvidence: MasterEvidence = {
      ...evidence,
      id: `evidence-${randomUUID()}`,
      artifactId: evidence.artifactId || `ART-${Date.now()}`,
      metadata: evidence.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.evidence.set(newEvidence.id, newEvidence);
    return newEvidence;
  }

  async updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined> {
    const existing = this.evidence.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.evidence.set(id, updated);
    return updated;
  }

  // Additional ChittyVerify methods
  async updateVerificationStatus(id: string, status: string): Promise<MasterEvidence | undefined> {
    return this.updateMasterEvidence(id, { verificationStatus: status });
  }

  async verifyEvidenceIntegrity(id: string, contentHash: string): Promise<boolean> {
    const evidence = this.evidence.get(id);
    return evidence ? evidence.fileHash === contentHash : false;
  }

  async checkEvidenceAlreadyVerified(contentHash: string): Promise<any> {
    const evidenceArray = Array.from(this.evidence.values());
    for (const evidence of evidenceArray) {
      if (evidence.fileHash === contentHash && evidence.verifyStatus === 'ChittyVerified') {
        return { artifactId: evidence.artifactId, updatedAt: evidence.updatedAt };
      }
    }
    return null;
  }

  async chittyVerifyEvidence(id: string, verifyResult: any): Promise<MasterEvidence | undefined> {
    return this.updateMasterEvidence(id, {
      verifyStatus: verifyResult.status,
      verifyTimestamp: new Date(),
      verifySignature: verifyResult.signature
    });
  }

  async getAtomicFactsByEvidence(evidenceId: string): Promise<any[]> {
    const factsArray = Array.from(this.facts.values());
    return factsArray.filter((fact: any) => fact.parentDocument === evidenceId);
  }

  async createAtomicFact(fact: any): Promise<any> {
    const newFact = { ...fact, id: `fact-${randomUUID()}`, createdAt: new Date() };
    this.facts.set(newFact.id, newFact);
    return newFact;
  }

  async getAuditTrail(): Promise<any[]> {
    return this.auditTrail;
  }

  async getUser(id: string): Promise<any> {
    return {
      id,
      username: "demo.user",
      email: "demo@chittyverify.com", 
      composite6DTrust: 4.2,
      trustScore: 85
    };
  }
}

export const storage = new MemoryStorage();