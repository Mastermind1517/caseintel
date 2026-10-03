const normalizeApiUrl = (url?: string): string => {
  if (!url || !url.trim()) return "http://localhost:3001/api/v1";
  const clean = url.trim().replace(/\/+$/, "");
  return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
};

export const API_BASE_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const AI_SERVICE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
})();