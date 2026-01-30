const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Only count failed attempts (i.e., responses with status >= 400)
function createFailedRequestsLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ client: redis }),
    skipSuccessfulRequests: true, // don't count successful requests
    handler: (req, res) => {
      const reset = Math.ceil((Date.now() + 60 * 1000) / 1000);
      res.set('X-RateLimit-Limit', '10');
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(reset));
      res.status(429).json({ error: 'Too many requests' });
    }
  });
}

module.exports = { createFailedRequestsLimiter };
