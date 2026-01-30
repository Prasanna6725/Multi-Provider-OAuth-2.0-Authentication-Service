-- Enable pgcrypto for gen_random_uuid and crypt support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auth providers table
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint on provider + provider_user_id
CREATE UNIQUE INDEX IF NOT EXISTS auth_providers_provider_user_unique ON auth_providers(provider, provider_user_id);

-- Seed roles/users
-- Admin user
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@example.com',
  crypt('AdminPassword123!', gen_salt('bf')), -- bcrypt hashed by postgres
  'Admin User',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Regular user
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'user@example.com',
  crypt('UserPassword123!', gen_salt('bf')),
  'Regular User',
  'user'
)
ON CONFLICT (email) DO NOTHING;
