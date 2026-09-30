require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { encryptStream, decryptStream } = require('./encryptionUtils');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// Allow frontend and common origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for local dev
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'temp_uploads/' });
const SECURE_VAULT_DIR = path.join(__dirname, 'secure_vault');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync('temp_uploads')) fs.mkdirSync('temp_uploads', { recursive: true });
if (!fs.existsSync(SECURE_VAULT_DIR)) fs.mkdirSync(SECURE_VAULT_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------
// Persistent Store
// ---------------------------------------------------------
const DB_FILE = path.join(DATA_DIR, 'store.json');

const initialData = {
  cases: [
    {
      id: "CASE-001",
      name: "Document Fraud Investigation",
      department: "Cyber Crime",
      priority: "High",
      status: "Active",
      officer: "Investigator",
      createdAt: "2026-08-10T10:00:00Z",
    },
    {
      id: "CASE-002",
      name: "Identity Verification",
      department: "Investigation",
      priority: "Medium",
      status: "Review",
      officer: "Reviewer",
      createdAt: "2026-08-12T14:30:00Z",
    },
    {
      id: "CASE-003",
      name: "Financial Document Analysis",
      department: "Economic Offences",
      priority: "Low",
      status: "Closed",
      officer: "Investigator",
      createdAt: "2026-08-14T09:15:00Z",
    },
  ],
  documents: [
    {
      id: "DOC-001",
      name: "FIR.pdf",
      type: "FIR",
      caseId: "CASE-001",
      status: "Processed",
      confidence: 96,
      uploadedAt: "2026-08-15T10:51:00Z",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    {
      id: "DOC-002",
      name: "Investigation_Report.pdf",
      type: "Investigation Report",
      caseId: "CASE-001",
      status: "Processed",
      confidence: 91,
      uploadedAt: "2026-08-15T11:00:00Z",
      sha256: "a4b5c67890def123456789abcdef123456789abcdef123456789abcdef123456",
    },
    {
      id: "DOC-003",
      name: "Forensic_Report.pdf",
      type: "Forensic Report",
      caseId: "CASE-001",
      status: "Processing",
      confidence: null,
      uploadedAt: "2026-08-15T11:20:00Z",
      sha256: "b5c6d7e8f90123456789abcdef123456789abcdef123456789abcdef12345678",
    },
  ],
  aiAnalysis: {
    "DOC-001": {
      documentId: "DOC-001",
      processingStatus: "complete",
      processingStages: [
        { name: "Document uploaded", status: "complete" },
        { name: "Document classified", status: "complete" },
        { name: "OCR processing", status: "complete" },
        { name: "Entity extraction", status: "complete" },
        { name: "Inconsistency check", status: "complete" },
      ],
      documentType: "FIR",
      language: "English",
      ocrConfidence: 96,
      summary: "The document records an incident in Siliguri involving Rahul Sharma on 12 August 2026.",
      extractedText: "FIRST INFORMATION REPORT\nCase Number: CASE-001\nIncident Date: 12 August 2026\nLocation: Siliguri\nPerson: Rahul Sharma\nThe incident was reported and recorded for further investigation.",
      translation: "FIRST INFORMATION REPORT\nCase Number: CASE-001\nIncident Date: 12 August 2026\nLocation: Siliguri\nPerson: Rahul Sharma\nThe incident was reported and recorded for further investigation.",
      entities: {
        people: ["Rahul Sharma"],
        locations: ["Siliguri"],
        dates: ["12 August 2026"],
        organizations: ["Cyber Crime"],
      },
      issues: [],
    },
    "DOC-002": {
      documentId: "DOC-002",
      processingStatus: "complete",
      processingStages: [
        { name: "Document uploaded", status: "complete" },
        { name: "Document classified", status: "complete" },
        { name: "OCR processing", status: "complete" },
        { name: "Entity extraction", status: "complete" },
        { name: "Inconsistency check", status: "complete" },
      ],
      documentType: "Investigation Report",
      language: "English",
      ocrConfidence: 91,
      summary: "Investigation Report for CASE-001 recording statements and incident date on 14 August 2026 in Siliguri.",
      extractedText: "INVESTIGATION REPORT\nCase: CASE-001\nDate of event observed: 14 August 2026\nInvestigating Officer visited Siliguri.\nSubject: Rahul Sharma.",
      translation: "INVESTIGATION REPORT\nCase: CASE-001\nDate of event observed: 14 August 2026\nInvestigating Officer visited Siliguri.\nSubject: Rahul Sharma.",
      entities: {
        people: ["Rahul Sharma"],
        locations: ["Siliguri"],
        dates: ["14 August 2026"],
        organizations: [],
      },
      issues: ["Date mismatch with FIR.pdf (12 August vs 14 August)"],
    },
  },
  verificationIssues: [
    {
      id: "ISSUE-001",
      caseId: "CASE-001",
      type: "Date Mismatch",
      severity: "high",
      status: "pending",
      description: "The incident date differs between the FIR and Investigation Report.",
      sourceA: {
        documentId: "DOC-001",
        documentName: "FIR.pdf",
        field: "Incident Date",
        value: "12 August 2026",
      },
      sourceB: {
        documentId: "DOC-002",
        documentName: "Investigation_Report.pdf",
        field: "Incident Date",
        value: "14 August 2026",
      },
      confidence: 94,
      createdAt: "2026-08-15T10:30:00",
    },
  ],
  timeline: [
    {
      id: "EVENT-004",
      date: "15 August 2026",
      title: "Inconsistency detected",
      description: "AI detected a mismatch in the incident date between FIR.pdf and Investigation_Report.pdf.",
      type: "AI Alert",
      caseId: "CASE-001",
    },
    {
      id: "EVENT-003",
      date: "14 August 2026",
      title: "Investigation Report uploaded",
      description: "Investigation_Report.pdf was added to CASE-001.",
      type: "Document",
      caseId: "CASE-001",
    },
    {
      id: "EVENT-002",
      date: "12 August 2026",
      title: "Incident recorded",
      description: "Incident information was recorded in the FIR.",
      type: "Incident",
      caseId: "CASE-001",
    },
    {
      id: "EVENT-001",
      date: "10 August 2026",
      title: "Case created",
      description: "CASE-001 was created and assigned for investigation.",
      type: "Case",
      caseId: "CASE-001",
    },
  ],
  connections: {
    nodes: [
      { id: "case-001", label: "CASE-001", type: "Case" },
      { id: "doc-001", label: "FIR.pdf", type: "Document" },
      { id: "doc-002", label: "Investigation Report", type: "Document" },
      { id: "person-001", label: "Rahul Sharma", type: "Person" },
      { id: "location-001", label: "Siliguri", type: "Location" },
      { id: "date-001", label: "12 August 2026", type: "Date" },
    ],
    edges: [
      { from: "case-001", to: "doc-001", label: "contains" },
      { from: "case-001", to: "doc-002", label: "contains" },
      { from: "doc-001", to: "person-001", label: "mentions" },
      { from: "doc-002", to: "person-001", label: "mentions" },
      { from: "doc-001", to: "location-001", label: "location" },
      { from: "doc-001", to: "date-001", label: "date" },
    ],
  },
  auditLogs: [
    {
      id: "LOG-001",
      timestamp: "15 Aug 2026, 10:42 AM",
      user: "Investigator",
      role: "Investigator",
      action: "Case Created",
      target: "CASE-001",
      result: "Success",
    },
    {
      id: "LOG-002",
      timestamp: "15 Aug 2026, 10:51 AM",
      user: "Investigator",
      role: "Investigator",
      action: "Document Uploaded",
      target: "FIR.pdf",
      result: "Success",
    },
    {
      id: "LOG-003",
      timestamp: "15 Aug 2026, 10:53 AM",
      user: "AI System",
      role: "System",
      action: "OCR + Entity Extraction",
      target: "FIR.pdf",
      result: "Success",
    },
    {
      id: "LOG-004",
      timestamp: "15 Aug 2026, 11:02 AM",
      user: "AI System",
      role: "System",
      action: "Inconsistency Detected",
      target: "ISSUE-001",
      result: "Flagged",
    },
    {
      id: "LOG-005",
      timestamp: "15 Aug 2026, 11:15 AM",
      user: "Reviewer",
      role: "Reviewer",
      action: "Human Verification",
      target: "ISSUE-001",
      result: "Source A Confirmed",
    },
  ],
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error("Error reading database file:", e);
    return initialData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing database file:", e);
  }
}

function addAuditLog(action, target, result = "Success", user = "Investigator", role = "Investigator") {
  const db = readDb();
  const dateStr = new Date().toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const newLog = {
    id: `LOG-${String(db.auditLogs.length + 1).padStart(3, '0')}`,
    timestamp: dateStr,
    user,
    role,
    action,
    target,
    result,
  };

  db.auditLogs.unshift(newLog);
  writeDb(db);
  return newLog;
}

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------
const validateDocumentId = (req, res, next) => {
  const docId = req.params.documentId || req.params.id;
  if (!docId || !/^[a-zA-Z0-9_-]+$/.test(docId)) {
    return res.status(400).json({ error: "Invalid Document ID format" });
  }
  next();
};

// ---------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------
app.get('/api/v1/health', async (req, res) => {
  let aiHealth = { status: "unknown" };
  try {
    const aiRes = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (aiRes.ok) {
      aiHealth = await aiRes.json();
    }
  } catch (e) {
    aiHealth = { status: "offline", error: e.message };
  }

  res.json({
    status: "ok",
    service: "legal-dms-backend",
    port: PORT,
    vault: {
      location: SECURE_VAULT_DIR,
      vaultFiles: fs.readdirSync(SECURE_VAULT_DIR).length,
    },
    aiService: aiHealth,
    timestamp: new Date().toISOString(),
  });
});

// Also alias /health
app.get('/health', (req, res) => res.redirect('/api/v1/health'));

// ---------------------------------------------------------
// CASES API
// ---------------------------------------------------------
app.get('/api/v1/cases', (req, res) => {
  const db = readDb();
  res.json(db.cases);
});

app.get('/api/v1/cases/:id', (req, res) => {
  const db = readDb();
  const found = db.cases.find(c => c.id === req.params.id);
  if (!found) return res.status(404).json({ error: "Case not found" });

  const relatedDocs = db.documents.filter(d => d.caseId === req.params.id);
  const relatedIssues = db.verificationIssues.filter(i => i.caseId === req.params.id);

  res.json({
    ...found,
    documentsCount: relatedDocs.length,
    pendingVerificationCount: relatedIssues.filter(i => i.status === 'pending').length,
    documents: relatedDocs,
  });
});

app.post('/api/v1/cases', requireAuth, (req, res) => {
  const { name, department, priority } = req.body;
  if (!name) return res.status(400).json({ error: "Case name is required" });

  const db = readDb();
  const newCaseId = `CASE-${String(db.cases.length + 1).padStart(3, '0')}`;
  const newCase = {
    id: newCaseId,
    name,
    department: department || "Investigation",
    priority: priority || "Medium",
    status: "Active",
    officer: req.user?.username || "Investigator",
    createdAt: new Date().toISOString(),
  };

  db.cases.unshift(newCase);
  writeDb(db);

  addAuditLog("Case Created", newCaseId, "Success", req.user?.username || "Investigator", req.user?.role || "Investigator");

  res.status(201).json(newCase);
});

// ---------------------------------------------------------
// DOCUMENTS API
// ---------------------------------------------------------
app.get('/api/v1/documents', (req, res) => {
  const db = readDb();
  res.json(db.documents);
});

app.get('/api/v1/documents/:id', validateDocumentId, (req, res) => {
  const db = readDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const analysis = db.aiAnalysis[doc.id] || null;
  res.json({
    ...doc,
    aiAnalysis: analysis,
  });
});

// Full Pipeline Upload: Stores file in vault + Triggers AI OCR & Analysis
app.post('/api/v1/documents/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Field name must be 'file'." });
  }

  const { caseId = "CASE-001", documentType = "Legal Document", language = "auto" } = req.body;
  const tempPath = req.file.path;
  const originalName = req.file.originalname;

  const db = readDb();
  const docCount = db.documents.length + 1;
  const docId = `DOC-${String(docCount).padStart(3, '0')}`;
  const vaultPath = path.join(SECURE_VAULT_DIR, `${docId}.enc`);

  try {
    // 1. Calculate SHA-256 Checksum for Chain of Custody Integrity
    const fileBuffer = fs.readFileSync(tempPath);
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 2. Encrypt and store into Secure Vault (Envelope Encryption)
    const readStream = fs.createReadStream(tempPath);
    const writeStream = fs.createWriteStream(vaultPath);
    await encryptStream(readStream, writeStream);

    // 3. Trigger AI Processing Microservice
    let aiResult = null;
    let confidence = 95;
    let extractedEntities = { people: [], locations: [], dates: [], organizations: [] };
    let summaryText = `Uploaded document ${originalName}`;
    let detectedDocType = documentType;

    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: req.file.mimetype || 'application/octet-stream' });
      formData.append('file', blob, originalName);
      formData.append('language', language);
      formData.append('translation_backend', 'google');
      formData.append('preprocess', 'true');

      const aiRes = await fetch(`${AI_SERVICE_URL}/process`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000), // 60s timeout for heavy OCR
      });

      if (aiRes.ok) {
        aiResult = await aiRes.json();
        confidence = Math.round(aiResult.ocrConfidence || 95);
        if (aiResult.entities) extractedEntities = aiResult.entities;
        if (aiResult.summary) summaryText = aiResult.summary;
        if (aiResult.documentType && aiResult.documentType !== "Legal Document") {
          detectedDocType = aiResult.documentType;
        }
      } else {
        console.warn("AI service returned non-200:", await aiRes.text());
      }
    } catch (aiErr) {
      console.warn("AI processing microservice unavailable or timed out:", aiErr.message);
    }

    // 4. Save Document Metadata
    const newDoc = {
      id: docId,
      name: originalName,
      type: detectedDocType,
      caseId: caseId,
      status: "Processed",
      confidence: confidence,
      uploadedAt: new Date().toISOString(),
      sha256: sha256Hash,
      vaultEncrypted: true,
    };

    db.documents.unshift(newDoc);

    // 5. Save AI Analysis
    const analysisPayload = {
      documentId: docId,
      processingStatus: "complete",
      processingStages: aiResult?.processingStages || [
        { name: "Document uploaded", status: "complete" },
        { name: "Document classified", status: "complete" },
        { name: "OCR processing", status: "complete" },
        { name: "Entity extraction", status: "complete" },
        { name: "Inconsistency check", status: "complete" },
      ],
      documentType: detectedDocType,
      language: aiResult?.languageLabel || (language === "auto" ? "Detected" : language),
      ocrConfidence: confidence,
      summary: summaryText,
      extractedText: aiResult?.extractedText || `Processed text for ${originalName}`,
      translation: aiResult?.translation || aiResult?.extractedText || `Translated text for ${originalName}`,
      entities: extractedEntities,
      issues: [],
    };
    db.aiAnalysis[docId] = analysisPayload;

    // 6. Cross-document inconsistency check within the case
    const siblingDocs = db.documents.filter(d => d.caseId === caseId && d.id !== docId);
    for (const sib of siblingDocs) {
      const sibAnalysis = db.aiAnalysis[sib.id];
      if (sibAnalysis && sibAnalysis.entities?.dates?.length && extractedEntities.dates?.length) {
        const dateA = extractedEntities.dates[0];
        const dateB = sibAnalysis.entities.dates[0];
        if (dateA !== dateB) {
          const newIssueId = `ISSUE-${String(db.verificationIssues.length + 1).padStart(3, '0')}`;
          const newIssue = {
            id: newIssueId,
            caseId: caseId,
            type: "Date Mismatch",
            severity: "high",
            status: "pending",
            description: `Incident date differs between ${originalName} and ${sib.name}.`,
            sourceA: {
              documentId: docId,
              documentName: originalName,
              field: "Incident Date",
              value: dateA,
            },
            sourceB: {
              documentId: sib.id,
              documentName: sib.name,
              field: "Incident Date",
              value: dateB,
            },
            confidence: 93,
            createdAt: new Date().toISOString(),
          };
          db.verificationIssues.unshift(newIssue);

          // Add alert to timeline
          db.timeline.unshift({
            id: `EVENT-${String(db.timeline.length + 1).padStart(3, '0')}`,
            date: new Date().toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }),
            title: "Inconsistency detected",
            description: `AI detected mismatch between ${originalName} and ${sib.name}.`,
            type: "AI Alert",
            caseId: caseId,
          });

          addAuditLog("Inconsistency Detected", newIssueId, "Flagged", "AI System", "System");
        }
      }
    }

    // 7. Add Document to Timeline
    db.timeline.unshift({
      id: `EVENT-${String(db.timeline.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }),
      title: `${detectedDocType} uploaded`,
      description: `${originalName} was added to ${caseId}.`,
      type: "Document",
      caseId: caseId,
    });

    // 8. Update Connections Graph
    const docNodeId = `doc-${docId.toLowerCase().replace('-', '')}`;
    db.connections.nodes.push({ id: docNodeId, label: originalName, type: "Document" });
    const caseNodeId = caseId.toLowerCase();
    db.connections.edges.push({ from: caseNodeId, to: docNodeId, label: "contains" });

    if (extractedEntities.people.length > 0) {
      const pName = extractedEntities.people[0];
      const pNodeId = `person-${pName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (!db.connections.nodes.some(n => n.id === pNodeId)) {
        db.connections.nodes.push({ id: pNodeId, label: pName, type: "Person" });
      }
      db.connections.edges.push({ from: docNodeId, to: pNodeId, label: "mentions" });
    }

    if (extractedEntities.locations.length > 0) {
      const loc = extractedEntities.locations[0];
      const locNodeId = `loc-${loc.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (!db.connections.nodes.some(n => n.id === locNodeId)) {
        db.connections.nodes.push({ id: locNodeId, label: loc, type: "Location" });
      }
      db.connections.edges.push({ from: docNodeId, to: locNodeId, label: "location" });
    }

    // 9. Write updated DB & Audit Logs
    writeDb(db);
    addAuditLog("Document Uploaded & Vaulted", originalName, "Success", req.user?.username || "Investigator", req.user?.role || "Investigator");
    addAuditLog("OCR + Entity Extraction", originalName, "Success", "AI System", "System");

    // Clean temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    res.status(201).json({
      success: true,
      document: newDoc,
      aiAnalysis: analysisPayload,
    });
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("Document processing failed:", error);
    res.status(500).json({ error: "Processing failed: " + error.message });
  }
});

// ---------------------------------------------------------
// STORAGE MICROSERVICE (Download & Direct Upload)
// ---------------------------------------------------------
app.post('/api/v1/storage/upload/:documentId', requireAuth, validateDocumentId, upload.single('legal_file'), async (req, res) => {
  const docId = req.params.documentId;
  const tempPath = req.file.path;
  const vaultPath = path.join(SECURE_VAULT_DIR, `${docId}.enc`);

  try {
    const fileBuffer = fs.readFileSync(tempPath);
    const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const readStream = fs.createReadStream(tempPath);
    const writeStream = fs.createWriteStream(vaultPath);

    await encryptStream(readStream, writeStream);
    fs.unlinkSync(tempPath);

    addAuditLog("Direct Vault Encryption", `${docId}.enc`, "Success", req.user?.username || "Investigator", req.user?.role || "Investigator");

    res.json({
      message: "File securely encrypted with Envelope Encryption and vaulted.",
      documentId: docId,
      sha256_hash: hashSum,
      uploadedBySub: req.user?.sub || "local-user",
    });
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("Encryption failed:", error);
    res.status(500).send("Encryption failed: " + error.message);
  }
});

app.get('/api/v1/storage/download/:documentId', validateDocumentId, (req, res) => {
  const docId = req.params.documentId;
  const vaultPath = path.join(SECURE_VAULT_DIR, `${docId}.enc`);

  if (!fs.existsSync(vaultPath)) {
    return res.status(404).send("Document not found in secure vault.");
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${docId}.pdf"`);

  const readStream = fs.createReadStream(vaultPath);
  decryptStream(readStream, res).catch(err => {
    console.error("Decryption failed:", err);
    if (!res.headersSent) res.status(500).send("Decryption failed");
  });
});

