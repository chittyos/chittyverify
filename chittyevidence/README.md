# Marie Kondo Evidence System

A self-contained evidence management system that automatically organizes, verifies, and tracks legal evidence with blockchain integration.

## 🌸 Features

### Core Functionality
- **Automatic Evidence Processing**: Drop files in `incoming/`, they're automatically categorized
- **Duplicate Detection**: SHA256 hashing prevents duplicate evidence
- **Smart Categorization**: 12 pre-configured legal categories for Arias v Bianchi case
- **Symlink Organization**: Preserves originals while creating clean exhibit names
- **Chain of Custody**: Complete audit trail for every file

### Advanced Features
- **ChittyLedger Integration**: PostgreSQL database for evidence registry
- **ChittyChain Support**: Blockchain evidence storage for immutability
- **ChittyVerify**: Document authenticity verification
- **ChittyTrust**: Trust scoring for evidence reliability
- **Automatic Document Generation**:
  - Case timeline with evidence links
  - Key documents index
  - Chain of custody reports

### Always-On Daemon
- Monitors incoming folder continuously
- Builds evidentiary documents every 5 minutes
- Sends notifications for new evidence
- Maintains database synchronization

## 📁 Directory Structure

```
marie_kondo_evidence_system/
├── bin/                    # Executables
│   └── daemon.py          # Main daemon process
├── config/                # Configuration
│   └── .env              # Environment variables
├── lib/                   # Core libraries
│   └── evidence_core.py  # Processing logic
├── data/                  # Local data storage
├── logs/                  # Application logs
├── incoming/              # Drop new evidence here
└── lockbox/              # Organized evidence
    ├── .originals/       # Hidden: actual files
    ├── 00_KEY_EXHIBITS/  # High-priority evidence
    ├── 00_EVIDENCE_INDEX/# Indexes and reports
    ├── 00_CASE_TIMELINE/ # Auto-generated timeline
    ├── 01_TRO_PROCEEDINGS/
    ├── 02_LLC_FORMATION/
    ├── 03_MEMBERSHIP_REMOVAL/
    ├── 04_PREMARITAL_FUNDING/
    ├── 05_PROPERTY_TRANSACTIONS/
    ├── 06_FINANCIAL_STATEMENTS/
    ├── 07_COURT_FILINGS/
    ├── 08_ATTORNEY_CORRESPONDENCE/
    ├── 09_PERJURY_EVIDENCE/
    ├── 10_SANCTIONS_RULE137/
    ├── 11_COLOMBIAN_PROPERTY/
    ├── 12_LEASE_AGREEMENTS/
    ├── 98_DUPLICATES/    # Duplicate files
    └── 99_UNSORTED/      # Uncategorized files
```

## 🚀 Quick Start

### 1. Setup
```bash
# Run setup script
./setup.sh

# Copy .env.example to .env and configure
cp config/.env.example config/.env
# Edit config/.env with your database credentials
```

### 2. Configure Database
Add your Neon PostgreSQL connection string to `config/.env`:
```
DATABASE_URL=postgresql://user:password@host.neon.tech:5432/chittyledger
```

### 3. Start Daemon

**macOS:**
```bash
# Load the service
launchctl load ~/Library/LaunchAgents/com.mariekondo.evidence.plist

# Check status
launchctl list | grep mariekondo

# View logs
tail -f logs/marie_kondo.log
```

**Linux:**
```bash
# Enable and start service
systemctl --user enable --now mariekondo-evidence

# Check status
systemctl --user status mariekondo-evidence

# View logs
journalctl --user -u mariekondo-evidence -f
```

### 4. Use the System

1. **Add Evidence**: Drop files into `incoming/` folder
2. **Monitor Processing**: Check logs for processing status
3. **View Results**: 
   - Organized files in `lockbox/` categories
   - Timeline in `lockbox/00_CASE_TIMELINE/`
   - Key exhibits in `lockbox/00_KEY_EXHIBITS/`
   - Database entries via ChittyLedger

## 🔧 Configuration

Edit `config/.env` for customization:

```bash
# Directories
INCOMING_DIR=/path/to/incoming
LOCKBOX_DIR=/path/to/lockbox

# Database
DATABASE_URL=postgresql://...
CHITTY_ID=arias_v_bianchi_2024D007847

# Processing Options
AUTO_PROCESS=true
DUPLICATE_CHECK=true
CREATE_SYMLINKS=true

# Document Generation
GENERATE_TIMELINE=true
UPDATE_INTERVAL=300  # seconds

# Integrations (optional)
CHITTYCHAIN_API=https://api.chittychain.com
CHITTYVERIFY_API=https://api.chittyverify.com
CHITTYTRUST_API=https://api.chittytrust.com

# Notifications
NOTIFY_ON_NEW_EVIDENCE=true
WEBHOOK_URL=https://hooks.example.com/evidence
```

## 📊 Database Schema

The system creates these tables in ChittyLedger:

### evidence_registry
- `id`: Primary key
- `chitty_id`: Case identifier
- `file_hash`: SHA256 hash (unique)
- `original_name`: Original filename
- `exhibit_id`: Generated exhibit ID
- `category`: Evidence category
- `tags`: JSON array of tags
- `metadata`: JSON metadata
- `chain_of_custody`: Custody chain
- `created_at`: Registration timestamp
- `updated_at`: Last update

### evidence_relationships
- Links between related evidence
- Parent-child relationships
- Relationship types (response, amendment, etc.)

### evidence_events
- Complete audit trail
- Event types: registered, accessed, modified, verified
- User tracking
- Timestamp for each event

## 🏷️ Tagging System

Evidence is automatically tagged with:
- Category tags (e.g., "tro", "corporate", "financial")
- Date tags (e.g., "date:2024-10-31")
- Document type tags (e.g., "affidavit", "motion", "order")
- Custom tags via API

## 🔍 Search Capabilities

Query evidence by:
- Category
- Tags
- Date range
- File hash
- Original name
- Exhibit ID

## 🔐 Security

- All files preserved in `.originals/` with hash prefixes
- Complete chain of custody tracking
- Immutable blockchain storage (when configured)
- Database audit trail
- No file deletion - only archival

## 📈 Monitoring

Check system health:
```bash
# View daemon logs
tail -f logs/marie_kondo.log

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM evidence_registry WHERE chitty_id='arias_v_bianchi_2024D007847';"

# Monitor incoming folder
watch -n 5 'ls -la incoming/'
```

## 🛠️ Troubleshooting

### Daemon won't start
- Check logs in `logs/marie_kondo.log`
- Verify database connection
- Ensure directories exist and have write permissions

### Files not processing
- Check file permissions
- Verify supported file types (.pdf, .doc, .docx, .txt, .jpg, .png)
- Look for errors in logs

### Database errors
- Test connection: `psql $DATABASE_URL`
- Check credentials in `.env`
- Verify tables exist

## 🚫 Stop the Daemon

**macOS:**
```bash
launchctl unload ~/Library/LaunchAgents/com.mariekondo.evidence.plist
```

**Linux:**
```bash
systemctl --user stop mariekondo-evidence
```

## 📝 License

This evidence management system is designed specifically for the Arias v Bianchi case and ChittyLedger integration.

---

*"Does this evidence spark truth? Then it belongs in the lockbox!"* - Marie Kondo (Legal Edition) 🌸