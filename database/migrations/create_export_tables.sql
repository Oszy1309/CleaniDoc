-- ============================================================================
-- HACCP Export System - Database Schema
-- Version: 1.0
-- Date: 2025-10-31
-- ============================================================================

-- Tenant Settings für Export-Konfiguration
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  company_legal TEXT NOT NULL,
  logo_url TEXT,
  brand_primary TEXT DEFAULT '#3b82f6',
  brand_secondary TEXT DEFAULT '#1e40af',
  daily_email_time TIME DEFAULT '06:00',
  email_recipients TEXT[] DEFAULT '{}',

  -- SFTP Settings
  sftp_host TEXT,
  sftp_port INT DEFAULT 22,
  sftp_user TEXT,
  sftp_path TEXT DEFAULT '/incoming/cleanidoc',

  -- Webhook Settings
  webhook_url TEXT,
  webhook_hmac_secret TEXT,

  -- SMTP Settings
  smtp_host TEXT,
  smtp_port INT DEFAULT 587,
  smtp_user TEXT,
  smtp_from TEXT,
  smtp_use_tls BOOLEAN DEFAULT true,

  -- Retention & Security
  retention_days INT DEFAULT 730, -- 24 Monate
  encryption_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Digitale Signaturen für Logs
CREATE TABLE IF NOT EXISTS log_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  log_id UUID NOT NULL REFERENCES cleaning_logs(id) ON DELETE CASCADE,
  signed_by_user_id UUID NOT NULL REFERENCES workers(id),
  signed_role TEXT CHECK (signed_role IN ('SHIFT_LEAD', 'CLIENT_REP', 'QUALITY_MANAGER')) NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_payload JSONB NOT NULL,
  signature_hash TEXT NOT NULL,

  UNIQUE (log_id, signed_role),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Export-Archive (Metadaten für tägliche Exporte)
CREATE TABLE IF NOT EXISTS daily_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_date DATE NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',

  -- S3 Keys für alle Artefakte
  pdf_s3_key TEXT,
  csv_logs_s3_key TEXT,
  csv_steps_s3_key TEXT,
  csv_photos_s3_key TEXT,
  manifest_s3_key TEXT,
  checksums_s3_key TEXT,
  zip_s3_key TEXT,

  -- Prüfsummen
  sha256_pdf TEXT,
  sha256_csv_logs TEXT,
  sha256_csv_steps TEXT,
  sha256_csv_photos TEXT,
  sha256_manifest TEXT,
  sha256_checksums TEXT,
  sha256_zip TEXT,

  -- Statistiken
  total_logs INT DEFAULT 0,
  completed_logs INT DEFAULT 0,
  failed_logs INT DEFAULT 0,
  total_steps INT DEFAULT 0,
  total_photos INT DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,

  -- Delivery Status
  email_sent_at TIMESTAMPTZ,
  email_recipients TEXT[],
  sftp_uploaded_at TIMESTAMPTZ,
  webhook_sent_at TIMESTAMPTZ,
  webhook_response_code INT,

  -- Processing Info
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_time_ms INT,
  created_by UUID REFERENCES workers(id),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, report_date)
);

