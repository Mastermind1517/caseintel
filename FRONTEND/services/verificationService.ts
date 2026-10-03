import { API_BASE_URL, getAuthHeaders } from "@/config/api";

const fallbackVerificationIssues = [
  {
    id: "ISSUE-001",
    caseId: "CASE-001",
    type: "Date Mismatch",
    severity: "high",
    status: "pending",
    description:
      "The incident date differs between the FIR and Investigation Report.",
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
];

export async function getVerificationIssues() {
  try {
    const res = await fetch(`${API_BASE_URL}/verification`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch verification issues from API, using fallback data:", e);
  }
  return fallbackVerificationIssues;
}

export async function resolveVerificationIssue(
  issueId: string,
  decision: string
) {
  try {
    const res = await fetch(`${API_BASE_URL}/verification/${issueId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to resolve issue via API, falling back locally:", e);
  }

  const issue = fallbackVerificationIssues.find((item) => item.id === issueId);
  if (!issue) return null;
  issue.status = decision;
  return issue;
}