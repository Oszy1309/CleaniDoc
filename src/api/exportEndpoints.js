/**
 * Export API Endpoints für HACCP-System
 * RESTful API für Export-Management
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import exportOrchestrator from '../services/exportOrchestrator';
import s3StorageService from '../services/s3StorageService';
import { supabase } from '../lib/supabase';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

// Rate Limiting für Export-Endpunkte
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // Max 5 Exporte pro 15 Min
  message: 'Zu viele Export-Anfragen. Versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 20, // Max 20 Downloads pro Minute
  message: 'Zu viele Download-Anfragen.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// EXPORT GENERATION
// ============================================================================

/**
 * POST /api/exports/daily
 * Täglichen Export manuell triggern
 */
router.post(
  '/daily',
  exportLimiter,
  requireAuth,
  requireRole(['admin', 'manager']),
  [
    query('date').isISO8601().withMessage('Datum muss im Format YYYY-MM-DD sein'),
    query('skip_delivery').optional().isBoolean().withMessage('skip_delivery muss boolean sein'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array(),
        });
      }

      const { date } = req.query;
      const skipDelivery = req.query.skip_delivery === 'true';
      const tenantId = req.user.tenant_id;

      // Prüfe ob Export bereits existiert
      const { data: existingExport } = await supabase
        .from('daily_exports')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('report_date', date)
        .single();

      if (existingExport && existingExport.status === 'COMPLETED') {
        return res.status(409).json({
          success: false,
          message: 'Export für dieses Datum bereits vorhanden',
          export_id: existingExport.id,
        });
      }

      // Export starten
      const result = await exportOrchestrator.generateDailyExport(tenantId, date, {
        skipDelivery,
        triggeredBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: 'Export erfolgreich erstellt',
        ...result,
      });
    } catch (error) {
      console.error('Daily export error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Export fehlgeschlagen',
        error_code: 'EXPORT_FAILED',
      });
    }
  }
);

/**
 * GET /api/exports
 * Liste aller Exporte für Tenant
 */
router.get(
  '/',
  requireAuth,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit muss zwischen 1 und 100 liegen'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset muss >= 0 sein'),
    query('status')
      .optional()
      .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])
      .withMessage('Ungültiger Status'),
    query('from_date')
      .optional()
      .isISO8601()
      .withMessage('from_date muss im Format YYYY-MM-DD sein'),
    query('to_date').optional().isISO8601().withMessage('to_date muss im Format YYYY-MM-DD sein'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { limit = 50, offset = 0, status, from_date, to_date } = req.query;

      let query = supabase
        .from('daily_exports')
        .select(
          `
          id,
          report_date,
          status,
          total_logs,
          completed_logs,
          failed_logs,
          total_steps,
          total_photos,
          total_size_bytes,
          processing_time_ms,
          email_sent_at,
          sftp_uploaded_at,
          webhook_sent_at,
          created_at,
          error_message
        `
        )
        .eq('tenant_id', req.user.tenant_id)
        .order('report_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (from_date) {
        query = query.gte('report_date', from_date);
      }

      if (to_date) {
        query = query.lte('report_date', to_date);
      }

      const { data: exports, error, count } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: exports || [],
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: count > offset + limit,
        },
      });
    } catch (error) {
      console.error('Get exports error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Laden der Exporte',
      });
    }
  }
);

/**
 * GET /api/exports/:exportId
 * Details zu einem spezifischen Export
 */
router.get(
  '/:exportId',
  requireAuth,
  [param('exportId').isUUID().withMessage('Ungültige Export-ID')],
  async (req, res) => {
    try {
      const { exportId } = req.params;

      const { data: exportData, error } = await supabase
        .from('daily_exports')
        .select('*')
        .eq('id', exportId)
        .eq('tenant_id', req.user.tenant_id)
        .single();

      if (error || !exportData) {
        return res.status(404).json({
          success: false,
          message: 'Export nicht gefunden',
        });
      }

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      console.error('Get export details error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Laden der Export-Details',
      });
    }
  }
);

