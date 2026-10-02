# CaseIntel - Product Requirements Document (PRD)

## 1. Executive Summary

**CaseIntel** is a legal document management and intelligence platform designed for law enforcement agencies, cybercrime investigators, and legal departments. It automates evidence document ingestion, cryptographic envelope encryption at rest, Indian regional language OCR and translation, Named Entity Recognition (NER), cross-document inconsistency detection, human-in-the-loop verification, and immutable chain-of-custody audit logging.

---

## 2. Problem Statement

Law enforcement and judicial investigators in India handle hundreds of disparate evidentiary documents per case: First Information Reports (FIRs), police diaries, witness affidavits, seizure memos, and forensic laboratory reports. These documents present critical challenges:
1. **Multilingual Discrepancies:** Documents are authored across Indian languages (Hindi, Bengali, Tamil, Telugu, Kannada, English).
2. **Human Fatigue & Inconsistency Blind Spots:** Cross-referencing incident dates, crime locations, and subject identities across multiple 50-page reports leads to missed alibis and conflicting dates.
3. **Chain of Custody Tampering:** Digital files stored in standard cloud drives lack cryptographic integrity proof and tamper-evident audit trails.

---

## 3. User Personas & Permissions (RBAC)

| Role | Persona | Permissions |
| :--- | :--- | :--- |
| **`INVESTIGATOR`** | Inspector Rajesh Verma (Cyber Crime) | Create Cases, Upload Evidence, View OCR & Translations, Trigger Integrity Checks, Confirm/Override Findings |
| **`ADMIN`** | Director Sharma (Special Operations) | All Investigator privileges + Purge Cases, Manage System Config, Export Audit Trail |

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 Frontend                  │
│       React 19, Tailwind CSS, Lucide, App Router       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON (Port 3001)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Node.js / Express API Gateway              │
│  - JWT Auth & Role Authorization (ADMIN / INVESTIGATOR)│
│  - Sliding Window Rate Limiting (Login/Upload/API)     │
│  - Magic Bytes Validation (PDF, PNG, JPG, TIFF)        │
│  - Append-Only Audit Trail (Standard Action Enums)     │
│  - Cross-Document Inconsistency Analyzer               │
└─────────────┬────────────────────────────┬─────────────┘
              │ Local Encrypted Stream     │ HTTP / Multipart (Port 8000)
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Secure Evidence Vault  │  │ Python FastAPI AI Engine │
│  - AES-256 Envelope DEK  │  │  - PaddleOCR PP-OCRv6    │
│  - SHA-256 Checksums     │  │  - IndicTrans / Google   │
│  - Decrypt-Stream Verify │  │  - Entity & Date Regex   │
└──────────────────────────┘  └──────────────────────────┘
```

### Architectural Clarification: Node.js vs. Java Service
- **Source of Truth:** `BACKEND/node-service` is the unified, working backend API gateway and storage vault.
- **Java Service Status:** `BACKEND/java-service` was a skeletal prototype stub (`/metadata/register`). The host machine does not have a Java Runtime or Maven installed (`Unable to locate a Java Runtime`). All functionality is consolidated into the Node.js service for stability, zero-latency local development, and demo reliability.

---

## 5. Core Hackathon Demo Flow (3 Minutes)

1. **Authentication:**
   - User signs in at `/login` as **Inspector Rajesh Verma** (`INVESTIGATOR`).
   - Receives signed HMAC-SHA256 JWT stored in client storage.
2. **Case Dossier Creation:**
   - Navigates to `/cases` $\rightarrow$ Creates case `Siliguri Cyber Fraud Dossier` (`CASE-001`).
3. **Upload Evidence 1 (FIR):**
   - Uploads `sample_fir.png` (Incident Date: **12 August 2026**, Location: **Siliguri**, Person: **Rahul Sharma**).
   - Backend validates magic bytes (`PNG`), calculates SHA-256 checksum, encrypts stream into `secure_vault/DOC-001.enc`.
   - AI service performs OCR, classifies document as `FIR`, extracts entities.
4. **Upload Evidence 2 (Investigation Report):**
   - Uploads `sample_investigation_report.png` (Incident Date: **14 August 2026**).
   - Envelope encrypted into `secure_vault/DOC-002.enc`.
5. **Automated Cross-Document Analysis:**
   - System correlates documents within `CASE-001`.
   - Identifies conflicting incident dates: **12 August 2026** (FIR) vs **14 August 2026** (Investigation Report).
   - Automatically generates high-severity finding: `DATE_MISMATCH` (`ISSUE-001`).
6. **Human-in-the-Loop Verification Center:**
   - Investigator opens `/verification` $\rightarrow$ reviews side-by-side evidence sources.
   - Clicks **Confirm Source A** $\rightarrow$ status updates to `Source A Confirmed`.
   - Action logged to audit trail (`FINDING_CONFIRMED`).
7. **Cryptographic Integrity Verification:**
   - Investigator opens `/documents/DOC-001` $\rightarrow$ clicks **Verify Vault Cryptographic Integrity**.
   - Backend decrypts AES-256 stream in memory, recomputes SHA-256, verifies 100% match against stored hash.
8. **Audit Trail & Timeline Verification:**
   - Navigates to `/audit` $\rightarrow$ verifies immutable timeline: `CASE_CREATED`, `DOCUMENT_UPLOADED`, `HASH_GENERATED`, `VAULT_ENCRYPTED`, `OCR_STARTED`, `OCR_COMPLETED`, `FINDING_CREATED`, `FINDING_CONFIRMED`, `INTEGRITY_VERIFIED`.
   - Navigates to `/timeline` & `/connections` showing real dynamic knowledge graph.

---

## 6. Controlled Demo Dataset

| Document | Type | Incident Date | Location | Primary Person | Expected Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`sample_fir.png`** | FIR | 12 August 2026 | Siliguri | Rahul Sharma | Ingested, vaulted, SHA-256 logged |
| **`sample_investigation_report.png`** | Investigation Report | 14 August 2026 | Siliguri | Rahul Sharma | Flags `DATE_MISMATCH` against Doc 1 |

*Note: All demo documents contain 100% fictional data. No real legal or sensitive records are used.*

---

## 7. Security & Hardening Specifications

1. **Magic Bytes Defense:** Multer uploads inspect the initial file buffer bytes before processing. Non-whitelisted formats (executables, shell scripts) are rejected with HTTP 400.
2. **File Size Limit:** Hard cap of 25MB enforced on multipart streams.
3. **Path Traversal Prevention:** Uploaded filenames are sanitized (`path.basename().replace(/[^a-zA-Z0-9._-]/g, '_')`). Vault downloads verify resolution strictly within `SECURE_VAULT_DIR`.
4. **Envelope Encryption:** Plaintext files are encrypted with ephemeral 256-bit DEKs using AES-256-CBC, and DEKs are wrapped using AES-256-GCM.
5. **Rate Limiting:** Sliding-window limiter on login (15/min), document uploads (30/min), and API calls (300/min).
6. **Zero Fake Claims:** UI removed hardcoded claims ("94.8% accuracy", "100% encrypted"). Metrics reflect real database counts and dynamic OCR confidence averages.

---

## 8. API Specification

### Authentication
- `POST /api/v1/auth/login`: `{ username, password }` $\rightarrow$ `{ success: true, token, user }`
- `GET /api/v1/auth/me`: `Authorization: Bearer <token>` $\rightarrow$ `{ success: true, user }`

### Cases & Evidence
- `GET /api/v1/cases`: Returns array of cases
- `POST /api/v1/cases`: Creates case (requires `ADMIN` or `INVESTIGATOR`)
- `DELETE /api/v1/cases/:id`: Purges case (requires `ADMIN`)
- `GET /api/v1/documents`: Returns vaulted documents
- `POST /api/v1/documents/upload`: Multipart upload with magic byte check & AI OCR
- `GET /api/v1/documents/:id/verify-integrity`: In-memory decrypt & SHA-256 match check
- `GET /api/v1/storage/download/:id`: Streaming decrypted download

### Intelligence & Verification
- `GET /api/v1/verification`: Returns detected cross-document inconsistencies
- `POST /api/v1/verification/:id/resolve`: `{ decision }` $\rightarrow$ updates status & logs audit
- `GET /api/v1/timeline`: Case chronological events
- `GET /api/v1/connections`: Knowledge graph nodes & edges
- `GET /api/v1/audit`: Append-only audit trail
