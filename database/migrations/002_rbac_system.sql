-- ============================================================================
-- CleaniDoc: RBAC System with Audit Trail and Hash-Chain Verification
-- ============================================================================
-- Phase 1: Rollen, Berechtigungen, Audit-Trail mit Hash-Verkettung
-- ============================================================================

-- ============================================================================
-- 1. ROLES TABLE (Rollen definieren)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT valid_role_name CHECK (
    name IN ('admin', 'manager', 'worker', 'customer', 'qa_manager')
  )
);

-- Standardrollen einfügen
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator: Volle Systemzugriff'),
  ('manager', 'Schichtleiter: Standort-Supervision'),
  ('worker', 'Mitarbeiter: Task-Ausführung'),
  ('customer', 'Kunde: Einsicht eigener Verträge'),
  ('qa_manager', 'QA-Manager: Qualitätskontrolle')
ON CONFLICT DO NOTHING;

-- RLS für roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_roles" ON roles
  FOR SELECT
  USING (true);

CREATE POLICY "admin_write_roles" ON roles
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================================
-- 2. PERMISSIONS TABLE (Berechtigungen definieren)
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(50) NOT NULL,      -- 'shifts', 'tasks', 'reports', etc.
  action VARCHAR(50) NOT NULL,         -- 'create', 'read', 'update', 'delete', 'sign'
  description TEXT NOT NULL,
  category VARCHAR(50),                -- 'operational', 'reporting', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(resource, action),
  CONSTRAINT valid_action CHECK (
    action IN ('create', 'read', 'update', 'delete', 'sign', 'approve', 'export')
  )
);

-- Standard-Berechtigungen einfügen
INSERT INTO permissions (resource, action, description, category) VALUES
  -- Shift-Management
  ('shifts', 'read', 'Schichten einsehen', 'operational'),
  ('shifts', 'update', 'Schichten aktualisieren', 'operational'),
  ('shifts', 'sign', 'Schicht signieren', 'operational'),
  ('shifts', 'approve', 'Schicht genehmigen (Abnahme)', 'operational'),
  ('shifts', 'create', 'Schicht erstellen', 'operational'),
  ('shifts', 'delete', 'Schicht löschen', 'admin'),

  -- Task-Management
  ('tasks', 'read', 'Tasks einsehen', 'operational'),
  ('tasks', 'update', 'Tasks aktualisieren (abhaken)', 'operational'),
  ('tasks', 'sign', 'Task signieren', 'operational'),
  ('tasks', 'create', 'Tasks erstellen', 'operational'),
  ('tasks', 'delete', 'Tasks löschen', 'admin'),

  -- Reporting
  ('reports', 'read', 'Reports einsehen', 'reporting'),
  ('reports', 'create', 'Reports erstellen', 'reporting'),
  ('reports', 'export', 'Reports exportieren', 'reporting'),

  -- User Management
  ('users', 'read', 'Nutzer einsehen', 'admin'),
  ('users', 'create', 'Nutzer erstellen', 'admin'),
  ('users', 'update', 'Nutzer aktualisieren', 'admin'),
  ('users', 'delete', 'Nutzer löschen', 'admin'),

  -- Incident Management
  ('incidents', 'create', 'Incidents melden', 'operational'),
  ('incidents', 'read', 'Incidents einsehen', 'operational'),
  ('incidents', 'update', 'Incidents aktualisieren', 'operational'),

  -- Documents
  ('documents', 'read', 'Dokumente einsehen', 'operational'),
  ('documents', 'create', 'Dokumente erstellen', 'admin'),
  ('documents', 'update', 'Dokumente aktualisieren', 'admin'),

  -- Audit
  ('audit', 'read', 'Audit-Log einsehen', 'admin')
ON CONFLICT DO NOTHING;

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_permissions" ON permissions
  FOR SELECT
  USING (true);

