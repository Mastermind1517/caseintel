import { API_BASE_URL, getAuthHeaders } from "@/config/api";

const fallbackDocuments = [
  {
    id: "DOC-001",
    name: "FIR.pdf",
    type: "FIR",
    caseId: "CASE-001",
    status: "Processed",
    confidence: 96,
  },
  {
    id: "DOC-002",
    name: "Investigation_Report.pdf",
    type: "Investigation Report",
    caseId: "CASE-001",
    status: "Processed",
    confidence: 91,
  },
  {
    id: "DOC-003",
    name: "Forensic_Report.pdf",
    type: "Forensic Report",
    caseId: "CASE-001",
    status: "Processing",
    confidence: null,
  },
];

export async function getDocuments() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch documents from API, using fallback data:", e);
  }
  return fallbackDocuments;
}

export async function getDocumentById(documentId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch document by id from API, using fallback data:", e);
  }
  return fallbackDocuments.find((document) => document.id === documentId);
}

export async function uploadDocument(formData: FormData) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `Upload failed with status ${res.status}`;
    try {
      const rawText = await res.text();
      try {
        const json = JSON.parse(rawText);
        if (json.error || json.message) errorMsg = json.error || json.message;
      } catch {
        if (rawText.includes("<pre>")) {
          const m = rawText.match(/<pre>([\s\S]*?)<\/pre>/i);
          if (m) errorMsg = m[1].trim();
        } else if (rawText && rawText.length < 200 && !rawText.startsWith("<")) {
          errorMsg = rawText;
        }
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return await res.json();
}

export function getDocumentDownloadUrl(documentId: string): string {
  return `${API_BASE_URL}/storage/download/${documentId}`;
}

export async function deleteDocument(documentId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete document (Status ${res.status})`);
  } catch (e: any) {
    console.error("Failed to delete document via API:", e);
    const idx = fallbackDocuments.findIndex(d => d.id === documentId);
    if (idx !== -1) fallbackDocuments.splice(idx, 1);
    throw e;
  }
}