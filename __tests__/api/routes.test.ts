import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes.js';
import type { Express } from 'express';

// Mock the storage module
jest.mock('../../server/storage-memory.js', () => ({
  storage: {
    getCasesByUserId: jest.fn(),
    getCase: jest.fn(),
    createCase: jest.fn(),
    getMasterEvidenceByCase: jest.fn(),
    createMasterEvidence: jest.fn(),
    checkEvidenceAlreadyVerified: jest.fn(),
    updateVerificationStatus: jest.fn(),
    verifyEvidenceIntegrity: jest.fn(),
    getMasterEvidence: jest.fn(),
    getUser: jest.fn(),
    chittyVerifyEvidence: jest.fn(),
    getAtomicFactsByEvidence: jest.fn(),
    createAtomicFact: jest.fn(),
    getAuditTrail: jest.fn(),
    getContradictions: jest.fn(),
  }
}));

// Mock other services
jest.mock('../../server/chittyid-integration.js', () => ({
  chittyIdService: {
    validateChittyID: jest.fn(),
    generateChittyID: jest.fn(),
    healthCheck: jest.fn(),
  }
}));

jest.mock('../../server/chittybeacon.js', () => ({
  createChittyBeaconRouter: jest.fn(() => express.Router())
}));

jest.mock('../../server/sharing-service.js', () => ({
  sharingService: {
    createEvidenceShare: jest.fn(),
    verifyShareAccess: jest.fn(),
    logShareAccess: jest.fn(),
  }
}));

jest.mock('../../server/chitty-verify.js', () => ({
  chittyVerify: {
    verifyEvidence: jest.fn(),
    isReadyForMinting: jest.fn(),
  }
}));