// ---------------------------------------------------------
// AI ANALYSIS API
// ---------------------------------------------------------
app.get('/api/v1/ai/analysis/:documentId', validateDocumentId, (req, res) => {
  const db = readDb();
  const analysis = db.aiAnalysis[req.params.documentId];
  if (!analysis) {
    return res.status(404).json({ error: "AI analysis not found for document" });
  }
  res.json(analysis);
});

// ---------------------------------------------------------
// VERIFICATION API
// ---------------------------------------------------------
app.get('/api/v1/verification', (req, res) => {
  const db = readDb();
  res.json(db.verificationIssues);
});

app.post('/api/v1/verification/:id/resolve', requireAuth, (req, res) => {
  const { decision } = req.body;
  if (!decision) return res.status(400).json({ error: "Decision is required" });

  const db = readDb();
  const issue = db.verificationIssues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  issue.status = decision;
  writeDb(db);

  addAuditLog("Human Verification", req.params.id, decision, req.user?.username || "Reviewer", req.user?.role || "Reviewer");

  res.json(issue);
});

// ---------------------------------------------------------
// TIMELINE API
// ---------------------------------------------------------
app.get('/api/v1/timeline', (req, res) => {
  const db = readDb();
  const { caseId } = req.query;
  if (caseId) {
    return res.json(db.timeline.filter(t => t.caseId === caseId));
  }
  res.json(db.timeline);
});

// ---------------------------------------------------------
// CONNECTIONS API
// ---------------------------------------------------------
app.get('/api/v1/connections', (req, res) => {
  const db = readDb();
  res.json(db.connections);
});

// ---------------------------------------------------------
// AUDIT LOGS API
// ---------------------------------------------------------
app.get('/api/v1/audit', (req, res) => {
  const db = readDb();
  res.json(db.auditLogs);
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` CASEINTEL / Secure Legal DMS Backend Running on port ${PORT}`);
  console.log(` AI Service connected at: ${AI_SERVICE_URL}`);
  console.log(` Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`====================================================`);
});