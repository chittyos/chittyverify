# ChittyVerify Charter

## Classification
- **Tier**: 1 (Foundation)
- **Organization**: CHITTYFOUNDATION
- **Domain**: verify.chitty.cc

## Mission

ChittyVerify is the **legal evidence verification system** for the ChittyOS ecosystem. It combines blockchain immutability with AI analysis to provide court-admissible evidence management, implementing a 7-table authentic schema for complete chain of custody tracking.

## Scope

### IS Responsible For
- Legal evidence verification and validation
- Chain of custody tracking and logging
- Evidence hash computation and integrity verification
- AI-powered evidence analysis
- Contradiction tracking between evidence items
- Trust scoring for evidence (6D ChittyTrust integration)
- Blockchain minting for evidence immutability (ChittyChain V2)
- Audit trail generation for all evidence operations
- Case-to-evidence relationship management

### IS NOT Responsible For
- Identity generation (ChittyID)
- Authentication tokens (ChittyAuth)
- Certificate authority functions (ChittyTrust)
- Service registration (ChittyRegister)
- Raw evidence storage (ChittyEvidence)
- Financial transactions (ChittyFinance)

## Architecture

### 7-Table Authentic Schema
1. **users** - User accounts with data ownership
2. **cases** - Legal case management
3. **masterEvidence** - Core evidence records
4. **atomicFacts** - Extracted facts from evidence
5. **chainOfCustodyLog** - Complete custody tracking
6. **contradictionTracking** - Evidence contradiction analysis
7. **auditTrail** - System-wide audit log

### Evidence Processing Pipeline
```
Upload → Validation → AI Analysis → Trust Scoring → Optional Blockchain Minting
```

## Dependencies

| Type | Service | Purpose |
|------|---------|---------|
| Upstream | ChittyID | Identity for evidence ownership |
| Upstream | ChittyAuth | Token validation |
| Peer | ChittyTrust | Trust level policies |
| Peer | ChittyEvidence | Raw evidence storage |
| Downstream | ChittyChain | Blockchain minting for immutability |
| Downstream | ChittyChronicle | Audit event logging |
| Downstream | ChittyLedger | Transaction recording |
| Storage | Neon PostgreSQL | Shared chittyos-core database |

## API Contract

**Base URL**: https://verify.chitty.cc

### Core Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cases` | GET/POST | Case management |
| `/api/cases/:caseId/evidence` | GET/POST | Evidence within cases |
| `/api/evidence/:id/analyze` | POST | Trigger AI analysis |
| `/api/evidence/:id/mint` | POST | Blockchain minting |
| `/api/evidence/:evidenceId/facts` | GET/POST | Atomic facts |
| `/health` | GET | Service health |

### Trust Scoring Dimensions (6D)
1. **Source** - Origin credibility
2. **Time** - Temporal reliability
3. **Channel** - Collection method trustworthiness
4. **Outcomes** - Historical accuracy
5. **Network** - Corroboration from related evidence
6. **Justice** - Legal admissibility factors

## Success Criteria

1. **Integrity**: 100% evidence hash verification accuracy
2. **Auditability**: Complete chain of custody for all evidence
3. **Performance**: Evidence validation < 500ms (p95)
4. **Blockchain**: Successful minting to ChittyChain when requested
5. **AI Analysis**: Accurate fact extraction and contradiction detection
6. **Compliance**: Court-admissible evidence trails

## Ownership

| Role | Owner |
|------|-------|
| Service Owner | ChittyFoundation |
| Technical Lead | @chittyos-infrastructure |
| Security Contact | security@chitty.foundation |
| Legal Contact | legal@chitty.foundation |

## Compliance

- [ ] Service registered in ChittyRegistry
- [ ] Health endpoint operational at /health
- [ ] OpenAPI specification published
- [ ] CLAUDE.md development guide present
- [ ] Audit logging to ChittyChronicle active
- [ ] ChittyChain integration for blockchain minting
- [ ] Court admissibility standards compliance

## Security Considerations

- **Evidence Immutability**: Hash-based verification, blockchain anchoring
- **Chain of Custody**: Every access logged with timestamp and actor
- **Data Ownership**: Each user gets own database instance
- **Consent Layer**: User approval required for blockchain minting
- **Multi-Level Integrity**: Validation service with comprehensive checks

---
*Charter Version: 1.0.0 | Last Updated: 2026-01-12*