describe('API Routes Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    server = await registerRoutes(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (server?.close) {
      server.close();
    }
  });

  describe('Cases API', () => {
    it('should get all cases', async () => {
      const mockCases = [
        {
          id: 'case-1',
          caseId: 'ILLINOIS-COOK-2024-DIVORCE-12345',
          jurisdiction: 'ILLINOIS-COOK',
          caseType: 'DIVORCE',
          caseStatus: 'Active'
        }
      ];

      const { storage } = require('../../server/storage-memory.js');
      storage.getCasesByUserId.mockResolvedValue(mockCases);

      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(response.body).toEqual(mockCases);
      expect(storage.getCasesByUserId).toHaveBeenCalledWith('all');
    });

    it('should get case by ID', async () => {
      const mockCase = {
        id: 'case-1',
        caseId: 'ILLINOIS-COOK-2024-DIVORCE-12345',
        jurisdiction: 'ILLINOIS-COOK',
        caseType: 'DIVORCE'
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.getCase.mockResolvedValue(mockCase);

      const response = await request(app)
        .get('/api/cases/case-1')
        .expect(200);

      expect(response.body).toEqual(mockCase);
      expect(storage.getCase).toHaveBeenCalledWith('case-1');
    });

    it('should return 404 for non-existent case', async () => {
      const { storage } = require('../../server/storage-memory.js');
      storage.getCase.mockResolvedValue(null);

      await request(app)
        .get('/api/cases/non-existent')
        .expect(404);
    });

    it('should create a new case', async () => {
      const newCase = {
        caseId: 'TEXAS-HARRIS-2024-CIVIL-67890',
        jurisdiction: 'TEXAS-HARRIS',
        caseNumber: '24-CV-67890',
        caseType: 'CIVIL',
        judgeAssigned: 'Hon. John Smith'
      };

      const createdCase = { id: 'case-2', ...newCase };

      const { storage } = require('../../server/storage-memory.js');
      storage.createCase.mockResolvedValue(createdCase);

      const response = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      expect(response.body).toEqual(createdCase);
      expect(storage.createCase).toHaveBeenCalledWith(newCase);
    });

    it('should validate case data on creation', async () => {
      const invalidCase = {
        // Missing required fields
        caseType: 'DIVORCE'
      };

      await request(app)
        .post('/api/cases')
        .send(invalidCase)
        .expect(400);
    });
  });

  describe('Evidence API', () => {
    it('should get evidence by case ID', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          artifactId: 'ART-12345',
          caseBinding: 'case-1',
          evidenceType: 'Document',
          evidenceTier: 'GOVERNMENT'
        }
      ];

      const { storage } = require('../../server/storage-memory.js');
      storage.getMasterEvidenceByCase.mockResolvedValue(mockEvidence);

      const response = await request(app)
        .get('/api/cases/case-1/evidence')
        .expect(200);

      expect(response.body).toEqual(mockEvidence);
      expect(storage.getMasterEvidenceByCase).toHaveBeenCalledWith('case-1');
    });

    it('should create new evidence', async () => {
      const newEvidence = {
        userBinding: 'user-1',
        evidenceType: 'Document',
        evidenceTier: 'FINANCIAL_INSTITUTION',
        originalFilename: 'bank-statement.pdf',
        contentHash: 'sha256-hash-123'
      };

      const createdEvidence = {
        id: 'evidence-1',
        caseBinding: 'case-1',
        ...newEvidence
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.checkEvidenceAlreadyVerified.mockResolvedValue(null);
      storage.createMasterEvidence.mockResolvedValue(createdEvidence);

      const response = await request(app)
        .post('/api/cases/case-1/evidence')
        .send(newEvidence)
        .expect(201);

      expect(response.body).toEqual(createdEvidence);
    });

    it('should handle duplicate evidence', async () => {
      const duplicateEvidence = {
        contentHash: 'existing-hash-123'
      };

      const existingEvidence = {
        artifactId: 'ART-EXISTING',
        updatedAt: new Date()
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.checkEvidenceAlreadyVerified.mockResolvedValue(existingEvidence);

      await request(app)
        .post('/api/cases/case-1/evidence')
        .send(duplicateEvidence)
        .expect(409);
    });

    it('should update verification status', async () => {
      const updatedEvidence = {
        id: 'evidence-1',
        sourceVerificationStatus: 'Verified'
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.updateVerificationStatus.mockResolvedValue(updatedEvidence);

      const response = await request(app)
        .put('/api/evidence/evidence-1/verify')
        .send({ status: 'Verified' })
        .expect(200);

      expect(response.body).toEqual(updatedEvidence);
      expect(storage.updateVerificationStatus).toHaveBeenCalledWith('evidence-1', 'Verified');
    });

    it('should verify evidence integrity', async () => {
      const { storage } = require('../../server/storage-memory.js');
      storage.verifyEvidenceIntegrity.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/evidence/evidence-1/integrity')
        .query({ contentHash: 'sha256-hash-123' })
        .expect(200);

      expect(response.body).toEqual({
        isValid: true,
        evidenceId: 'evidence-1'
      });
    });
  });

  describe('ChittyID Integration', () => {
    it('should validate ChittyID', async () => {
      const validationResult = {
        valid: true,
        chittyId: 'CH-2024-VER-0001-A',
        metadata: { verified: true }
      };

      const { chittyIdService } = require('../../server/chittyid-integration.js');
      chittyIdService.validateChittyID.mockResolvedValue(validationResult);

      const response = await request(app)
        .post('/api/chittyid/validate')
        .send({ chittyId: 'CH-2024-VER-0001-A' })
        .expect(200);

      expect(response.body).toEqual(validationResult);
    });

    it('should generate ChittyID', async () => {
      const generatedResult = {
        chittyId: 'CH-2024-USR-0002-B',
        vertical: 'user'
      };

      const { chittyIdService } = require('../../server/chittyid-integration.js');
      chittyIdService.generateChittyID.mockResolvedValue(generatedResult);

      const response = await request(app)
        .post('/api/chittyid/generate')
        .send({ vertical: 'user' })
        .expect(200);

      expect(response.body).toEqual(generatedResult);
    });

    it('should check ChittyID health', async () => {
      const healthResult = { status: 'healthy', version: '1.0.0' };

      const { chittyIdService } = require('../../server/chittyid-integration.js');
      chittyIdService.healthCheck.mockResolvedValue(healthResult);

      const response = await request(app)
        .get('/api/chittyid/health')
        .expect(200);

      expect(response.body).toEqual(healthResult);
    });
  });

  describe('ChittyVerify Integration', () => {
    it('should perform ChittyVerify on evidence', async () => {
      const mockEvidence = {
        id: 'evidence-1',
        contentHash: 'hash-123',
        evidenceType: 'Document',
        evidenceTier: 'GOVERNMENT',
        userBinding: 'user-1'
      };

      const mockUser = {
        composite6DTrust: 4.5
      };

      const verifyResult = {
        status: 'ChittyVerified',
        signature: 'verify-signature-123',
        timestamp: new Date().toISOString()
      };

      const updatedEvidence = {
        ...mockEvidence,
        verifyStatus: 'ChittyVerified',
        verifySignature: 'verify-signature-123'
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.getMasterEvidence.mockResolvedValue(mockEvidence);
      storage.getUser.mockResolvedValue(mockUser);
      storage.chittyVerifyEvidence.mockResolvedValue(updatedEvidence);

      // Mock the dynamic import
      jest.doMock('../../server/chitty-verify.js', () => ({
        chittyVerify: {
          verifyEvidence: jest.fn().mockResolvedValue(verifyResult)
        }
      }));

      const response = await request(app)
        .post('/api/evidence/evidence-1/chitty-verify')
        .expect(200);

      expect(response.body.evidence).toEqual(updatedEvidence);
      expect(response.body.verifyResult).toEqual(verifyResult);
    });

    it('should check ChittyVerify status', async () => {
      const mockEvidence = {
        id: 'evidence-1',
        verifyStatus: 'ChittyVerified',
        verifySignature: 'signature-123',
        mintingStatus: 'Pending'
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.getMasterEvidence.mockResolvedValue(mockEvidence);

      // Mock the dynamic import
      jest.doMock('../../server/chitty-verify.js', () => ({
        chittyVerify: {
          isReadyForMinting: jest.fn().mockReturnValue(true)
        }
      }));

      const response = await request(app)
        .get('/api/evidence/evidence-1/chitty-verify-status')
        .expect(200);

      expect(response.body.verifyStatus).toBe('ChittyVerified');
      expect(response.body.readyForMinting).toBe(true);
      expect(response.body.isImmutable).toBe(true);
    });
  });

  describe('Atomic Facts API', () => {
    it('should get facts by evidence ID', async () => {
      const mockFacts = [
        {
          id: 'fact-1',
          factId: 'FACT-12345',
          parentDocument: 'evidence-1',
          factText: 'Contract signed on January 1, 2024',
          factType: 'DATE',
          classificationLevel: 'FACT'
        }
      ];

      const { storage } = require('../../server/storage-memory.js');
      storage.getAtomicFactsByEvidence.mockResolvedValue(mockFacts);

      const response = await request(app)
        .get('/api/evidence/evidence-1/facts')
        .expect(200);

      expect(response.body).toEqual(mockFacts);
    });

    it('should create atomic fact', async () => {
      const newFact = {
        factId: 'FACT-67890',
        factText: 'Payment of $5,000 made on February 15, 2024',
        factType: 'AMOUNT',
        classificationLevel: 'FACT',
        weight: 0.9
      };

      const createdFact = {
        id: 'fact-2',
        parentDocument: 'evidence-1',
        ...newFact
      };

      const { storage } = require('../../server/storage-memory.js');
      storage.createAtomicFact.mockResolvedValue(createdFact);

      const response = await request(app)
        .post('/api/evidence/evidence-1/facts')
        .send(newFact)
        .expect(201);

      expect(response.body).toEqual(createdFact);
    });
  });

  describe('Evidence Sharing API', () => {
    it('should create evidence share', async () => {
      const shareRequest = {
        evidenceId: 'evidence-1',
        recipientEmail: 'recipient@example.com',
        accessLevel: 'view',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const shareResponse = {
        shareId: 'share-123',
        shareUrl: 'https://chittychain.com/share/share-123',
        accessLevel: 'view',
        expiresAt: shareRequest.expiresAt
      };

      const { sharingService } = require('../../server/sharing-service.js');
      sharingService.createEvidenceShare.mockResolvedValue(shareResponse);

      const response = await request(app)
        .post('/api/evidence/share')
        .send(shareRequest)
        .expect(200);

      expect(response.body).toEqual(shareResponse);
    });

    it('should verify share access', async () => {
      const accessResult = {
        valid: true,
        evidence: {
          id: 'evidence-1',
          evidenceType: 'Document',
          originalFilename: 'document.pdf'
        },
        share: {
          shareId: 'share-123',
          accessLevel: 'view'
        }
      };

      const { sharingService } = require('../../server/sharing-service.js');
      sharingService.verifyShareAccess.mockResolvedValue(accessResult);
      sharingService.logShareAccess.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/share/share-123')
        .query({ pin: '1234' })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.evidence).toEqual(accessResult.evidence);
    });

    it('should handle invalid share access', async () => {
      const accessResult = {
        valid: false,
        reason: 'Share expired'
      };

      const { sharingService } = require('../../server/sharing-service.js');
      sharingService.verifyShareAccess.mockResolvedValue(accessResult);
      sharingService.logShareAccess.mockResolvedValue(undefined);

      await request(app)
        .get('/api/share/invalid-share')
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const { storage } = require('../../server/storage-memory.js');
      storage.getCasesByUserId.mockRejectedValue(new Error('Database connection failed'));

      await request(app)
        .get('/api/cases')
        .expect(500);
    });

    it('should handle ChittyID service errors', async () => {
      const { chittyIdService } = require('../../server/chittyid-integration.js');
      chittyIdService.validateChittyID.mockRejectedValue(new Error('Service unavailable'));

      await request(app)
        .post('/api/chittyid/validate')
        .send({ chittyId: 'CH-2024-VER-0001-A' })
        .expect(500);
    });
  });
});