-- ============================================================================
-- 3. ROLE_PERMISSIONS TABLE (Rolle → Berechtigungen M:N)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope VARCHAR(100) NOT NULL DEFAULT 'all',  -- 'all', 'own', 'team', 'location', 'contract'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(role_id, permission_id),
  CONSTRAINT valid_scope CHECK (
    scope IN ('all', 'own', 'team', 'location', 'contract')
  )
);

-- Matrix-Zuordnungen (basierend auf RBAC-Anforderungen)
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id,
  CASE
    -- ADMIN: Alles
    WHEN r.name = 'admin' THEN 'all'

    -- MANAGER (Schichtleiter)
    WHEN r.name = 'manager' AND p.resource = 'shifts' THEN 'location'
    WHEN r.name = 'manager' AND p.resource = 'tasks' THEN 'location'
    WHEN r.name = 'manager' AND p.resource = 'reports' THEN 'location'
    WHEN r.name = 'manager' AND p.resource = 'incidents' THEN 'location'
    WHEN r.name = 'manager' AND p.resource = 'documents' THEN 'location'
    WHEN r.name = 'manager' AND p.action IN ('approve', 'sign') THEN 'location'

    -- WORKER (Mitarbeiter)
    WHEN r.name = 'worker' AND p.resource = 'shifts' AND p.action = 'read' THEN 'own'
    WHEN r.name = 'worker' AND p.resource = 'tasks' THEN 'own'
    WHEN r.name = 'worker' AND p.resource = 'incidents' AND p.action IN ('create', 'read', 'update') THEN 'own'
    WHEN r.name = 'worker' AND p.resource = 'documents' AND p.action = 'read' THEN 'own'

    -- CUSTOMER
    WHEN r.name = 'customer' AND p.resource = 'shifts' AND p.action = 'read' THEN 'contract'
    WHEN r.name = 'customer' AND p.resource = 'reports' AND p.action IN ('read', 'export') THEN 'contract'
    WHEN r.name = 'customer' AND p.resource = 'documents' AND p.action = 'read' THEN 'contract'

    -- QA_MANAGER
    WHEN r.name = 'qa_manager' AND p.resource IN ('shifts', 'tasks', 'reports') THEN 'location'
    WHEN r.name = 'qa_manager' AND p.resource = 'audit' THEN 'location'

    ELSE NULL
  END
FROM roles r
CROSS JOIN permissions p
WHERE
  (r.name = 'admin') OR  -- Admin: alle Permissions
  (r.name != 'admin' AND (
    -- Manager Permissions
    (r.name = 'manager' AND p.resource IN ('shifts', 'tasks', 'reports', 'incidents', 'documents')) OR
    -- Worker Permissions
    (r.name = 'worker' AND p.resource IN ('shifts', 'tasks', 'incidents', 'documents')) OR
    -- Customer Permissions
    (r.name = 'customer' AND p.resource IN ('shifts', 'reports', 'documents')) OR
    -- QA Manager Permissions
    (r.name = 'qa_manager' AND p.resource IN ('shifts', 'tasks', 'reports', 'audit', 'documents'))
  ))
ON CONFLICT DO NOTHING;

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_role_permissions" ON role_permissions
  FOR SELECT
  USING (true);

-- ============================================================================
-- 4. AUDIT_EVENTS TABLE (Unveränderbar mit Hash-Verkettung)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,        -- 'create', 'update', 'delete', 'view', 'sign', 'approve'
  resource VARCHAR(50) NOT NULL,      -- 'shifts', 'tasks', 'reports', etc.
  resource_id UUID,
  resource_name VARCHAR(255),         -- Human-readable name

  -- Daten-Änderungen
  old_values JSONB,
  new_values JSONB,

  -- Hash-Verkettung
  previous_hash VARCHAR(64),          -- SHA256 des vorherigen Events
  current_hash VARCHAR(64) NOT NULL,  -- SHA256 dieses Events

  -- Kontext
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',  -- 'success', 'failed', 'unauthorized'
  error_message TEXT,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Indizes für Performance
  INDEX audit_user_idx (user_id),
  INDEX audit_resource_idx (resource),
  INDEX audit_timestamp_idx (timestamp),
  INDEX audit_hash_chain_idx (previous_hash)
);

