require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { createFailedRequestsLimiter } = require('./middleware/rateLimiter');
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Rate limiters - apply to auth endpoints
const authLimiter = createFailedRequestsLimiter();

// Ensure X-RateLimit-* headers are present for clients (copied from RateLimit-* set by the limiter)
function copyRateLimitHeaders(req, res, next) {
  const limit = res.getHeader('RateLimit-Limit') || res.getHeader('X-RateLimit-Limit');
  const remaining = res.getHeader('RateLimit-Remaining') || res.getHeader('X-RateLimit-Remaining');
  const reset = res.getHeader('RateLimit-Reset') || res.getHeader('X-RateLimit-Reset');
  if (limit) res.setHeader('X-RateLimit-Limit', limit);
  if (remaining) res.setHeader('X-RateLimit-Remaining', remaining);
  if (reset) res.setHeader('X-RateLimit-Reset', reset);
  next();
}

app.post('/api/auth/login', authLimiter, copyRateLimitHeaders);
app.post('/api/auth/register', authLimiter, copyRateLimitHeaders);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.API_PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
}

module.exports = app;
