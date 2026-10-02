/**
 * In-memory sliding-window rate limiter middleware for CaseIntel API Gateway.
 * Protects auth, document upload, and AI processing endpoints from abuse.
 */

const clientWindows = new Map();

function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = "Too many requests, please try again later." } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const key = `${ip}:${req.baseUrl}${req.path}`;

    let timestamps = clientWindows.get(key);
    if (!timestamps) {
      timestamps = [];
      clientWindows.set(key, timestamps);
    }

    // Filter timestamps within the current window
    const windowStart = now - windowMs;
    const recent = timestamps.filter(ts => ts > windowStart);

    if (recent.length >= max) {
      const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: retryAfter,
      });
    }

    recent.push(now);
    clientWindows.set(key, recent);

    // Housekeeping: periodic cleanup if map gets large
    if (clientWindows.size > 10000) {
      for (const [k, tsList] of clientWindows.entries()) {
        if (tsList.every(t => t <= windowStart)) {
          clientWindows.delete(k);
        }
      }
    }

    next();
  };
}

// Preset Limiters
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please wait 60 seconds before trying again.",
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Upload rate limit reached (max 30 documents/min). Please try again shortly.",
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: "API rate limit exceeded. Please throttle your requests.",
});

module.exports = {
  createRateLimiter,
  loginLimiter,
  uploadLimiter,
  apiLimiter,
};
