/**
 * Migration Runner für step_photos Tabelle über Supabase
 * Führt die SQL-Migration über Supabase aus
 */

import { supabase } from '../lib/supabase';

const STEP_PHOTOS_MIGRATION = `
-- Step Photos Table für Foto-Dokumentation in Reinigungsschritten
CREATE TABLE IF NOT EXISTS step_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referenzen
    log_id UUID NOT NULL,
    step_id TEXT NOT NULL,
    photo_id UUID NOT NULL UNIQUE,

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
    uploaded_by UUID,

    -- Metadata
    description TEXT,
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Tenant Isolation
    tenant_id TEXT NOT NULL
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_step_photos_log_id ON step_photos(log_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_step_id ON step_photos(step_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_photo_id ON step_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_step_photos_tenant_id ON step_photos(tenant_id);

-- Constraints
ALTER TABLE step_photos ADD CONSTRAINT IF NOT EXISTS step_photos_size_positive
    CHECK (size_bytes > 0);

ALTER TABLE step_photos ADD CONSTRAINT IF NOT EXISTS step_photos_content_type_valid
    CHECK (content_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp'));
`;

export const runStepPhotosMigration = async () => {
  try {
    console.log('🚀 Running step_photos migration...');

    // Migration ausführen
    const { error } = await supabase.rpc('exec_sql', {
      sql: STEP_PHOTOS_MIGRATION,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    console.log('✅ step_photos migration completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Migration error:', error);
    return { success: false, error: error.message };
  }
};

export const checkStepPhotosTable = async () => {
  try {
    const { data, error } = await supabase.from('step_photos').select('count').limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist
      return { exists: false };
    }

    return { exists: true, data };
  } catch (error) {
    return { exists: false, error: error.message };
  }
};
