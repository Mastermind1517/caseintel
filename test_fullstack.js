/**
 * CaseIntel End-to-End Automated Test Suite
 * Tests all 12 Critical Path Requirements:
 * 1. Health Checks
 * 2. Login & JWT Authentication
 * 3. Role Authorization (Investigator vs Admin)
 * 4. Unauthorized Access Rejection (401/403)
 * 5. Case Creation
 * 6. File Validation & Magic Byte Defense
 * 7. Document 1 Upload (FIR) + AES-256 Envelope Vaulting + SHA-256 Hashing
 * 8. Document 2 Upload (Investigation Report)
 * 9. Cross-Document Analysis & DATE_MISMATCH Finding Generation
 * 10. Human Verification & Resolution (Confirm / Override)
 * 11. Cryptographic Vault Integrity Re-verification (Stream Decryption + Hash Check)
 * 12. Immutable Audit Trail & Timeline Updates
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const AI_URL = process.env.AI_URL || 'http://127.0.0.1:8000';

let testResults = [];
function recordTest(name, passed, detail = "") {
  testResults.push({ name, passed, detail });
  const status = passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(`${status} ${name} ${detail ? "(" + detail + ")" : ""}`);
}

async function runTests() {
  console.log("====================================================");
  console.log("   CASEINTEL AUTOMATED CRITICAL PATH TEST SUITE     ");
  console.log("====================================================");

  // 1. Health Checks
  try {
    const res = await fetch(`${API_URL}/api/v1/health`);
    const health = await res.json();
    recordTest("Backend API Health Check", res.ok && health.status === "ok", `Port: ${health.port}`);
  } catch (e) {
    recordTest("Backend API Health Check", false, e.message);
  }

  // 2. Authentication: Login
  let investigatorToken = null;
  let adminToken = null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "investigator", password: "Investigator123!" }),
    });
    const data = await res.json();
    investigatorToken = data.token;
    recordTest("Investigator Authentication (JWT Login)", data.success === true && !!data.token, `Role: ${data.user?.role}`);
  } catch (e) {
    recordTest("Investigator Authentication (JWT Login)", false, e.message);
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin123!" }),
    });
    const data = await res.json();
    adminToken = data.token;
    recordTest("Admin Authentication (JWT Login)", data.success === true && data.user?.role === "ADMIN", `Role: ${data.user?.role}`);
  } catch (e) {
    recordTest("Admin Authentication (JWT Login)", false, e.message);
  }

  // 3. Unauthorized Access Enforcement (Invalid/Missing Token)
  try {
    const res = await fetch(`${API_URL}/api/v1/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer invalid_tampered_token_xyz" },
      body: JSON.stringify({ name: "Unauthorized Case Test" }),
    });
    recordTest("Unauthorized Token Rejection (401)", res.status === 401, `Status: ${res.status}`);
  } catch (e) {
    recordTest("Unauthorized Token Rejection (401)", false, e.message);
  }

  // 4. Role Authorization: RBAC Enforcement
  // Investigator attempting to delete a case (Admin only)
  try {
    const res = await fetch(`${API_URL}/api/v1/cases/CASE-999`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${investigatorToken}` },
    });
    recordTest("RBAC Privilege Enforcement (Investigator blocked from Admin route)", res.status === 403, `Status: ${res.status} Forbidden`);
  } catch (e) {
    recordTest("RBAC Privilege Enforcement", false, e.message);
  }

  // 5. Create Investigation Case
  let createdCaseId = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${investigatorToken}`,
      },
      body: JSON.stringify({
        name: "Siliguri Cyber Fraud Dossier",
        department: "Cyber Crime",
        priority: "High",
      }),
    });
    const data = await res.json();
    createdCaseId = data.id;
    recordTest("Create Investigation Case", res.status === 201 && !!data.id, `Case ID: ${data.id}`);
  } catch (e) {
    recordTest("Create Investigation Case", false, e.message);
  }

  const targetCaseId = createdCaseId || "CASE-001";

  // 6. File Upload Security: Magic Byte Validation (Reject invalid executable/script file)
  try {
    const fakeFileBuffer = Buffer.from("#!/bin/bash\necho 'Malicious script pretending to be pdf'");
    const formData = new FormData();
    const blob = new Blob([fakeFileBuffer], { type: "application/pdf" });
    formData.append("file", blob, "malicious_script.pdf");
    formData.append("caseId", targetCaseId);

    const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${investigatorToken}` },
      body: formData,
    });
    const data = await res.json();
    recordTest("File Security: Magic Bytes Defense Rejection", res.status === 400 && data.error.includes("Magic bytes"), data.error);
  } catch (e) {
    recordTest("File Security: Magic Bytes Defense Rejection", false, e.message);
  }

  // 7. Upload Document 1 (sample_fir.png)
  let doc1Id = null;
  let doc1Sha256 = null;
  try {
    const firBuffer = fs.readFileSync(path.join(__dirname, "sample_fir.png"));
    const formData = new FormData();
    const blob = new Blob([firBuffer], { type: "image/png" });
    formData.append("file", blob, "sample_fir.png");
    formData.append("caseId", targetCaseId);
    formData.append("documentType", "FIR");
    formData.append("language", "english");

    const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${investigatorToken}` },
      body: formData,
    });
    const data = await res.json();
    doc1Id = data.document?.id;
    doc1Sha256 = data.document?.sha256;
    const dateFound = data.aiAnalysis?.entities?.dates?.includes("12 August 2026");

    recordTest(
      "Document 1 Upload (FIR) + AES-256 Vaulting + SHA-256 Hash",
      res.status === 201 && !!doc1Id && !!doc1Sha256,
      `ID: ${doc1Id}, Hash: ${doc1Sha256?.substring(0, 12)}...`
    );
    recordTest(
      "AI OCR Extraction on Doc 1 (Incident Date: 12 August 2026)",
      dateFound,
      `Dates: [${data.aiAnalysis?.entities?.dates?.join(", ")}]`
    );
  } catch (e) {
    recordTest("Document 1 Upload", false, e.message);
  }

  // 8. Upload Document 2 (sample_investigation_report.png) -> Trigger Cross-Document Inconsistency
  let doc2Id = null;
  try {
    const repBuffer = fs.readFileSync(path.join(__dirname, "sample_investigation_report.png"));
    const formData = new FormData();
    const blob = new Blob([repBuffer], { type: "image/png" });
    formData.append("file", blob, "sample_investigation_report.png");
    formData.append("caseId", targetCaseId);
    formData.append("documentType", "Investigation Report");
    formData.append("language", "english");

    const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${investigatorToken}` },
      body: formData,
    });
    const data = await res.json();
    doc2Id = data.document?.id;
    const dateFound = data.aiAnalysis?.entities?.dates?.includes("14 August 2026");

    recordTest(
      "Document 2 Upload (Investigation Report) + AES-256 Vaulting",
      res.status === 201 && !!doc2Id,
      `ID: ${doc2Id}`
    );
    recordTest(
      "AI OCR Extraction on Doc 2 (Incident Date: 14 August 2026)",
      dateFound,
      `Dates: [${data.aiAnalysis?.entities?.dates?.join(", ")}]`
    );
  } catch (e) {
    recordTest("Document 2 Upload", false, e.message);
  }

  // 9. Inconsistency Detection Check (DATE_MISMATCH)
  let foundIssueId = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/verification`, {
      headers: { "Authorization": `Bearer ${investigatorToken}` },
    });
    const issues = await res.json();
    const mismatch = issues.find(
      (i) => i.caseId === targetCaseId && (i.type === "Date Mismatch" || i.findingType === "DATE_MISMATCH")
    );
    if (mismatch) {
      foundIssueId = mismatch.id;
    }
    recordTest(
      "Cross-Document Analysis: Inconsistency Detected (DATE_MISMATCH)",
      !!mismatch,
      `Issue ID: ${foundIssueId}, 12 August vs 14 August`
    );
  } catch (e) {
    recordTest("Cross-Document Analysis", false, e.message);
  }

  // 10. Human Verification & Resolution
  if (foundIssueId) {
    try {
      const res = await fetch(`${API_URL}/api/v1/verification/${foundIssueId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${investigatorToken}`,
        },
        body: JSON.stringify({ decision: "Source A Confirmed" }),
      });
      const data = await res.json();
      recordTest(
        "Verification Center: Human Confirm Finding (Source A Confirmed)",
        res.ok && data.issue?.status === "Source A Confirmed",
        `Resolved Status: ${data.issue?.status}`
      );
    } catch (e) {
      recordTest("Verification Center", false, e.message);
    }
  }

  // 11. Cryptographic Vault Integrity Re-verification
  if (doc1Id) {
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${doc1Id}/verify-integrity`, {
        headers: { "Authorization": `Bearer ${investigatorToken}` },
      });
      const data = await res.json();
      recordTest(
        "Cryptographic Integrity Re-verification (Stream Decryption SHA-256 match)",
        data.integrityValid === true && data.calculatedHash === data.storedHash,
        `Hash: ${data.calculatedHash?.substring(0, 16)}...`
      );
    } catch (e) {
      recordTest("Cryptographic Integrity Re-verification", false, e.message);
    }
  }

  // 12. Audit Trail & Timeline Verification
  try {
    const [auditRes, timelineRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/audit`),
      fetch(`${API_URL}/api/v1/timeline?caseId=${targetCaseId}`),
    ]);
    const auditLogs = await auditRes.json();
    const timeline = await timelineRes.json();

    const hasUploadLog = auditLogs.some((l) => l.action === "DOCUMENT_UPLOADED");
    const hasIntegrityLog = auditLogs.some((l) => l.action === "INTEGRITY_VERIFIED");
    const hasTimeline = timeline.length > 0;

    recordTest(
      "Audit Trail Recording (DOCUMENT_UPLOADED, INTEGRITY_VERIFIED)",
      hasUploadLog && hasIntegrityLog,
      `Total Log Entries: ${auditLogs.length}`
    );
    recordTest(
      "Case Timeline Chronology",
      hasTimeline,
      `Events Count for Case: ${timeline.length}`
    );
  } catch (e) {
    recordTest("Audit Trail & Timeline Verification", false, e.message);
  }

  console.log("====================================================");
  const total = testResults.length;
  const passedCount = testResults.filter((r) => r.passed).length;
  console.log(`SUMMARY: ${passedCount}/${total} tests passed (${Math.round((passedCount / total) * 100)}%)`);
  console.log("====================================================");

  if (passedCount === total) {
    console.log("\x1b[32mALL CRITICAL PATH REQUIREMENTS PASSED SUCCESSFULLY!\x1b[0m");
    process.exit(0);
  } else {
    console.error("\x1b[31mSome tests failed. See details above.\x1b[0m");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
