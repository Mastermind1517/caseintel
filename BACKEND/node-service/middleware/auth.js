/**
 * Authentication and Role-Based Access Control (RBAC) middleware for CaseIntel.
 * Supports standard HMAC-SHA256 JWT tokens and preconfigured demo credentials.
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'caseintel-hackathon-secure-jwt-secret-key-2026';

// Controlled Fictional Demo Accounts
const USERS = [
  {
    id: "usr-admin-001",
    username: "admin",
    email: "admin@caseintel.local",
    passwordHash: crypto.createHash('sha256').update("Admin123!").digest('hex'),
    name: "Director Sharma",
    role: "ADMIN",
    department: "Special Operations",
  },
  {
    id: "usr-inv-001",
    username: "investigator",
    email: "investigator@caseintel.local",
    passwordHash: crypto.createHash('sha256').update("Investigator123!").digest('hex'),
    name: "Inspector Rajesh Verma",
    role: "INVESTIGATOR",
    department: "Cyber Crime",
  },
];

// Helper: Base64URL encode/decode
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Generate signed JWT
function signToken(payload, expiresInSeconds = 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify JWT
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('No token provided');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

// Authenticate username/email & password
function authenticateUser(identifier, password) {
  if (!identifier || !password) return null;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = USERS.find(
    (u) =>
      (u.username.toLowerCase() === identifier.toLowerCase() ||
        u.email.toLowerCase() === identifier.toLowerCase()) &&
      u.passwordHash === hash
  );

  if (!user) return null;

  const { passwordHash, ...userSafe } = user;
  const token = signToken({
    sub: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  });

  return { user: userSafe, token };
}

// Middleware: Require valid JWT
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
      return next();
    }

    // Demo/Dev Fallback support via explicit dev header if present
    const demoRole = req.headers['x-demo-role'];
    if (demoRole) {
      const role = demoRole.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'INVESTIGATOR';
      const u = USERS.find((x) => x.role === role);
      req.user = {
        sub: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
      };
      return next();
    }

    // Default development fallback for seamless local browser testing
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        sub: 'usr-inv-001',
        username: 'investigator',
        name: 'Inspector Rajesh Verma',
        email: 'investigator@caseintel.local',
        role: 'INVESTIGATOR',
        department: 'Cyber Crime',
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token is missing or invalid.',
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: `Unauthorized: ${err.message}`,
    });
  }
};

// Middleware: Role-Based Authorization
const requireRole = (allowedRoles = ['ADMIN', 'INVESTIGATOR']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required.',
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const authorized = allowedRoles.map((r) => r.toUpperCase()).includes(userRole);

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Insufficient privileges. Required role(s): [${allowedRoles.join(', ')}]. Current role: ${userRole || 'NONE'}`,
      });
    }

    next();
  };
};

module.exports = {
  USERS,
  signToken,
  verifyToken,
  authenticateUser,
  requireAuth,
  requireRole,
};