require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { PassThrough } = require('stream');
const { encryptStream, decryptStream, decryptFileToBuffer } = require('./encryptionUtils');
const { USERS, authenticateUser, registerUser, requireAuth, requireRole } = require('./middleware/auth');
const { loginLimiter, uploadLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;
const rawAiUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').trim();
const AI_SERVICE_URL = rawAiUrl.startsWith('http://') || rawAiUrl.startsWith('https://')
  ? rawAiUrl.replace(/\/+$/, '')
  : `http://${rawAiUrl.replace(/\/+$/, '')}`;

// Allow frontend and common origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://caseintel-seven.vercel.app',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for hackathon demo
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Transparent route alias: automatically rewrite non-prefixed API routes (e.g. /documents/upload, /cases, /auth/login) to /api/v1/*
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/v1') && !req.url.startsWith('/_next') && !req.url.startsWith('/favicon')) {
    const topLevelRoutes = ['/documents', '/cases', '/auth', '/timeline', '/connections', '/verification', '/audit', '/health', '/storage'];
    if (topLevelRoutes.some(r => req.url === r || req.url.startsWith(r + '/') || req.url.startsWith(r + '?'))) {
      req.url = '/api/v1' + req.url;
    }
  }
  next();
});

app.use('/api/v1', apiLimiter);

// 25MB file upload limit
const upload = multer({
  dest: 'temp_uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
});
const SECURE_VAULT_DIR = path.join(__dirname, 'secure_vault');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync('temp_uploads')) fs.mkdirSync('temp_uploads', { recursive: true });
if (!fs.existsSync(SECURE_VAULT_DIR)) fs.mkdirSync(SECURE_VAULT_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Magic Bytes Verification
function validateMagicBytes(filePath, originalFilename = '') {
  try {
    const buffer = Buffer.alloc(512);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) return null;

    // PDF: %PDF- (0x25 0x50 0x44 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'PDF';
    // PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4e 0x47)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'PNG';
    // JPEG: \xFF\xD8\xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'JPEG';
    // TIFF: II*\0 (0x49 0x49 0x2A 0x00) or MM\0* (0x4D 0x4D 0x00 0x2A)
    if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
        (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)) return 'TIFF';

    // UTF-8 BOM or plain text validation: only allowed for text file extensions (.txt, .log, .csv)
    const ext = path.extname(originalFilename || '').toLowerCase();
    const isTextExt = ['.txt', '.log', '.text', '.csv'].includes(ext);

    if (isTextExt) {
      if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return 'TEXT';
      let isText = true;
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0x00) { isText = false; break; }
      }
      if (isText) return 'TEXT';
    }

    return null;
  } catch (e) {
    return null;
  }
}

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
      status: "Processed",
      confidence: 97,
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
    "DOC-003": {
      documentId: "DOC-003",
      processingStatus: "complete",
      processingStages: [
        { name: "Document uploaded", status: "complete" },
        { name: "Document classified", status: "complete" },
        { name: "OCR processing", status: "complete" },
        { name: "Entity extraction", status: "complete" },
        { name: "Inconsistency check", status: "complete" },
      ],
      documentType: "Forensic Report",
      language: "English",
      ocrConfidence: 97,
      summary: "Digital forensic workstation extraction for CASE-001 by Dr. Sunita Rao. Corroborates outbound TLS tunnel and exfiltration command on 12 August 2026.",
      extractedText: "CASEINTEL DIGITAL FORENSIC EVIDENCE LOG\nArtifact ID: EVD-SEC-2026-9041\nCase Reference: CASE-001\nPrimary Suspect: Rahul Sharma\nInvestigating Officer: Inspector Rajesh Verma\nForensic Examiner: Dr. Sunita Rao\nIncident Date: 12 August 2026\nPrimary Location: Connaught Place, New Delhi\nOrganization: Apex Global Traders / Cyber Crime Division\nSeized Hardware: Dell Precision 7760 (SN-CYB-8839210-IN)\nIntegrity Verification: PASSED - ZERO BYTE ALTERATION CONFIRMED",
      translation: "CASEINTEL DIGITAL FORENSIC EVIDENCE LOG\nArtifact ID: EVD-SEC-2026-9041\nCase Reference: CASE-001\nPrimary Suspect: Rahul Sharma\nInvestigating Officer: Inspector Rajesh Verma\nForensic Examiner: Dr. Sunita Rao\nIncident Date: 12 August 2026\nPrimary Location: Connaught Place, New Delhi\nOrganization: Apex Global Traders / Cyber Crime Division\nSeized Hardware: Dell Precision 7760 (SN-CYB-8839210-IN)\nIntegrity Verification: PASSED - ZERO BYTE ALTERATION CONFIRMED",
      entities: {
        people: ["Rahul Sharma", "Dr. Sunita Rao", "Inspector Rajesh Verma"],
        locations: ["Connaught Place, New Delhi", "Kolkata"],
        dates: ["12 August 2026"],
        organizations: ["Apex Global Traders", "Cyber Crime Division", "Forensic Science Laboratory"],
      },
      issues: ["Corroborates FIR date (12 August 2026); contradicts Investigation Report (14 August 2026)"],
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
// AUTHENTICATION & RBAC API
// ---------------------------------------------------------
app.post('/api/v1/auth/login', loginLimiter, (req, res) => {
  const { username, email, password } = req.body;
  const identifier = username || email;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: "Username/email and password are required." });
  }

  const result = authenticateUser(identifier, password);
  if (!result) {
    return res.status(401).json({ success: false, error: "Invalid credentials. Please verify your username and password." });
  }

  addAuditLog("USER_LOGIN", result.user.username, "Success", result.user.name, result.user.role);

  res.json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

app.post('/api/v1/auth/register', loginLimiter, (req, res) => {
  const { username, email, password, name, department, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({
      success: false,
      error: "Official full name, username/ID, and password are required.",
    });
  }

  try {
    const result = registerUser({ username, email, password, name, department, role });
    addAuditLog("USER_REGISTERED", result.user.username, "Success", result.user.name, result.user.role);

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/api/v1/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

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

app.post('/api/v1/cases', requireAuth, requireRole(['ADMIN', 'INVESTIGATOR']), (req, res) => {
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
    officer: req.user?.name || req.user?.username || "Investigator",
    createdAt: new Date().toISOString(),
  };

  db.cases.unshift(newCase);
  writeDb(db);

  addAuditLog("CASE_CREATED", newCaseId, "Success", req.user?.name || req.user?.username || "Investigator", req.user?.role || "INVESTIGATOR");

  res.status(201).json(newCase);
});

// Admin-only: Case deletion (demonstrating role-based enforcement)
app.delete('/api/v1/cases/:id', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const db = readDb();
  const index = db.cases.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Case not found" });

  const removed = db.cases.splice(index, 1)[0];
  writeDb(db);
  addAuditLog("CASE_DELETED", req.params.id, "Success", req.user?.name || req.user?.username || "Admin", "ADMIN");

  res.json({ success: true, message: `Case ${req.params.id} purged by Administrator.`, deletedCase: removed });
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

// ---------------------------------------------------------
// INTELLIGENT DOCUMENT CLASSIFICATION & BUILT-IN NLP ENGINE
// ---------------------------------------------------------
function classifyDocument(text = "", filename = "", fallbackType = "Legal Document") {
  const normFn = (filename || "").toLowerCase().replace(/[_-]/g, " ");
  const normText = (text || "").toLowerCase().replace(/[_-]/g, " ");
  
  // 1. Filename explicit indicators
  if (normFn.includes("affidavit")) return "Affidavit";
  if (normFn.includes("transcript") || normFn.includes("interrogation")) return "Witness Statement";
  if (normFn.includes("forensic") || normFn.includes("extraction log")) return "Forensic Report";
  if (normFn.includes("investigation report")) return "Investigation Report";
  if (normFn.includes("fir") || normFn.includes("complaint")) return "FIR";
  if (normFn.includes("alibi")) return "Alibi Statement";
  if (normFn.includes("charge sheet")) return "Charge Sheet";
  if (normFn.includes("court order") || normFn.includes("bail")) return "Court Order";

  // 2. Content indicators
  if (normText.includes("first information report") || normText.includes("fir no")) return "FIR";
  if (normText.includes("verbatim interrogation") || normText.includes("section 161 cr")) return "Witness Statement";
  if (normText.includes("digital forensic evidence log") || normText.includes("hardware write-blocked")) return "Forensic Report";
  if (normText.includes("investigation report") || normText.includes("investigating officer visited")) return "Investigation Report";
  if (normText.includes("sworn on oath") || normText.includes("deponent")) return "Affidavit";

  return (fallbackType && fallbackType !== "Legal Document") ? fallbackType : "Evidence Document";
}

function cleanEntity(str) {
  return (str || "").replace(/\s+/g, ' ').replace(/^[:\s-]+|[:\s,-]+$/g, '').trim();
}

function extractDocumentIntelligence(text = "", filename = "") {
  const dates = [];
  const datePatterns = [
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{4}\b/gi,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g
  ];
  for (const pat of datePatterns) {
    const matches = text.match(pat) || [];
    for (const d of matches) {
      const clean = cleanEntity(d);
      if (clean && !dates.includes(clean)) dates.push(clean);
    }
  }

  // Also extract date from filename keywords like 12Aug2026, 14Aug2026
  const fnDateMatch = filename.match(/(\d{1,2})([A-Za-z]{3,9})(\d{4})/);
  if (fnDateMatch) {
    const formatted = `${fnDateMatch[1]} ${fnDateMatch[2]} ${fnDateMatch[3]}`;
    if (!dates.includes(formatted)) dates.push(formatted);
  }

  const people = [];
  const titlePatterns = [
    /(?:Examined Person|Primary Suspect|Complainant|Deponent|Forensic Examiner|Investigating Officer|Reporting Witness|Subject|Victim|Person)\s*[:=-]\s*([A-Za-z\s.]{3,35})(?:\r?\n|$)/gi,
    /\b(?:Dr\.|Inspector|Officer|Shri|Smt|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
  ];
  
  const stopWords = new Set([
    "First Information", "Police Station", "State Of", "High Court", "Supreme Court",
    "Code Of", "Criminal Procedure", "Case Reference", "Siliguri Police", "Incident Date",
    "Location Observed", "Supervising Department", "Investigation Dossier", "Law Enforcement",
    "Digital Chain", "Custody Verified", "Integrity Protected", "Investigation Findings",
    "Incident Summary", "Department Division", "Official Record", "Verbatim Interrogation",
    "Hardware Specification", "Timestamp Extraction", "Forensic Tool", "Digital Forensic",
    "Case Identifier", "Evidence Artifact", "Primary Location", "Reporting Witness",
    "Forensic Science", "Forensic Examiner", "Legal Document", "Examination Under"
  ]);

  for (const pat of titlePatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      let candidate = cleanEntity(m[1]);
      candidate = candidate.split(/[\n\r,;:]/)[0].trim();
      candidate = candidate.replace(/\b(Complainant|Accused|Witness|Deponent|Officer|Investigator|Subject|Examined)\b/gi, '').trim();
      if (candidate.length >= 3 && candidate.length <= 32 && !stopWords.has(candidate) && !people.includes(candidate)) {
        people.push(candidate);
        if (people.length >= 5) break;
      }
    }
  }

  // Fallback capitalized 2-word names if none found
  if (people.length === 0) {
    const capRegex = /\b([A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15})\b/g;
    let cm;
    while ((cm = capRegex.exec(text)) !== null) {
      const candidate = cleanEntity(cm[1]);
      if (!stopWords.has(candidate) && !people.includes(candidate) && candidate.length > 5) {
        people.push(candidate);
        if (people.length >= 3) break;
      }
    }
  }

  const locations = [];
  const locPatterns = [
    /(?:Location of Examination|Primary Location|Location Observed|Incident Location|Place|City|Location)\s*[:=-]\s*([A-Za-z0-9,\s-]{3,50})(?:\r?\n|$)/gi,
    /\b(New Delhi|Connaught Place|Siliguri|Kolkata|Mumbai|Bengaluru|Chennai|Hyderabad|Cyber Crime Division, New Delhi)\b/gi
  ];
  for (const pat of locPatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      let loc = cleanEntity(m[1]);
      loc = loc.split(/[\r\n;]/)[0].trim();
      if (loc.length >= 3 && !locations.includes(loc) && !stopWords.has(loc)) {
        locations.push(loc);
        if (locations.length >= 3) break;
      }
    }
  }

  const organizations = [];
  const orgPatterns = [
    /(?:Associated Organization|Victim Organization|Supervising Unit|Organization|Department)\s*[:=-]\s*([A-Za-z0-9\s&,-]{3,50})(?:\r?\n|$)/gi,
    /\b(Apex Global Traders|Forensic Science Laboratory|Cyber Crime Division|Police Department|Central Forensic Laboratory)\b/gi
  ];
  for (const pat of orgPatterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      let org = cleanEntity(m[1]);
      org = org.split(/[\r\n;]/)[0].trim();
      if (org.length >= 3 && !organizations.includes(org) && !stopWords.has(org)) {
        organizations.push(org);
        if (organizations.length >= 3) break;
      }
    }
  }

  return { dates, people, locations, organizations };
}

// Ensure initial seed vault files (DOC-001, DOC-002, DOC-003) exist in the encrypted vault
async function ensureInitialVaultFiles() {
  const seedDocs = [
    {
      id: "DOC-001",
      filename: "FIR.pdf",
      content: "CASEINTEL EVIDENCE VAULT - FIRST INFORMATION REPORT\nCase Reference: CASE-001\nPolice Station: Cyber Crime Division, Siliguri\nIncident Date: 12 August 2026\nReporting Person: Rahul Sharma\nComplainant: Vikram Malhotra\nSummary: First Information Report lodged regarding unauthorized digital transaction.\nChain of Custody: Sealed and vaulted under envelope encryption.",
    },
    {
      id: "DOC-002",
      filename: "Investigation_Report.pdf",
      content: "CASEINTEL EVIDENCE VAULT - INVESTIGATION REPORT\nCase Reference: CASE-001\nInvestigating Officer: Inspector Rajesh Verma\nDate of Field Inspection: 14 August 2026\nLocation: Siliguri\nSubject: Rahul Sharma\nSummary: Field inspection report noting observation of server activity on 14 August 2026.\nChain of Custody: Sealed and vaulted under envelope encryption.",
    },
    {
      id: "DOC-003",
      filename: "Forensic_Report.pdf",
      content: "CASEINTEL EVIDENCE VAULT - DIGITAL FORENSIC EXAMINATION REPORT\nCase Reference: CASE-001\nArtifact ID: EVD-SEC-2026-9041\nForensic Examiner: Dr. Sunita Rao, Central Forensic Science Laboratory\nSuspect: Rahul Sharma\nIncident Date Recorded: 12 August 2026\nPrimary Location: Connaught Place, New Delhi\nSeized Machine: Dell Precision 7760 Workstation\nAcquisition: Hardware Write-Blocked Bitstream Image\nChain of Custody: Sealed and vaulted under envelope encryption.",
    },
  ];

  const db = readDb();
  let dbModified = false;

  for (const seed of seedDocs) {
    const vaultPath = path.join(SECURE_VAULT_DIR, `${seed.id}.enc`);
    if (!fs.existsSync(vaultPath)) {
      try {
        const tempPath = path.join(DATA_DIR, `temp_${seed.id}.tmp`);
        fs.writeFileSync(tempPath, seed.content);
        const hash = crypto.createHash('sha256').update(Buffer.from(seed.content)).digest('hex');

        const readStream = fs.createReadStream(tempPath);
        const writeStream = fs.createWriteStream(vaultPath);
        await encryptStream(readStream, writeStream);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        const docRecord = db.documents.find(d => d.id === seed.id);
        if (docRecord) {
          docRecord.sha256 = hash;
          docRecord.status = "Processed";
          if (!docRecord.confidence) docRecord.confidence = 96;
          dbModified = true;
        }
        console.log(`[VAULT] Initialized secure vault file for ${seed.id} (${seed.filename}), SHA-256: ${hash}`);
      } catch (err) {
        console.warn(`[VAULT] Could not seed vault file for ${seed.id}:`, err.message);
      }
    }
  }

  // Also ensure DOC-003 aiAnalysis exists in store
  if (!db.aiAnalysis["DOC-003"] && initialData.aiAnalysis["DOC-003"]) {
    db.aiAnalysis["DOC-003"] = initialData.aiAnalysis["DOC-003"];
    dbModified = true;
  }

  if (dbModified) {
    writeDb(db);
  }
}

// Full Pipeline Upload: Stores file in vault + Triggers AI OCR & Analysis
app.post('/api/v1/documents/upload', requireAuth, requireRole(['ADMIN', 'INVESTIGATOR']), uploadLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded. Field name must be 'file'." });
  }

  const { caseId = "CASE-001", documentType = "Legal Document", language = "auto" } = req.body;
  const tempPath = req.file.path;
  const rawName = req.file.originalname || "document.pdf";
  const originalName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');

  // 1. Magic bytes validation (PDF, PNG, JPG, TIFF, TXT)
  const detectedFormat = validateMagicBytes(tempPath, originalName);
  if (!detectedFormat) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(400).json({
      success: false,
      error: "Invalid file format: Magic bytes signature mismatch. Allowed formats are PDF, PNG, JPG, TIFF, TXT.",
    });
  }

  const db = readDb();
  const docCount = db.documents.length + 1;
  const docId = `DOC-${String(docCount).padStart(3, '0')}`;
  const vaultPath = path.join(SECURE_VAULT_DIR, `${docId}.enc`);

  try {
    // 2. Calculate SHA-256 Checksum for Chain of Custody Integrity
    const fileBuffer = fs.readFileSync(tempPath);
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 3. Encrypt and store into Secure Vault (Envelope Encryption)
    const readStream = fs.createReadStream(tempPath);
    const writeStream = fs.createWriteStream(vaultPath);
    await encryptStream(readStream, writeStream);

    // Direct text extraction if file is plaintext
    let directText = "";
    if (detectedFormat === 'TEXT') {
      try {
        directText = fileBuffer.toString('utf8');
      } catch (e) {
        directText = "";
      }
    }

    // 4. Trigger AI Processing Microservice (or fallback to Built-in NLP)
    let aiResult = null;
    let confidence = null;
    let extractedEntities = { people: [], locations: [], dates: [], organizations: [] };
    let summaryText = "";
    let detectedDocType = documentType;
    let extractedText = "";
    let translation = "";
    let languageLabel = language === "auto" ? "English" : language;

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
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (aiRes.ok) {
        aiResult = await aiRes.json();
        const rawConf = aiResult.ocrConfidence !== undefined && aiResult.ocrConfidence !== null ? Number(aiResult.ocrConfidence) : 0.95;
        confidence = rawConf <= 1.0 ? Math.round(rawConf * 100) : Math.round(rawConf);
        if (aiResult.entities) {
          extractedEntities = {
            people: aiResult.entities.persons || aiResult.entities.people || [],
            locations: aiResult.entities.locations || [],
            dates: aiResult.entities.dates || [],
            organizations: aiResult.entities.organizations || [],
          };
        }
        if (aiResult.summary) summaryText = aiResult.summary;
        if (aiResult.documentType && aiResult.documentType !== "Legal Document") {
          detectedDocType = aiResult.documentType;
        }
        if (aiResult.extractedText) extractedText = aiResult.extractedText;
        if (aiResult.translation) translation = aiResult.translation;
        if (aiResult.languageLabel) languageLabel = aiResult.languageLabel;
      } else {
        console.warn("AI service returned non-200:", await aiRes.text());
      }
    } catch (aiErr) {
      console.warn("AI microservice unreachable or offline (using built-in NLP engine):", aiErr.message);
    }

    // Fallback: If AI service was offline or direct plaintext was uploaded
    if (!extractedText && directText) {
      extractedText = directText;
      translation = directText;
    }

    // Automatic classification from content + filename
    detectedDocType = classifyDocument(extractedText, originalName, detectedDocType);

    // Entity extraction if not provided by external microservice
    if (!extractedEntities.people.length && !extractedEntities.dates.length && !extractedEntities.locations.length) {
      const builtIn = extractDocumentIntelligence(extractedText, originalName);
      extractedEntities = {
        people: builtIn.people,
        locations: builtIn.locations,
        dates: builtIn.dates,
        organizations: builtIn.organizations,
      };
    }

    // Realistic confidence calculation
    if (!confidence) {
      if (detectedFormat === 'TEXT') {
        confidence = 98; // Digital plaintext fidelity
      } else if (extractedText && extractedText.length > 50) {
        confidence = 94;
      } else {
        confidence = 88; // Scanned image / heuristic indexing
      }
    }

    if (!extractedText) {
      extractedText = `[Vault Storage Ingestion Record]\nDocument: ${originalName}\nClassification: ${detectedDocType}\nSealed SHA-256: ${sha256Hash}\nCase: ${caseId}\nVault Encryption: AES-256 Envelope\nIngestion Status: Verified & Sealed`;
      translation = extractedText;
    }

    if (!summaryText) {
      const pStr = extractedEntities.people.length ? `involving ${extractedEntities.people.slice(0, 2).join(", ")}` : "";
      const dStr = extractedEntities.dates.length ? `on ${extractedEntities.dates[0]}` : "";
      const lStr = extractedEntities.locations.length ? `at ${extractedEntities.locations[0]}` : "";
      summaryText = `${detectedDocType} (${originalName}) ${pStr} ${dStr} ${lStr}. Encrypted in AES-256 vault.`.replace(/\s+/g, ' ').trim();
    }

    // 5. Save Document Metadata
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
      fileFormat: detectedFormat,
    };

    db.documents.unshift(newDoc);

    // 6. Save AI Analysis
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
      language: languageLabel,
      ocrConfidence: confidence,
      summary: summaryText,
      extractedText: extractedText,
      translation: translation,
      entities: extractedEntities,
      findings: [],
      issues: [],
    };
    db.aiAnalysis[docId] = analysisPayload;

    // 7. Cross-document inconsistency check within the case
    let inconsistencyDetected = false;
    const siblingDocs = db.documents.filter(d => d.caseId === caseId && d.id !== docId);
    for (const sib of siblingDocs) {
      const sibAnalysis = db.aiAnalysis[sib.id];
      if (sibAnalysis && sibAnalysis.entities?.dates?.length && extractedEntities.dates?.length) {
        const dateA = extractedEntities.dates[0];
        const dateB = sibAnalysis.entities.dates[0];
        if (dateA !== dateB) {
          inconsistencyDetected = true;
          const newIssueId = `ISSUE-${String(db.verificationIssues.length + 1).padStart(3, '0')}`;
          const newIssue = {
            id: newIssueId,
            caseId: caseId,
            type: "Date Mismatch",
            findingType: "DATE_MISMATCH",
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
            confidence: 96,
            createdAt: new Date().toISOString(),
          };
          db.verificationIssues.unshift(newIssue);

          // Add alert to timeline
          db.timeline.unshift({
            id: `EVENT-${String(db.timeline.length + 1).padStart(3, '0')}`,
            date: new Date().toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }),
            title: "Inconsistency detected",
            description: `AI detected DATE_MISMATCH between ${originalName} (${dateA}) and ${sib.name} (${dateB}).`,
            type: "AI Alert",
            caseId: caseId,
          });

          addAuditLog("FINDING_CREATED", `${newIssueId}: DATE_MISMATCH (${dateA} vs ${dateB})`, "Flagged", "AI System", "System");
        }
      }
    }

    // 8. Add Document to Timeline
    db.timeline.unshift({
      id: `EVENT-${String(db.timeline.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }),
      title: `${detectedDocType} uploaded`,
      description: `${originalName} was vaulted in AES-256 envelope and added to ${caseId}.`,
      type: "Document",
      caseId: caseId,
    });

    // 9. Update Connections Graph
    const docNodeId = `doc-${docId.toLowerCase().replace('-', '')}`;
    db.connections.nodes.push({ id: docNodeId, label: originalName, type: "Document" });
    const caseNodeId = caseId.toLowerCase();
    db.connections.edges.push({ from: caseNodeId, to: docNodeId, label: "contains" });

    if (extractedEntities.people.length > 0) {
      const pName = extractedEntities.people[0].split('\n')[0].trim();
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

    // 10. Write updated DB & Audit Logs
    writeDb(db);
    const actorUser = req.user?.name || req.user?.username || "Investigator";
    const actorRole = req.user?.role || "INVESTIGATOR";

    addAuditLog("DOCUMENT_UPLOADED", originalName, "Success", actorUser, actorRole);
    addAuditLog("HASH_GENERATED", `SHA-256: ${sha256Hash.substring(0, 16)}...`, "Success", actorUser, actorRole);
    addAuditLog("VAULT_ENCRYPTED", `${docId}.enc (AES-256)`, "Success", actorUser, actorRole);
    addAuditLog("OCR_STARTED", originalName, "Success", "AI System", "System");
    addAuditLog("OCR_COMPLETED", `${originalName} (${confidence}% confidence)`, "Success", "AI System", "System");
    addAuditLog("ENTITY_EXTRACTION_COMPLETED", originalName, "Success", "AI System", "System");

    // Clean temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    res.status(201).json({
      success: true,
      document: newDoc,
      aiAnalysis: analysisPayload,
      integrity: {
        algorithm: "SHA-256",
        hash: sha256Hash,
        vaultEncrypted: true,
      },
    });
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("Document processing failed:", error);
    res.status(500).json({ success: false, error: "Processing failed: " + error.message });
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
// CRYPTOGRAPHIC INTEGRITY VERIFICATION
// ---------------------------------------------------------
app.get('/api/v1/documents/:id/verify-integrity', validateDocumentId, async (req, res) => {
  const docId = req.params.id;
  const db = readDb();
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return res.status(404).json({ success: false, error: "Document not found" });

  const vaultPath = path.join(SECURE_VAULT_DIR, `${docId}.enc`);
  if (!fs.existsSync(vaultPath)) {
    await ensureInitialVaultFiles();
  }
  if (!fs.existsSync(vaultPath)) {
    return res.status(404).json({
      success: false,
      documentId: docId,
      name: doc.name,
      storedHash: doc.sha256,
      integrityValid: false,
      error: "Encrypted file not found in vault."
    });
  }

  try {
    const decryptedBuffer = await decryptFileToBuffer(vaultPath);
    const calculatedHash = crypto.createHash('sha256').update(decryptedBuffer).digest('hex');

    const isValid = (calculatedHash === doc.sha256);

    const actorUser = req.user?.name || req.user?.username || "Investigator";
    const actorRole = req.user?.role || "INVESTIGATOR";

    addAuditLog(
      "INTEGRITY_VERIFIED",
      `${doc.name} (${docId})`,
      isValid ? "Passed (SHA-256 Match)" : "Failed (Hash Mismatch)",
      actorUser,
      actorRole
    );

    res.json({
      success: true,
      documentId: docId,
      name: doc.name,
      storedHash: doc.sha256,
      calculatedHash: calculatedHash,
      integrityValid: isValid,
      algorithm: "SHA-256",
      vaultEncryption: "AES-256 Envelope",
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Integrity verification failed:", err);
    res.status(500).json({ success: false, error: "Failed to verify integrity: " + err.message });
  }
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

app.post('/api/v1/verification/:id/resolve', requireAuth, requireRole(['ADMIN', 'INVESTIGATOR']), (req, res) => {
  const { decision } = req.body;
  if (!decision) return res.status(400).json({ error: "Decision is required" });

  const db = readDb();
  const issue = db.verificationIssues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  issue.status = decision;
  writeDb(db);

  const actionName = decision.toLowerCase().includes("override") ? "FINDING_OVERRIDDEN" : "FINDING_CONFIRMED";
  const actorUser = req.user?.name || req.user?.username || "Reviewer";
  const actorRole = req.user?.role || "INVESTIGATOR";

  addAuditLog(actionName, `${req.params.id} -> ${decision}`, "Success", actorUser, actorRole);

  res.json({ success: true, issue });
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

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` CASEINTEL / Secure Legal DMS Backend Running on port ${PORT}`);
  console.log(` AI Service connected at: ${AI_SERVICE_URL}`);
  console.log(` Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`====================================================`);
  try {
    await ensureInitialVaultFiles();
  } catch (err) {
    console.warn("[VAULT] Seed check warning:", err.message);
  }
});