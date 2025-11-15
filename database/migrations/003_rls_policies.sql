-- ============================================================================
-- CleaniDoc: RLS (Row Level Security) Policies für alle Tables
-- ============================================================================
-- Implementiert strikte Daten-Isolation nach Rolle & Scope
-- ============================================================================

-- ============================================================================
-- 1. RLS FÜR cleaning_shifts
-- ============================================================================

ALTER TABLE IF EXISTS cleaning_shifts ENABLE ROW LEVEL SECURITY;

-- Mitarbeiter: sehen nur ihre eigenen Shifts
DROP POLICY IF EXISTS "workers_see_own_shifts" ON cleaning_shifts;
CREATE POLICY "workers_see_own_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    assigned_to = auth.uid()
  );

-- Schichtleiter: sehen Shifts ihres Standortes
DROP POLICY IF EXISTS "managers_see_location_shifts" ON cleaning_shifts;
CREATE POLICY "managers_see_location_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Manager können Shifts ihres Standorts aktualisieren
DROP POLICY IF EXISTS "managers_update_location_shifts" ON cleaning_shifts;
CREATE POLICY "managers_update_location_shifts" ON cleaning_shifts
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Kunden: sehen Shifts ihres Vertrags
DROP POLICY IF EXISTS "customers_see_contract_shifts" ON cleaning_shifts;
CREATE POLICY "customers_see_contract_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    contract_id IN (
      SELECT id FROM contracts
      WHERE customer_id = auth.uid()
    )
  );

-- QA Manager: sehen Shifts ihres Standortes
DROP POLICY IF EXISTS "qa_see_location_shifts" ON cleaning_shifts;
CREATE POLICY "qa_see_location_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'qa_manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admin: alles sehen
DROP POLICY IF EXISTS "admin_all_shifts" ON cleaning_shifts;
CREATE POLICY "admin_all_shifts" ON cleaning_shifts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 2. RLS FÜR tasks
-- ============================================================================

ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;

-- Worker: nur Tasks ihrer zugewiesenen Shifts
DROP POLICY IF EXISTS "workers_see_own_tasks" ON tasks;
CREATE POLICY "workers_see_own_tasks" ON tasks
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE assigned_to = auth.uid()
    )
  );

-- Worker: können eigene Tasks aktualisieren
DROP POLICY IF EXISTS "workers_update_own_tasks" ON tasks;
CREATE POLICY "workers_update_own_tasks" ON tasks
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'worker' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE assigned_to = auth.uid()
    )
  );

-- Manager: sehen Tasks ihrer Location
DROP POLICY IF EXISTS "managers_see_location_tasks" ON tasks;
CREATE POLICY "managers_see_location_tasks" ON tasks
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE location_id IN (
        SELECT location_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Manager: können Tasks ihrer Location aktualisieren
DROP POLICY IF EXISTS "managers_update_location_tasks" ON tasks;
CREATE POLICY "managers_update_location_tasks" ON tasks
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE location_id IN (
        SELECT location_id FROM users
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'manager' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE location_id IN (
        SELECT location_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Kunden: sehen Tasks ihrer Verträge
DROP POLICY IF EXISTS "customers_see_contract_tasks" ON tasks;
CREATE POLICY "customers_see_contract_tasks" ON tasks
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    cleaning_shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE contract_id IN (
        SELECT id FROM contracts
        WHERE customer_id = auth.uid()
      )
    )
  );

-- Admin: alles sehen
DROP POLICY IF EXISTS "admin_all_tasks" ON tasks;
CREATE POLICY "admin_all_tasks" ON tasks
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 3. RLS FÜR users
-- ============================================================================

ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Alle: können ihr Profil einsehen
DROP POLICY IF EXISTS "users_read_own_profile" ON users;
CREATE POLICY "users_read_own_profile" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Manager: können User ihres Standortes einsehen
DROP POLICY IF EXISTS "managers_read_location_users" ON users;
CREATE POLICY "managers_read_location_users" ON users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admin: können alle User einsehen
DROP POLICY IF EXISTS "admin_read_all_users" ON users;
CREATE POLICY "admin_read_all_users" ON users
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admin: können User aktualisieren
DROP POLICY IF EXISTS "admin_update_users" ON users;
CREATE POLICY "admin_update_users" ON users
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Nutzer können eigenes Profil aktualisieren
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- ============================================================================
-- 4. RLS FÜR cleaning_logs
-- ============================================================================

ALTER TABLE IF EXISTS cleaning_logs ENABLE ROW LEVEL SECURITY;

-- Worker: nur ihre Logs
DROP POLICY IF EXISTS "workers_see_own_logs" ON cleaning_logs;
CREATE POLICY "workers_see_own_logs" ON cleaning_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    worker_id = auth.uid()
  );

-- Manager: Logs ihres Standortes
DROP POLICY IF EXISTS "managers_see_location_logs" ON cleaning_logs;
CREATE POLICY "managers_see_location_logs" ON cleaning_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE location_id IN (
        SELECT location_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Kunden: nur ihre Vertrags-Logs
DROP POLICY IF EXISTS "customers_see_contract_logs" ON cleaning_logs;
CREATE POLICY "customers_see_contract_logs" ON cleaning_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    contract_id IN (
      SELECT id FROM contracts
      WHERE customer_id = auth.uid()
    )
  );

