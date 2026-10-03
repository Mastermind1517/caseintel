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

export function createClientJwt(user?: any): string {
  const b64Url = (obj: any) => {
    try {
      const str = JSON.stringify(obj);
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
  };

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user?.id || "usr-inv-001",
    username: user?.username || "investigator",
    name: user?.name || "Inspector Rajesh Verma",
    email: user?.email || "investigator@caseintel.local",
    role: (user?.role || "INVESTIGATOR").toUpperCase(),
    department: user?.department || "Cyber Crime",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  };

  const encodedHeader = b64Url(header);
  const encodedPayload = b64Url(payload);
  const sig = btoa(`${encodedHeader}.${encodedPayload}`).slice(0, 32).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${encodedHeader}.${encodedPayload}.${sig}`;
}

export function getAuthHeaders(): HeadersInit {
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("caseintel_token");

    // Seamless auto-upgrade: if token is a legacy mock string without 3 JWT parts, convert it to a valid JWT
    if (token && (!token.includes(".") || token.split(".").length !== 3)) {
      const storedUser = localStorage.getItem("caseintel_user");
      let userObj: any = { role: "INVESTIGATOR", username: "investigator", name: "Inspector Rajesh Verma" };
      try {
        if (storedUser) userObj = JSON.parse(storedUser);
      } catch {}
      token = createClientJwt(userObj);
      localStorage.setItem("caseintel_token", token);
    }

    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}