-- Migration: Create step_photos table for protocol photo documentation
-- Version: 1.1
-- Date: 2024-11-01

BEGIN;

-- Step Photos Table für Foto-Dokumentation in Reinigungsschritten
CREATE TABLE IF NOT EXISTS step_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referenzen
    log_id UUID NOT NULL REFERENCES cleaning_logs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL, -- Referenz auf step within cleaning plan/log
    photo_id UUID NOT NULL UNIQUE, -- S3 Photo ID for referencing

    -- S3 Storage Info
    s3_key TEXT NOT NULL UNIQUE,
    s3_bucket TEXT DEFAULT 'cleanidoc-exports',

    -- File Metadata
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'image/jpeg',
    size_bytes INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    sha256 TEXT NOT NULL,

    -- Upload Info
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    uploaded_by UUID REFERENCES auth.users(id),

    -- Metadata
    description TEXT,
    tags TEXT[], -- For categorization: ['before', 'during', 'after', 'issue', 'result']

    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Tenant Isolation (wird automatisch gesetzt)
    tenant_id TEXT NOT NULL
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_step_photos_log_id ON step_photos(log_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_step_id ON step_photos(step_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_photo_id ON step_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_s3_key ON step_photos(s3_key);
CREATE INDEX IF NOT EXISTS idx_step_photos_uploaded_at ON step_photos(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_step_photos_tenant_id ON step_photos(tenant_id);

-- Composite Indexes
CREATE INDEX IF NOT EXISTS idx_step_photos_log_step ON step_photos(log_id, step_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_tenant_date ON step_photos(tenant_id, uploaded_at);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_step_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_step_photos_updated_at
    BEFORE UPDATE ON step_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_step_photos_updated_at();

-- Tenant ID Auto-Population (basierend auf cleaning_logs.tenant_id)
CREATE OR REPLACE FUNCTION set_step_photos_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Tenant ID von zugehörigem cleaning_log übernehmen
    SELECT cl.tenant_id INTO NEW.tenant_id
    FROM cleaning_logs cl
    WHERE cl.id = NEW.log_id;

    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'Cannot determine tenant_id for log_id: %', NEW.log_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_set_step_photos_tenant_id
    BEFORE INSERT ON step_photos
    FOR EACH ROW
    EXECUTE FUNCTION set_step_photos_tenant_id();

-- Row Level Security (RLS)
ALTER TABLE step_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Tenant-Fotos sehen/bearbeiten
CREATE POLICY step_photos_tenant_isolation ON step_photos
    USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant', true),
            (auth.jwt() ->> 'tenant_id')
        )
    );

-- Policy: Service Role kann alles (für Cron Jobs etc.)
CREATE POLICY step_photos_service_role ON step_photos
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Constraints
ALTER TABLE step_photos ADD CONSTRAINT step_photos_size_positive
    CHECK (size_bytes > 0);

ALTER TABLE step_photos ADD CONSTRAINT step_photos_dimensions_positive
    CHECK (width IS NULL OR width > 0);

ALTER TABLE step_photos ADD CONSTRAINT step_photos_content_type_valid
    CHECK (content_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp'));

-- File Size Limit (100MB)
ALTER TABLE step_photos ADD CONSTRAINT step_photos_size_limit
    CHECK (size_bytes <= 100 * 1024 * 1024);

-- Comments für Dokumentation
COMMENT ON TABLE step_photos IS 'Photo documentation for cleaning protocol steps';
COMMENT ON COLUMN step_photos.log_id IS 'Reference to cleaning log';
COMMENT ON COLUMN step_photos.step_id IS 'Step identifier within the cleaning plan';
COMMENT ON COLUMN step_photos.photo_id IS 'Unique photo identifier for S3 reference';
COMMENT ON COLUMN step_photos.s3_key IS 'S3 object key for the photo file';
COMMENT ON COLUMN step_photos.sha256 IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN step_photos.tags IS 'Photo categorization tags';

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON step_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON step_photos TO service_role;

-- Analytics View für Export-System
CREATE OR REPLACE VIEW step_photos_analytics AS
SELECT
    tenant_id,
    date_trunc('day', uploaded_at) as upload_date,
    COUNT(*) as photos_count,
    SUM(size_bytes) as total_size_bytes,
    AVG(size_bytes) as avg_size_bytes,
    COUNT(DISTINCT log_id) as unique_logs,
    COUNT(DISTINCT step_id) as unique_steps,
    array_agg(DISTINCT content_type) as content_types
FROM step_photos
GROUP BY tenant_id, date_trunc('day', uploaded_at)
ORDER BY tenant_id, upload_date DESC;

GRANT SELECT ON step_photos_analytics TO authenticated;
GRANT SELECT ON step_photos_analytics TO service_role;

COMMIT;

-- Zusätzliche Hilfsfunktionen

-- Funktion: Fotos zu einem Log zählen
CREATE OR REPLACE FUNCTION count_log_photos(log_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM step_photos
        WHERE log_id = log_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Gesamtgröße der Fotos eines Logs
CREATE OR REPLACE FUNCTION get_log_photos_size(log_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(size_bytes), 0)
        FROM step_photos
        WHERE log_id = log_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Cleanup von verwaisten Fotos (ohne zugehörigen Log)
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM step_photos
        WHERE log_id NOT IN (
            SELECT id FROM cleaning_logs
        )
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;