-- Trigger: Verhindere Löschung von Audit-Events
CREATE TRIGGER audit_events_immutable
  BEFORE DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.raise_immutable_error();

-- Trigger: Verhindere Update von Audit-Events (außer Status)
CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW
  WHEN (OLD.id IS NOT NULL)
  EXECUTE FUNCTION public.raise_update_error();

-- RLS: Nutzer können nur ihre eigenen Events sehen, Admin alles
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_events" ON audit_events
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "system_insert_events" ON audit_events
  FOR INSERT
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. HELPER-FUNKTIONEN
-- ============================================================================

-- Funktion: Immutable Trigger
CREATE OR REPLACE FUNCTION public.raise_immutable_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit-Events sind unveränderbar!';
END;
$$ LANGUAGE plpgsql;

-- Funktion: Verhindere Updates
CREATE OR REPLACE FUNCTION public.raise_update_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit-Events dürfen nicht aktualisiert werden!';
END;
$$ LANGUAGE plpgsql;

-- Funktion: Berechne SHA256 Hash
CREATE OR REPLACE FUNCTION public.sha256(bytea) RETURNS text AS $$
SELECT encode(digest($1, 'sha256'), 'hex');
$$ LANGUAGE SQL IMMUTABLE;

-- Funktion: Generiere Audit-Event mit Hash-Verkettung
CREATE OR REPLACE FUNCTION public.create_audit_event(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource VARCHAR,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name VARCHAR DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_previous_hash VARCHAR(64);
  v_event_data JSONB;
  v_current_hash VARCHAR(64);
  v_event_id BIGINT;
BEGIN
  -- Hole letzten Hash
  SELECT current_hash INTO v_previous_hash
  FROM audit_events
  ORDER BY id DESC
  LIMIT 1;

  -- Erstelle Event-Daten
  v_event_data := jsonb_build_object(
    'user_id', p_user_id,
    'action', p_action,
    'resource', p_resource,
    'resource_id', p_resource_id,
    'timestamp', now(),
    'previous_hash', v_previous_hash
  );

  -- Berechne Hash
  v_current_hash := public.sha256(v_event_data::bytea);

  -- Speichere Event
  INSERT INTO audit_events (
    user_id, action, resource, resource_id, resource_name,
    old_values, new_values,
    previous_hash, current_hash,
    ip_address, user_agent,
    timestamp
  ) VALUES (
    p_user_id, p_action, p_resource, p_resource_id, p_resource_name,
    p_old_values, p_new_values,
    v_previous_hash, v_current_hash,
    p_ip_address, p_user_agent,
    now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. EXTEND EXISTING TABLES (shifting_logs, tasks, etc.)
-- ============================================================================

-- Erweitere cleaning_shifts (falls noch nicht vorhanden)
ALTER TABLE IF EXISTS cleaning_shifts
  ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(20),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS signed_by_worker UUID,
  ADD COLUMN IF NOT EXISTS signed_by_manager UUID,
  ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64);

-- Erweitere tasks
ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_by UUID,
  ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS photo_evidence JSONB;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON roles TO anon, authenticated;
GRANT SELECT ON permissions TO anon, authenticated;
GRANT SELECT ON role_permissions TO anon, authenticated;

GRANT SELECT, INSERT ON audit_events TO authenticated;

-- ============================================================================
-- Deployment-Notiz:
-- ============================================================================
-- 1. Führe dieses Skript auf Supabase aus
-- 2. Verifiziere RLS-Policies sind aktiv: SELECT * FROM pg_policies;
-- 3. Teste Hash-Verkettung: SELECT * FROM audit_events ORDER BY id DESC LIMIT 5;
-- 4. Teste Immutability: DELETE FROM audit_events WHERE id = 1; (sollte fehlschlagen)
-- ============================================================================
