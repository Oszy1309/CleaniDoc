/**
 * Export Orchestrator - Zentrale Steuerung des HACCP-Export-Systems
 * Kombiniert alle Services für vollständigen Export-Workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import csvExportService from './csvExportService';
import s3StorageService from './s3StorageService';
import deliveryService from './deliveryService';
import { supabase } from '../lib/supabase';

class ExportOrchestrator {
  constructor() {
    this.processingSemaphore = new Map(); // Verhindert doppelte Exports
  }

  /**
   * Haupteinstiegspunkt für täglichen Export
   */
  async generateDailyExport(tenantId, reportDate, options = {}) {
    const exportId = uuidv4();
    const processKey = `${tenantId}-${reportDate}`;

    // Prüfe ob bereits in Bearbeitung
    if (this.processingSemaphore.has(processKey)) {
      throw new Error(`Export für ${reportDate} bereits in Bearbeitung`);
    }

    this.processingSemaphore.set(processKey, exportId);

    try {
      // Export-Record erstellen
      const exportRecord = await this.createExportRecord(tenantId, reportDate, exportId);

      // Tenant-Einstellungen laden
      const tenantSettings = await this.loadTenantSettings(tenantId);

      // Logging-Daten laden
      const logsData = await this.loadDailyLogs(tenantId, reportDate);

      // Validierung
      csvExportService.validateExportData(logsData);

      const processingStartTime = Date.now();

      // 1. CSV-Exporte generieren
      await this.updateExportStatus(exportId, 'PROCESSING', 'Generating CSV exports...');
      const csvExports = await csvExportService.generateDailyCSVExport(
        tenantId,
        reportDate,
        logsData
      );

      // 2. PDF-Report generieren
      await this.updateExportStatus(exportId, 'PROCESSING', 'Generating PDF report...');
      const pdfData = await this.generatePDFReport(tenantId, reportDate, logsData, tenantSettings);

      // 3. Manifest und Checksums erstellen
      const manifest = csvExportService.generateManifest(reportDate, tenantId, csvExports, {
        pdf_report: {
          filename: `cleandoc_daily_report_${reportDate}.pdf`,
          size_bytes: pdfData.size,
          sha256: pdfData.sha256,
          content_type: 'application/pdf',
        },
      });

      const checksums = csvExportService.generateChecksums(csvExports, {
        pdf_report: pdfData,
        manifest: manifest,
      });

      // 4. ZIP-Archiv erstellen
      const zipBuffer = await s3StorageService.createZipArchive({
        csvs: csvExports,
        manifest: manifest,
        checksums: checksums,
      });

      // 5. S3 Upload
      await this.updateExportStatus(exportId, 'PROCESSING', 'Uploading to cloud storage...');
      const uploadResults = await s3StorageService.uploadDailyExport(tenantId, reportDate, {
        pdf: { buffer: pdfData.buffer, size: pdfData.size, sha256: pdfData.sha256 },
        csvs: csvExports,
        manifest: manifest,
        checksums: checksums,
        zipBuffer: zipBuffer,
      });

      // 6. Download-URLs generieren
      const downloadUrls = await s3StorageService.generateExportDownloadUrls(uploadResults);

      // 7. Export-Record aktualisieren
      const processingTime = Date.now() - processingStartTime;
      const exportStats = csvExportService.generateExportStats(logsData);

      await this.updateExportRecord(exportId, {
        status: 'COMPLETED',
        ...uploadResults,
        ...exportStats,
        total_size_bytes: Object.values(uploadResults).reduce(
          (sum, file) => sum + (file.size || 0),
          0
        ),
        processing_time_ms: processingTime,
        processing_completed_at: new Date().toISOString(),
      });

      // 8. Delivery (E-Mail, SFTP, Webhook)
      if (!options.skipDelivery) {
        await this.updateExportStatus(exportId, 'PROCESSING', 'Delivering exports...');

        const deliveryResults = await deliveryService.deliverDailyExport(
          tenantId,
          {
            exportId,
            reportDate,
            summary: exportStats,
            pdf: pdfData,
            csvs: csvExports,
            manifest: manifest,
            zipBuffer: zipBuffer,
          },
          tenantSettings,
          downloadUrls
        );

        // Delivery-Status speichern
        await this.updateDeliveryStatus(exportId, deliveryResults);
      }

      // 9. Audit-Event loggen
      await this.logAuditEvent(tenantId, 'EXPORT_COMPLETED', exportId, {
        report_date: reportDate,
        processing_time_ms: processingTime,
        total_logs: exportStats.total_logs,
        delivery_methods: Object.keys(tenantSettings).filter(
          k => k.startsWith('smtp_') || k.startsWith('sftp_') || k.startsWith('webhook_')
        ).length,
      });

      return {
        success: true,
        export_id: exportId,
        download_urls: downloadUrls,
        stats: exportStats,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      // Fehler-Behandlung
      await this.handleExportError(exportId, error);
      throw error;
    } finally {
      // Cleanup
      this.processingSemaphore.delete(processKey);
    }
  }

  /**
   * PDF-Report generieren (mit Puppeteer/Playwright)
   */
  async generatePDFReport(tenantId, reportDate, logsData, tenantSettings) {
    try {
      const puppeteer = require('puppeteer');

      // Browser starten
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // PDF-Template HTML generieren
      const htmlContent = await this.generatePDFHTML(logsData, tenantSettings, reportDate);

      // HTML in Browser laden
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '12mm',
          right: '15mm',
          bottom: '14mm',
          left: '15mm',
        },
      });

      await browser.close();

      // SHA-256 berechnen
      const sha256 = s3StorageService.calculateSHA256(pdfBuffer);

      return {
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        sha256: sha256,
        filename: `cleandoc_daily_report_${reportDate}.pdf`,
      };
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * PDF HTML-Template generieren
   */
  async generatePDFHTML(logsData, tenantSettings, reportDate) {
    // React-Template serverseitig rendern
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');
    const PDFReportTemplate = require('../components/export/PDFReportTemplate').default;

    // Signaturen laden
    const signatures = await this.loadSignatures(logsData.map(l => l.id));

    const reportData = {
      reportDate,
      logs: logsData,
      customer: tenantSettings,
      summary: csvExportService.generateExportStats(logsData),
      exportId: uuidv4(),
    };

    const reactElement = React.createElement(PDFReportTemplate, {
      reportData,
      tenantSettings,
      signatures,
      isPreview: false,
    });

    const htmlBody = ReactDOMServer.renderToStaticMarkup(reactElement);

    // Vollständiges HTML-Dokument
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HACCP-Protokoll ${reportDate}</title>
      <style>
        ${await this.loadPrintCSS()}
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
    `;
  }

  /**
   * Print-CSS laden
   */
  async loadPrintCSS() {
    const fs = require('fs');
    const path = require('path');

    const cssFiles = [
      '../styles/DesignSystem.css',
      '../styles/PrintPDF.css',
      '../components/export/PDFReportTemplate.css',
    ];

    let combinedCSS = '';

    for (const cssFile of cssFiles) {
      try {
        const cssPath = path.resolve(__dirname, cssFile);
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        combinedCSS += cssContent + '\n';
      } catch (error) {
        console.warn(`Could not load CSS file: ${cssFile}`);
      }
    }

    return combinedCSS;
  }

  /**
   * Tägliche Logs laden
   */
  async loadDailyLogs(tenantId, reportDate) {
    try {
      const { data: logs, error } = await supabase
        .from('cleaning_logs')
        .select(
          `
          id,
          customer_id,
          area_name,
          status,
          started_at,
          completed_at,
          created_by,
          worker:workers!cleaning_logs_created_by_fkey (
            id,
            first_name,
            last_name
          ),
          cleaning_plan:cleaning_plans!cleaning_logs_cleaning_plan_id_fkey (
            id,
            area,
            steps
          ),
          steps:cleaning_log_steps (
            id,
            name,
            description,
            chemical,
            dwell_time_seconds,
            status,
            notes,
            completed_at,
            completed_by,
            worker:workers!cleaning_log_steps_completed_by_fkey (
              first_name,
              last_name
            ),
            photos:log_step_photos (
              id,
              s3_key,
              width,
              height,
              content_type,
              taken_at,
              sha256_hash
            )
          )
        `
        )
        .eq('customer_id', tenantId)
        .gte('started_at', `${reportDate}T00:00:00Z`)
        .lt('started_at', `${reportDate}T23:59:59Z`)
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Daten für Export aufbereiten
      return (logs || []).map(log => ({
        id: log.id,
        customer_id: log.customer_id,
        area_name: log.area_name || log.cleaning_plan?.area,
        status: log.status,
        started_at: log.started_at,
        completed_at: log.completed_at,
        duration_minutes:
          log.started_at && log.completed_at
            ? Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 60000)
            : null,
        created_by: log.created_by,
        worker: log.worker,
        cleaning_plan: log.cleaning_plan,
        steps: (log.steps || []).map(step => ({
          id: step.id,
          name: step.name || step.description,
          chemical: step.chemical,
          dwell_time: step.dwell_time_seconds,
          status: step.status,
          notes: step.notes,
          completed_at: step.completed_at,
          completed_by: step.completed_by,
          worker_name: step.worker ? `${step.worker.first_name} ${step.worker.last_name}` : null,
          photos: step.photos || [],
        })),
      }));
    } catch (error) {
      throw new Error(`Failed to load daily logs: ${error.message}`);
    }
  }

  /**
   * Tenant-Einstellungen laden
   */
  async loadTenantSettings(tenantId) {
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found ist OK
        throw error;
      }

      // Fallback für fehlende Einstellungen
      return (
        data || {
          tenant_id: tenantId,
          company_legal: 'CleaniDoc Kunde',
          brand_primary: '#1e40af',
          daily_email_time: '06:00',
          email_recipients: [],
          retention_days: 730,
        }
      );
    } catch (error) {
      throw new Error(`Failed to load tenant settings: ${error.message}`);
    }
  }

  /**
   * Signaturen laden
   */
  async loadSignatures(logIds) {
    try {
      if (!logIds || logIds.length === 0) return [];

      const { data, error } = await supabase
        .from('log_signatures')
        .select(
          `
          log_id,
          signed_role,
          signed_at,
          signed_by_user_id,
          worker:workers!log_signatures_signed_by_user_id_fkey (
            first_name,
            last_name
          )
        `
        )
        .in('log_id', logIds);

      if (error) throw error;

      return (data || []).map(sig => ({
        ...sig,
        signed_by_name: sig.worker
          ? `${sig.worker.first_name} ${sig.worker.last_name}`
          : 'Unbekannt',
      }));
    } catch (error) {
      console.warn('Failed to load signatures:', error.message);
      return [];
    }
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Export-Record erstellen
   */
  async createExportRecord(tenantId, reportDate, exportId) {
    try {
      const { data, error } = await supabase
        .from('daily_exports')
        .insert({
          id: exportId,
          tenant_id: tenantId,
          report_date: reportDate,
          status: 'PENDING',
          processing_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to create export record: ${error.message}`);
    }
  }

  /**
   * Export-Status aktualisieren
   */
  async updateExportStatus(exportId, status, message = null) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (message) {
        updates.error_message = message;
      }

      const { error } = await supabase.from('daily_exports').update(updates).eq('id', exportId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update export status:', error);
    }
  }

  /**
   * Export-Record vollständig aktualisieren
   */
  async updateExportRecord(exportId, updateData) {
    try {
      const { error } = await supabase
        .from('daily_exports')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId);

      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to update export record: ${error.message}`);
    }
  }

  /**
   * Delivery-Status aktualisieren
   */
  async updateDeliveryStatus(exportId, deliveryResults) {
    try {
      const updates = {};

      if (deliveryResults.email?.success) {
        updates.email_sent_at = deliveryResults.email.sent_at;
        updates.email_recipients = deliveryResults.email.recipients;
      }

      if (deliveryResults.sftp?.success) {
        updates.sftp_uploaded_at = deliveryResults.sftp.uploaded_at;
      }

      if (deliveryResults.webhook?.success) {
        updates.webhook_sent_at = deliveryResults.webhook.sent_at;
        updates.webhook_response_code = deliveryResults.webhook.response_code;
      }

      if (Object.keys(updates).length > 0) {
        await this.updateExportRecord(exportId, updates);
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }

  /**
   * Fehler-Behandlung
   */
  async handleExportError(exportId, error) {
    try {
      await this.updateExportStatus(exportId, 'FAILED', error.message);

      // Audit-Event loggen
      await supabase.rpc('log_audit_event', {
        p_tenant_id: null, // wird später ergänzt
        p_actor_user_id: null,
        p_action: 'EXPORT_FAILED',
        p_target_type: 'daily_exports',
        p_target_id: exportId,
        p_metadata: { error: error.message },
      });
    } catch (updateError) {
      console.error('Failed to handle export error:', updateError);
    }
  }

  /**
   * Audit-Event loggen
   */
  async logAuditEvent(tenantId, action, targetId, metadata = {}) {
    try {
      await supabase.rpc('log_audit_event', {
        p_tenant_id: tenantId,
        p_actor_user_id: null, // System-generiert
        p_action: action,
        p_target_type: 'daily_exports',
        p_target_id: targetId,
        p_metadata: metadata,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // ============================================================================
  // SCHEDULING & AUTOMATION
  // ============================================================================

  /**
   * Automatischer täglicher Export (Cron Job)
   */
  async runDailyExportSchedule() {
    try {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Alle Tenants mit aktiven Einstellungen laden
      const { data: tenants, error } = await supabase
        .from('tenant_settings')
        .select('tenant_id, daily_email_time, company_legal')
        .not('daily_email_time', 'is', null);

      if (error) throw error;

      const results = [];

      for (const tenant of tenants) {
        try {
          const result = await this.generateDailyExport(tenant.tenant_id, yesterday);
          results.push({ tenant_id: tenant.tenant_id, success: true, export_id: result.export_id });
        } catch (error) {
          results.push({ tenant_id: tenant.tenant_id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Daily export schedule failed: ${error.message}`);
    }
  }

  /**
   * Retention Cleanup
   */
  async runRetentionCleanup() {
    try {
      // Database Cleanup
      await supabase.rpc('cleanup_expired_exports');

      // S3 Cleanup für alle Tenants
      const { data: tenants } = await supabase
        .from('tenant_settings')
        .select('tenant_id, retention_days');

      const cleanupResults = [];

      for (const tenant of tenants || []) {
        try {
          const result = await s3StorageService.cleanupExpiredExports(
            tenant.tenant_id,
            tenant.retention_days || 730
          );
          cleanupResults.push({ tenant_id: tenant.tenant_id, ...result });
        } catch (error) {
          cleanupResults.push({ tenant_id: tenant.tenant_id, error: error.message });
        }
      }

      return cleanupResults;
    } catch (error) {
      throw new Error(`Retention cleanup failed: ${error.message}`);
    }
  }
}

export default new ExportOrchestrator();
