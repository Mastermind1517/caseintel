const { CognitoJwtVerifier } = require("aws-jwt-verify");

let verifier = null;
const isCognitoConfigured = Boolean(
  process.env.COGNITO_USER_POOL_ID &&
  process.env.COGNITO_CLIENT_ID &&
  !process.env.COGNITO_USER_POOL_ID.includes("xxxx")
);

if (isCognitoConfigured) {
  try {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: "access",
      clientId: process.env.COGNITO_CLIENT_ID,
    });
    console.log("[AUTH] AWS Cognito JWT Verifier initialized.");
  } catch (err) {
    console.warn("[AUTH] Failed to initialize Cognito verifier:", err.message);
  }
} else {
  console.log("[AUTH] Running in Local/Dev Auth Mode (Cognito credentials not configured).");
}

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (verifier) {
      if (!token) {
        return res.status(401).json({ error: "Missing Bearer Token" });
      }
      const payload = await verifier.verify(token);
      req.user = payload;
      return next();
    }

    // Local / Dev Fallback:
    // If a token is provided or running locally, assign authenticated user
    req.user = {
      sub: req.headers["x-user-sub"] || "usr-investigator-001",
      username: req.headers["x-user-name"] || "Investigator",
      "cognito:groups": ["ROLE_INVESTIGATOR", "ROLE_ADMIN"],
      role: "Investigator",
    };
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(403).json({ error: "Unauthorized access: " + err.message });
  }
};

module.exports = { requireAuth };