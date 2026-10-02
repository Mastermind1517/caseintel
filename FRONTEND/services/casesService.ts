import { API_BASE_URL } from "@/config/api";

function getAuthHeaders(): HeadersInit {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("caseintel_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

const fallbackCases = [
  {
    id: "CASE-001",
    name: "Document Fraud Investigation",
    department: "Cyber Crime",
    priority: "High",
    status: "Active",
    officer: "Investigator",
  },
  {
    id: "CASE-002",
    name: "Identity Verification",
    department: "Investigation",
    priority: "Medium",
    status: "Review",
    officer: "Reviewer",
  },
  {
    id: "CASE-003",
    name: "Financial Document Analysis",
    department: "Economic Offences",
    priority: "Low",
    status: "Closed",
    officer: "Investigator",
  },
];

export async function getCases() {
  try {
    const res = await fetch(`${API_BASE_URL}/cases`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch cases from API, using fallback data:", e);
  }
  return fallbackCases;
}

export async function getCaseById(caseId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch case by id from API, using fallback data:", e);
  }
  return fallbackCases.find((item) => item.id === caseId);
}

export async function createCase(data: { name: string; department?: string; priority?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to create case via API:", e);
  }

  // Fallback local create
  const newCase = {
    id: `CASE-00${fallbackCases.length + 1}`,
    name: data.name,
    department: data.department || "Investigation",
    priority: data.priority || "Medium",
    status: "Active",
    officer: "Investigator",
  };
  fallbackCases.unshift(newCase);
  return newCase;
}