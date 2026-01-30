# Multi-Provider OAuth 2.0 Authentication Service ✅

A minimal, production-minded RESTful authentication service implementing:
- Local email/password auth with bcrypt
- OAuth 2.0 endpoints for Google and GitHub (initiate + callback; mock-mode available for tests)
- JWT Access token + Refresh token with rotation using Redis
- RBAC (admin-only users listing)
- Rate limiting on auth endpoints (counts failed attempts)
- Containerized via Docker and Docker Compose (Postgres + Redis)

---

## Quickstart

1. Copy `.env.example` to `.env` and fill values.
2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

3. Wait until all services become healthy (health checks are configured).

4. The DB is seeded automatically with two test users (see `submission.json`):
- admin@example.com / AdminPassword123!
- user@example.com / UserPassword123!


## API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/google -> redirect
- GET /api/auth/github -> redirect
- GET /api/auth/:provider/callback?mock=true&provider_user_id=...&email=...&name=... -> callback (mock)
- POST /api/auth/refresh
- GET /api/users/me (protected)
- PATCH /api/users/me (protected)
- GET /api/users (protected, admin only)
- GET /health

---

## Notes
- For automated testing of OAuth flows, use the callback endpoints with `mock=true` and provide `provider_user_id`, `email`, and `name` as query parameters; the endpoint will create/link users and return tokens as JSON.
- Refresh tokens are stored server-side in Redis with key `refresh:<jti>`; rotation is implemented on refresh.

---

If you need anything adjusted (e.g., adding tests or switching DB clients), tell me which piece to prioritize. 🔧