-- Audit Events für Compliance
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  actor_user_id UUID REFERENCES workers(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Log Photo Metadata (erweitert)
CREATE TABLE IF NOT EXISTS log_step_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  log_id UUID NOT NULL REFERENCES cleaning_logs(id) ON DELETE CASCADE,
  step_id UUID,

  -- S3 Storage
  s3_key TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,

  -- Image Metadata
  width INT,
  height INT,
  sha256_hash TEXT NOT NULL,

  -- EXIF Data (stripped for privacy)
  taken_at TIMESTAMPTZ,
  camera_info JSONB,

  uploaded_by UUID NOT NULL REFERENCES workers(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES FÜR PERFORMANCE
-- ============================================================================

-- Export-Suche
CREATE INDEX IF NOT EXISTS idx_daily_exports_tenant_date ON daily_exports(tenant_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_exports_status ON daily_exports(status) WHERE status != 'COMPLETED';

-- Signature-Lookups
CREATE INDEX IF NOT EXISTS idx_log_signatures_log_id ON log_signatures(log_id);
CREATE INDEX IF NOT EXISTS idx_log_signatures_tenant ON log_signatures(tenant_id, signed_at DESC);

-- Audit-Queries
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_occurred ON audit_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action, occurred_at DESC);

-- Photo-Lookups
CREATE INDEX IF NOT EXISTS idx_log_photos_log_step ON log_step_photos(log_id, step_id);
CREATE INDEX IF NOT EXISTS idx_log_photos_tenant ON log_step_photos(tenant_id, taken_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Tenant Isolation für alle Tabellen
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_step_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Beispiel - anpassen an Auth-System)
CREATE POLICY tenant_isolation_settings ON tenant_settings
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_signatures ON log_signatures
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_exports ON daily_exports
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_audit ON audit_events
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_photos ON log_step_photos
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================================================
-- FUNCTIONS FÜR AUTOMATION
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers für updated_at
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_exports_updated_at
  BEFORE UPDATE ON daily_exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit Event Trigger
CREATE OR REPLACE FUNCTION log_audit_event(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_events (
    tenant_id, actor_user_id, action, target_type, target_id, metadata
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_action, p_target_type, p_target_id, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FÜR REPORTING
-- ============================================================================

-- Export Status Dashboard
CREATE OR REPLACE VIEW export_status_dashboard AS
SELECT
  de.tenant_id,
  ts.company_legal,
  de.report_date,
  de.status,
  de.total_logs,
  de.completed_logs,
  de.failed_logs,
  de.total_size_bytes,
  de.processing_time_ms,
  de.email_sent_at IS NOT NULL as email_delivered,
  de.sftp_uploaded_at IS NOT NULL as sftp_delivered,
  de.webhook_sent_at IS NOT NULL as webhook_delivered,
  de.created_at,
  de.updated_at
FROM daily_exports de
JOIN tenant_settings ts ON de.tenant_id = ts.tenant_id
ORDER BY de.report_date DESC, ts.company_legal;

-- Signature Status per Log
CREATE OR REPLACE VIEW log_signature_status AS
SELECT
  cl.id as log_id,
  cl.customer_id as tenant_id,
  cl.created_at as log_date,
  COUNT(ls.id) as signature_count,
  BOOL_AND(ls.signed_role = 'SHIFT_LEAD') as shift_lead_signed,
  BOOL_AND(ls.signed_role = 'CLIENT_REP') as client_rep_signed,
  CASE
    WHEN COUNT(ls.id) = 0 THEN 'unsigned'
    WHEN COUNT(ls.id) = 1 THEN 'partial'
    ELSE 'complete'
  END as signature_status
FROM cleaning_logs cl
LEFT JOIN log_signatures ls ON cl.id = ls.log_id
GROUP BY cl.id, cl.customer_id, cl.created_at;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Default tenant settings für bestehende Kunden
INSERT INTO tenant_settings (tenant_id, company_legal)
SELECT
  id,
  name
FROM customers
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings WHERE tenant_id = customers.id
)
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- CLEANUP & MAINTENANCE
-- ============================================================================

-- Retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
DECLARE
  cutoff_date DATE;
  expired_exports RECORD;
BEGIN
  -- Lösche Exports älter als retention_days
  FOR expired_exports IN
    SELECT de.id, de.tenant_id, ts.retention_days
    FROM daily_exports de
    JOIN tenant_settings ts ON de.tenant_id = ts.tenant_id
    WHERE de.report_date < (CURRENT_DATE - INTERVAL '1 day' * ts.retention_days)
  LOOP
    -- Log cleanup
    PERFORM log_audit_event(
      expired_exports.tenant_id,
      NULL,
      'EXPORT_DELETED_RETENTION',
      'daily_exports',
      expired_exports.id::text,
      json_build_object('retention_days', expired_exports.retention_days)::jsonb
    );

    -- Delete export record (S3 cleanup handled separately)
    DELETE FROM daily_exports WHERE id = expired_exports.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions (anpassen an bestehende Rollen)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Read-only für Reporting
GRANT SELECT ON export_status_dashboard TO reporting_role;
GRANT SELECT ON log_signature_status TO reporting_role;