/**
 * Cron Job Scheduler für automatisierte HACCP-Exports
 * Läuft täglich um 2:00 Uhr und führt Cleanup am Sonntag um 3:00 Uhr durch
 */

import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import HaccpExportService from '../services/haccpExportService.js';
import s3StorageService from '../services/s3StorageService.js';

class ExportScheduler {
  constructor() {
    this.haccpExportService = new HaccpExportService();
    this.isRunning = false;
  }

  /**
   * Startet alle Cron Jobs
   */
  start() {
    if (this.isRunning) {
      console.log('Export scheduler already running');
      return;
    }

    console.log('Starting HACCP export scheduler...');

    // Täglicher Export um 2:00 Uhr
    this.dailyExportJob = cron.schedule(
      process.env.DAILY_EXPORT_CRON || '0 2 * * *',
      async () => {
        console.log('Starting daily HACCP export job...');
        await this.runDailyExports();
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    );

    // Wöchentlicher Cleanup am Sonntag um 3:00 Uhr
    this.cleanupJob = cron.schedule(
      process.env.CLEANUP_CRON || '0 3 * * 0',
      async () => {
        console.log('Starting weekly cleanup job...');
        await this.runCleanup();
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    );

    this.isRunning = true;
    console.log('Export scheduler started successfully');
  }

  /**
   * Stoppt alle Cron Jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('Export scheduler not running');
      return;
    }

    if (this.dailyExportJob) {
      this.dailyExportJob.stop();
    }

    if (this.cleanupJob) {
      this.cleanupJob.stop();
    }

    this.isRunning = false;
    console.log('Export scheduler stopped');
  }

  /**
   * Führt tägliche Exports für alle Tenants durch
   */
  async runDailyExports() {
    try {
      console.log('Starting daily export process...');

      // Alle aktiven Tenants mit Export-Einstellungen abrufen
      const { data: tenants, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('export_enabled', true)
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to fetch tenants: ${error.message}`);
      }

      if (!tenants || tenants.length === 0) {
        console.log('No active tenants with exports enabled');
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const reportDate = yesterday.toISOString().split('T')[0];

      console.log(`Processing exports for ${tenants.length} tenants for date: ${reportDate}`);

      // Sequenziell durch alle Tenants iterieren
      for (const tenant of tenants) {
        try {
          console.log(`Processing export for tenant: ${tenant.tenant_id}`);

          // Prüfen ob Export bereits existiert
          const { data: existingExport } = await supabase
            .from('daily_exports')
            .select('id')
            .eq('tenant_id', tenant.tenant_id)
            .eq('report_date', reportDate)
            .single();

          if (existingExport) {
            console.log(`Export already exists for tenant ${tenant.tenant_id}, skipping`);
            continue;
          }

          // Export durchführen
          const result = await this.haccpExportService.generateDailyExport(
            tenant.tenant_id,
            reportDate,
            {
              include_pdf: tenant.export_pdf,
              include_csv: tenant.export_csv,
              delivery_channels: tenant.delivery_channels || ['storage'],
            }
          );

          console.log(`Successfully processed export for tenant ${tenant.tenant_id}:`, {
            files: Object.keys(result.uploads).length,
            size: this.formatBytes(
              Object.values(result.uploads).reduce((sum, upload) => sum + (upload.size || 0), 0)
            ),
          });

          // Kurze Pause zwischen Tenants um Server nicht zu überlasten
          await this.sleep(1000);
        } catch (error) {
          console.error(`Failed to process export for tenant ${tenant.tenant_id}:`, error);

          // Fehler-Audit-Log erstellen
          await this.logAuditEvent(tenant.tenant_id, 'export_failed', {
            error: error.message,
            report_date: reportDate,
          });
        }
      }

      console.log('Daily export process completed');
    } catch (error) {
      console.error('Daily export process failed:', error);
      throw error;
    }
  }

  /**
   * Führt wöchentlichen Cleanup durch
   */
  async runCleanup() {
    try {
      console.log('Starting weekly cleanup process...');

      // Alle Tenants für Cleanup abrufen
      const { data: tenants, error } = await supabase
        .from('tenant_settings')
        .select('tenant_id, export_retention_days')
        .eq('active', true);

      if (error) {
        throw new Error(`Failed to fetch tenants for cleanup: ${error.message}`);
      }

      if (!tenants || tenants.length === 0) {
        console.log('No active tenants for cleanup');
        return;
      }

      let totalDeleted = 0;

      for (const tenant of tenants) {
        try {
          const retentionDays = tenant.export_retention_days || 730; // Default 2 Jahre

          console.log(
            `Cleaning up exports for tenant ${tenant.tenant_id} (retention: ${retentionDays} days)`
          );

          // S3 Cleanup
          const s3Result = await s3StorageService.cleanupExpiredExports(
            tenant.tenant_id,
            retentionDays
          );

          // Database Cleanup - Alte Export-Records löschen
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          const { data: deletedExports, error: deleteError } = await supabase
            .from('daily_exports')
            .delete()
            .eq('tenant_id', tenant.tenant_id)
            .lt('report_date', cutoffDate.toISOString().split('T')[0])
            .select('id');

          if (deleteError) {
            console.error(`Database cleanup failed for tenant ${tenant.tenant_id}:`, deleteError);
          } else {
            console.log(`Tenant ${tenant.tenant_id} cleanup completed:`, {
              s3_files_deleted: s3Result.deleted_count,
              db_records_deleted: deletedExports?.length || 0,
            });

            totalDeleted += s3Result.deleted_count + (deletedExports?.length || 0);
          }

          // Audit-Log für Cleanup
          await this.logAuditEvent(tenant.tenant_id, 'cleanup_completed', {
            s3_files_deleted: s3Result.deleted_count,
            db_records_deleted: deletedExports?.length || 0,
            retention_days: retentionDays,
          });
        } catch (error) {
          console.error(`Cleanup failed for tenant ${tenant.tenant_id}:`, error);

          await this.logAuditEvent(tenant.tenant_id, 'cleanup_failed', {
            error: error.message,
          });
        }
      }

      console.log(`Weekly cleanup completed. Total items deleted: ${totalDeleted}`);
    } catch (error) {
      console.error('Weekly cleanup process failed:', error);
      throw error;
    }
  }

  /**
   * Status der laufenden Jobs abrufen
   */
  getStatus() {
    return {
      running: this.isRunning,
      daily_export_job: this.dailyExportJob
        ? {
            running: this.dailyExportJob.running,
            options: this.dailyExportJob.options,
          }
        : null,
      cleanup_job: this.cleanupJob
        ? {
            running: this.cleanupJob.running,
            options: this.cleanupJob.options,
          }
        : null,
    };
  }

  /**
   * Manueller Export-Trigger (für Testing)
   */
  async triggerManualExport(tenantId, reportDate) {
    console.log(`Triggering manual export for tenant ${tenantId}, date: ${reportDate}`);

    return await this.haccpExportService.generateDailyExport(tenantId, reportDate);
  }

  /**
   * Utility: Audit-Event loggen
   */
  async logAuditEvent(tenantId, eventType, eventData = {}) {
    try {
      await supabase.from('audit_events').insert({
        tenant_id: tenantId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Utility: Bytes formatieren
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ExportScheduler();
