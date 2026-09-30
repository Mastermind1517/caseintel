import { API_BASE_URL } from "@/config/api";
import { connections as fallbackConnections } from "@/mock/connections";

export async function getConnections(caseId?: string) {
  try {
    const url = caseId ? `${API_BASE_URL}/connections?caseId=${caseId}` : `${API_BASE_URL}/connections`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch connections from API, using fallback data:", e);
  }
  return fallbackConnections;
}
