import { API_BASE_URL } from "@/config/api";
import { caseTimeline as fallbackTimeline } from "@/mock/timeline";

export async function getTimeline(caseId?: string) {
  try {
    const url = caseId ? `${API_BASE_URL}/timeline?caseId=${caseId}` : `${API_BASE_URL}/timeline`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch timeline from API, using fallback data:", e);
  }
  return fallbackTimeline;
}