-- QA: Logs ihres Standortes
DROP POLICY IF EXISTS "qa_see_location_logs" ON cleaning_logs;
CREATE POLICY "qa_see_location_logs" ON cleaning_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'qa_manager' AND
    shift_id IN (
      SELECT id FROM cleaning_shifts
      WHERE location_id IN (
        SELECT location_id FROM users
        WHERE id = auth.uid()
      )
    )
  );

-- Admin: alles
DROP POLICY IF EXISTS "admin_all_logs" ON cleaning_logs;
CREATE POLICY "admin_all_logs" ON cleaning_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 5. RLS FÜR reports/Protokolle
-- ============================================================================

ALTER TABLE IF EXISTS cleaning_reports ENABLE ROW LEVEL SECURITY;

-- Worker: nur ihre Reports
DROP POLICY IF EXISTS "workers_read_own_reports" ON cleaning_reports;
CREATE POLICY "workers_read_own_reports" ON cleaning_reports
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    created_by = auth.uid()
  );

-- Manager: Reports ihres Standortes
DROP POLICY IF EXISTS "managers_read_location_reports" ON cleaning_reports;
CREATE POLICY "managers_read_location_reports" ON cleaning_reports
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Kunden: nur ihre Vertrags-Reports
DROP POLICY IF EXISTS "customers_read_contract_reports" ON cleaning_reports;
CREATE POLICY "customers_read_contract_reports" ON cleaning_reports
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    contract_id IN (
      SELECT id FROM contracts
      WHERE customer_id = auth.uid()
    )
  );

-- Admin: alles
DROP POLICY IF EXISTS "admin_all_reports" ON cleaning_reports;
CREATE POLICY "admin_all_reports" ON cleaning_reports
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 6. RLS FÜR documents
-- ============================================================================

ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;

-- Worker: rollenbezogene Docs
DROP POLICY IF EXISTS "workers_read_docs" ON documents;
CREATE POLICY "workers_read_docs" ON documents
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    visibility IN ('public', 'worker')
  );

-- Manager: alle Docs
DROP POLICY IF EXISTS "managers_read_all_docs" ON documents;
CREATE POLICY "managers_read_all_docs" ON documents
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    visibility IN ('public', 'worker', 'manager')
  );

-- Kunden: öffentliche Docs
DROP POLICY IF EXISTS "customers_read_public_docs" ON documents;
CREATE POLICY "customers_read_public_docs" ON documents
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    visibility IN ('public', 'customer')
  );

-- Admin: alles
DROP POLICY IF EXISTS "admin_all_docs" ON documents;
CREATE POLICY "admin_all_docs" ON documents
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 7. RLS FÜR incidents
-- ============================================================================

ALTER TABLE IF EXISTS incidents ENABLE ROW LEVEL SECURITY;

-- Worker: können Incidents melden und ihre einsehen
DROP POLICY IF EXISTS "workers_manage_own_incidents" ON incidents;
CREATE POLICY "workers_manage_own_incidents" ON incidents
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'worker' AND
    reported_by = auth.uid()
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'worker' AND
    reported_by = auth.uid()
  );

-- Manager: Incidents ihres Standortes
DROP POLICY IF EXISTS "managers_see_location_incidents" ON incidents;
CREATE POLICY "managers_see_location_incidents" ON incidents
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Manager: können Location-Incidents aktualisieren
DROP POLICY IF EXISTS "managers_update_location_incidents" ON incidents;
CREATE POLICY "managers_update_location_incidents" ON incidents
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admin: alles
DROP POLICY IF EXISTS "admin_all_incidents" ON incidents;
CREATE POLICY "admin_all_incidents" ON incidents
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- TESTING CHECKLIST (SQL-Statements zum Testen)
-- ============================================================================

/*
-- Test 1: Worker sieht nur eigene Shifts
SELECT * FROM cleaning_shifts WHERE assigned_to = current_user_id;

-- Test 2: Manager sieht Location-Shifts
SELECT * FROM cleaning_shifts WHERE location_id = current_user_location;

-- Test 3: Customer sieht nur Contract-Shifts
SELECT * FROM cleaning_shifts WHERE contract_id IN (SELECT id FROM contracts WHERE customer_id = current_user);

-- Test 4: Worker KANN NICHT andere Shifts ändern
UPDATE cleaning_shifts SET status = 'completed' WHERE assigned_to != current_user_id;
-- Sollte fehlschlagen mit RLS Policy Error

-- Test 5: Unauthorized sehen NICHTS
SELECT * FROM cleaning_shifts; -- Sollte 0 Rows zeigen

-- Integrity Check:
SELECT COUNT(*) FROM audit_events;
SELECT * FROM audit_events ORDER BY id DESC LIMIT 1;
SELECT previous_hash, current_hash FROM audit_events WHERE id > (SELECT MAX(id)-10 FROM audit_events);
*/

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON cleaning_shifts TO authenticated;
GRANT SELECT, UPDATE ON tasks TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT ON cleaning_logs TO authenticated;
GRANT SELECT ON cleaning_reports TO authenticated;
GRANT SELECT ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON incidents TO authenticated;