// ============================================================================
// DOWNLOAD MANAGEMENT
// ============================================================================

/**
 * POST /api/exports/:exportId/download-url
 * Pre-signed Download-URL generieren
 */
router.post(
  '/:exportId/download-url',
  downloadLimiter,
  requireAuth,
  [
    param('exportId').isUUID().withMessage('Ungültige Export-ID'),
    body('file_type')
      .isIn(['pdf', 'zip', 'csv_logs', 'csv_steps', 'csv_photos', 'manifest', 'checksums'])
      .withMessage('Ungültiger Dateityp'),
    body('expires_in')
      .optional()
      .isInt({ min: 300, max: 86400 })
      .withMessage('expires_in muss zwischen 300 und 86400 Sekunden liegen'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { exportId } = req.params;
      const { file_type, expires_in = 3600 } = req.body;

      // Export-Berechtigung prüfen
      const { data: exportData, error } = await supabase
        .from('daily_exports')
        .select('*')
        .eq('id', exportId)
        .eq('tenant_id', req.user.tenant_id)
        .eq('status', 'COMPLETED')
        .single();

      if (error || !exportData) {
        return res.status(404).json({
          success: false,
          message: 'Export nicht gefunden oder nicht verfügbar',
        });
      }

      // S3-Key für Dateityp ermitteln
      let s3Key;
      let filename;

      switch (file_type) {
        case 'pdf':
          s3Key = exportData.pdf_s3_key;
          filename = `cleandoc_daily_report_${exportData.report_date}.pdf`;
          break;
        case 'zip':
          s3Key = exportData.zip_s3_key;
          filename = `cleandoc_export_${exportData.report_date}.zip`;
          break;
        case 'csv_logs':
          s3Key = exportData.csv_logs_s3_key;
          filename = `cleandoc_logs_${exportData.report_date}_v1.csv`;
          break;
        case 'csv_steps':
          s3Key = exportData.csv_steps_s3_key;
          filename = `cleandoc_log_steps_${exportData.report_date}_v1.csv`;
          break;
        case 'csv_photos':
          s3Key = exportData.csv_photos_s3_key;
          filename = `cleandoc_log_photos_${exportData.report_date}_v1.csv`;
          break;
        case 'manifest':
          s3Key = exportData.manifest_s3_key;
          filename = `cleandoc_manifest_${exportData.report_date}.json`;
          break;
        case 'checksums':
          s3Key = exportData.checksums_s3_key;
          filename = `cleandoc_checksums_${exportData.report_date}.txt`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Ungültiger Dateityp',
          });
      }

      if (!s3Key) {
        return res.status(404).json({
          success: false,
          message: 'Datei nicht verfügbar',
        });
      }

      // Pre-signed URL generieren
      const urlData = await s3StorageService.generatePresignedUrl(s3Key, expires_in, filename);

      // Download-Event loggen
      await supabase.rpc('log_audit_event', {
        p_tenant_id: req.user.tenant_id,
        p_actor_user_id: req.user.id,
        p_action: 'EXPORT_DOWNLOADED',
        p_target_type: 'daily_exports',
        p_target_id: exportId,
        p_metadata: { file_type, filename },
      });

      res.json({
        success: true,
        download_url: urlData.download_url,
        expires_at: urlData.expires_at,
        filename: filename,
        file_type: file_type,
      });
    } catch (error) {
      console.error('Generate download URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Generieren der Download-URL',
      });
    }
  }
);

// ============================================================================
// STATISTICS & MONITORING
// ============================================================================

