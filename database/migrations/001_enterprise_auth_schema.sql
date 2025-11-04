-- ===== ENTERPRISE AUTHENTICATION SCHEMA =====
-- Migration für CleaniDoc HACCP Login System
-- Created: 2025-11-04

-- ===== 1. COMPANIES TABLE =====
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'food_manufacturer', 'cleaning_contractor', 'auditor'
  email_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(email_domain)
);

-- ===== 2. USERS TABLE (Enterprise Edition) =====
-- Ersetzt/erweitert die bestehende auth.users-Tabelle
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'admin', 'employee', 'customer', 'manager'
  user_type VARCHAR(50), -- Legacy: 'admin', 'worker', 'customer'
  company_id UUID REFERENCES companies(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'

  -- Two-Factor Authentication
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method VARCHAR(50), -- 'authenticator', 'email'
  two_factor_secret VARCHAR(255),

  -- Audit & Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  last_login_at TIMESTAMP,

  -- Profile Info
  avatar_url TEXT,
  phone VARCHAR(20),
  department VARCHAR(100),

  CONSTRAINT valid_role CHECK (role IN ('admin', 'employee', 'customer', 'manager')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- ===== 3. AUDIT EVENTS TABLE =====
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
    -- 'login_success', 'login_failed', 'twofa_failed', 'twofa_success',
    -- 'logout', 'password_changed', 'account_suspended', etc.
  reason VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB, -- Extra context
  created_at TIMESTAMP DEFAULT now(),

  INDEX_NAME: idx_audit_events_user_id
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Daten sehen
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Policy: Admins können alle Audit Events sehen
CREATE POLICY "Admins can view audit events"
  ON audit_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ===== SEED DATA =====
-- Test Admin User (password: admin123)
INSERT INTO users (email, password_hash, full_name, role, status, two_factor_enabled)
VALUES (
  'admin@cleanidoc.com',
  '$2a$12$...',  -- bcrypt hash of 'admin123' - REPLACE IN PRODUCTION
  'Admin User',
  'admin',
  'active',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Test Employee User
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
  'worker@cleanidoc.com',
  '$2a$12$...',  -- bcrypt hash of 'worker123'
  'Worker User',
  'employee',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Test Customer User
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
  'customer@example.com',
  '$2a$12$...',  -- bcrypt hash of 'customer123'
  'Customer User',
  'customer',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ===== TRIGGER: Update updated_at timestamp =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