/**
 * GET /api/exports/stats
 * Export-Statistiken für Dashboard
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Paralelle Queries für bessere Performance
    const [{ data: exports }, { data: storageStats }, { data: recentActivity }] = await Promise.all(
      [
        // Basis-Statistiken
        supabase
          .from('daily_exports')
          .select('status, total_size_bytes, processing_time_ms, report_date')
          .eq('tenant_id', tenantId)
          .gte(
            'report_date',
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          ),

        // Storage-Verbrauch
        s3StorageService.getStorageStats(tenantId),

        // Aktuelle Aktivität
        supabase
          .from('audit_events')
          .select('action, occurred_at, metadata')
          .eq('tenant_id', tenantId)
          .eq('action', 'EXPORT_DOWNLOADED')
          .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('occurred_at', { ascending: false })
          .limit(10),
      ]
    );

    const stats = {
      total_exports: exports?.length || 0,
      successful_exports: exports?.filter(e => e.status === 'COMPLETED').length || 0,
      failed_exports: exports?.filter(e => e.status === 'FAILED').length || 0,
      total_size_gb: (
        (exports?.reduce((sum, e) => sum + (e.total_size_bytes || 0), 0) || 0) /
        1024 /
        1024 /
        1024
      ).toFixed(2),
      avg_processing_time_seconds:
        exports?.length > 0
          ? Math.round(
              exports.reduce((sum, e) => sum + (e.processing_time_ms || 0), 0) /
                exports.length /
                1000
            )
          : 0,
      last_export_date: exports?.[0]?.report_date || null,
      downloads_last_week: recentActivity?.length || 0,
      storage_stats: storageStats || {},
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get export stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
    });
  }
});

// ============================================================================
// ADMINISTRATION
// ============================================================================

/**
 * POST /api/exports/schedule/run
 * Manuell alle ausstehenden Exporte ausführen (Admin only)
 */
router.post('/schedule/run', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const results = await exportOrchestrator.runDailyExportSchedule();

    res.json({
      success: true,
      message: 'Export-Schedule ausgeführt',
      results: results,
    });
  } catch (error) {
    console.error('Run export schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen des Export-Schedules',
    });
  }
});

/**
 * POST /api/exports/cleanup/retention
 * Retention-Cleanup ausführen (Admin only)
 */
router.post('/cleanup/retention', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const results = await exportOrchestrator.runRetentionCleanup();

    res.json({
      success: true,
      message: 'Retention-Cleanup ausgeführt',
      results: results,
    });
  } catch (error) {
    console.error('Run retention cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen des Retention-Cleanups',
    });
  }
});

/**
 * DELETE /api/exports/:exportId
 * Export löschen (Admin only)
 */
router.delete(
  '/:exportId',
  requireAuth,
  requireRole(['admin']),
  [param('exportId').isUUID().withMessage('Ungültige Export-ID')],
  async (req, res) => {
    try {
      const { exportId } = req.params;

      // Export-Daten für Cleanup laden
      const { data: exportData, error } = await supabase
        .from('daily_exports')
        .select('*')
        .eq('id', exportId)
        .eq('tenant_id', req.user.tenant_id)
        .single();

      if (error || !exportData) {
        return res.status(404).json({
          success: false,
          message: 'Export nicht gefunden',
        });
      }

      // S3-Dateien löschen
      const s3Keys = [
        exportData.pdf_s3_key,
        exportData.csv_logs_s3_key,
        exportData.csv_steps_s3_key,
        exportData.csv_photos_s3_key,
        exportData.manifest_s3_key,
        exportData.checksums_s3_key,
        exportData.zip_s3_key,
      ].filter(Boolean);

      if (s3Keys.length > 0) {
        await s3StorageService.deleteFiles(s3Keys);
      }

      // DB-Record löschen
      await supabase.from('daily_exports').delete().eq('id', exportId);

      // Audit-Event
      await supabase.rpc('log_audit_event', {
        p_tenant_id: req.user.tenant_id,
        p_actor_user_id: req.user.id,
        p_action: 'EXPORT_DELETED',
        p_target_type: 'daily_exports',
        p_target_id: exportId,
        p_metadata: { report_date: exportData.report_date },
      });

      res.json({
        success: true,
        message: 'Export erfolgreich gelöscht',
      });
    } catch (error) {
      console.error('Delete export error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Exports',
      });
    }
  }
);

// Error Handler
router.use((error, req, res, next) => {
  console.error('Export API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler',
    error_code: 'INTERNAL_ERROR',
  });
});

export default router;
