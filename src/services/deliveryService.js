/**
 * Delivery Service für HACCP-Exporte
 * E-Mail, SFTP und Webhook-Versand mit Retry-Logik
 */

import nodemailer from 'nodemailer';
import SftpClient from 'ssh2-sftp-client';
// Removed crypto import - not needed in browser environment
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

class DeliveryService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelayMs = 5000; // 5 Sekunden initial
  }

  /**
   * Haupteinstiegspunkt für Export-Delivery
   */
  async deliverDailyExport(tenantId, exportData, tenantSettings, downloadUrls) {
    const deliveryResults = {
      email: { attempted: false, success: false, error: null, sent_at: null },
      sftp: { attempted: false, success: false, error: null, uploaded_at: null },
      webhook: {
        attempted: false,
        success: false,
        error: null,
        sent_at: null,
        response_code: null,
      },
    };

    // E-Mail Versand
    if (tenantSettings.email_recipients && tenantSettings.email_recipients.length > 0) {
      deliveryResults.email = await this.sendEmailDelivery(
        tenantSettings,
        exportData,
        downloadUrls
      );
    }

    // SFTP Upload
    if (tenantSettings.sftp_host) {
      deliveryResults.sftp = await this.uploadToSftp(tenantSettings, exportData);
    }

    // Webhook Notification
    if (tenantSettings.webhook_url) {
      deliveryResults.webhook = await this.sendWebhookNotification(
        tenantSettings,
        exportData,
        downloadUrls
      );
    }

    return deliveryResults;
  }

  /**
   * E-Mail Versand mit PDF + ZIP Anhang
   */
  async sendEmailDelivery(tenantSettings, exportData, downloadUrls) {
    try {
      const transporter = await this.createEmailTransporter(tenantSettings);

      const emailContent = this.generateEmailContent(exportData, downloadUrls);

      const attachments = [];

      // PDF Anhang
      if (exportData.pdf && exportData.pdf.buffer) {
        attachments.push({
          filename: `cleandoc_daily_report_${exportData.reportDate}.pdf`,
          content: exportData.pdf.buffer,
          contentType: 'application/pdf',
        });
      }

      // ZIP Anhang (CSV + Manifest)
      if (exportData.zipBuffer) {
        attachments.push({
          filename: `cleandoc_export_${exportData.reportDate}.zip`,
          content: exportData.zipBuffer,
          contentType: 'application/zip',
        });
      }

      const mailOptions = {
        from: tenantSettings.smtp_from || `"CleaniDoc System" <noreply@cleanidoc.de>`,
        to: tenantSettings.email_recipients.join(', '),
        subject: `HACCP-Protokoll ${format(new Date(exportData.reportDate), 'dd.MM.yyyy', { locale: de })} - ${tenantSettings.company_legal}`,
        html: emailContent.html,
        text: emailContent.text,
        attachments,
        headers: {
          'X-CleaniDoc-Export-ID': exportData.exportId,
          'X-CleaniDoc-Report-Date': exportData.reportDate,
          'X-CleaniDoc-Tenant': tenantSettings.tenant_id,
        },
      };

      const result = await this.retryOperation(
        () => transporter.sendMail(mailOptions),
        this.maxRetries
      );

      return {
        attempted: true,
        success: true,
        error: null,
        sent_at: new Date().toISOString(),
        message_id: result.messageId,
        recipients: tenantSettings.email_recipients,
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        error: error.message,
        sent_at: null,
      };
    }
  }

  /**
   * SFTP Upload
   */
  async uploadToSftp(tenantSettings, exportData) {
    let sftp = null;

    try {
      sftp = new SftpClient();

      const connectionConfig = {
        host: tenantSettings.sftp_host,
        port: tenantSettings.sftp_port || 22,
        username: tenantSettings.sftp_user,
        privateKey: tenantSettings.sftp_private_key, // oder password
        readyTimeout: 30000,
      };

      await sftp.connect(connectionConfig);

      const remotePath = tenantSettings.sftp_path || '/incoming/cleanidoc';
      const dateFolder = `${remotePath}/${exportData.reportDate}`;

      // Verzeichnis erstellen falls nicht vorhanden
      await sftp.mkdir(dateFolder, true);

      const uploads = [];

      // PDF Upload
      if (exportData.pdf && exportData.pdf.buffer) {
        const pdfPath = `${dateFolder}/cleandoc_daily_report_${exportData.reportDate}.pdf`;
        await sftp.put(exportData.pdf.buffer, pdfPath);
        uploads.push(pdfPath);
      }

      // CSV Uploads
      if (exportData.csvs) {
        for (const [type, csvData] of Object.entries(exportData.csvs)) {
          const csvPath = `${dateFolder}/${csvData.filename}`;
          await sftp.put(Buffer.from(csvData.content, 'utf8'), csvPath);
          uploads.push(csvPath);
        }
      }

      // Manifest Upload
      if (exportData.manifest) {
        const manifestPath = `${dateFolder}/${exportData.manifest.filename}`;
        await sftp.put(Buffer.from(exportData.manifest.content, 'utf8'), manifestPath);
        uploads.push(manifestPath);
      }

      // ZIP Upload
      if (exportData.zipBuffer) {
        const zipPath = `${dateFolder}/cleandoc_export_${exportData.reportDate}.zip`;
        await sftp.put(exportData.zipBuffer, zipPath);
        uploads.push(zipPath);
      }

      await sftp.end();

      return {
        attempted: true,
        success: true,
        error: null,
        uploaded_at: new Date().toISOString(),
        uploaded_files: uploads,
      };
    } catch (error) {
      if (sftp) {
        try {
          await sftp.end();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      return {
        attempted: true,
        success: false,
        error: error.message,
        uploaded_at: null,
      };
    }
  }

  /**
   * Webhook Notification mit HMAC Signatur
   */
  async sendWebhookNotification(tenantSettings, exportData, downloadUrls) {
    try {
      const payload = this.generateWebhookPayload(exportData, downloadUrls, tenantSettings);
      const payloadString = JSON.stringify(payload);

      // HMAC Signatur berechnen
      const signature = this.calculateHMAC(payloadString, tenantSettings.webhook_hmac_secret);

      const response = await this.retryOperation(
        () =>
          fetch(tenantSettings.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CleaniDoc-Signature': `sha256=${signature}`,
              'X-CleaniDoc-Event': 'daily_export_completed',
              'X-CleaniDoc-Version': '1.0',
              'User-Agent': 'CleaniDoc-Export-System/2.0',
            },
            body: payloadString,
            timeout: 30000,
          }),
        this.maxRetries
      );

      const responseBody = await response.text();

      return {
        attempted: true,
        success: response.ok,
        error: response.ok ? null : `HTTP ${response.status}: ${responseBody}`,
        sent_at: new Date().toISOString(),
        response_code: response.status,
        response_body: responseBody.substring(0, 500), // Begrenzt für Logging
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        error: error.message,
        sent_at: null,
        response_code: null,
      };
    }
  }

  // ============================================================================
  // EMAIL HELPERS
  // ============================================================================

  /**
   * E-Mail Transporter erstellen
   */
  async createEmailTransporter(tenantSettings) {
    const config = {
      host: tenantSettings.smtp_host,
      port: tenantSettings.smtp_port || 587,
      secure: tenantSettings.smtp_port === 465, // true für 465, false für andere Ports
      auth: {
        user: tenantSettings.smtp_user,
        pass: tenantSettings.smtp_password, // Aus sicherem Store
      },
      tls: {
        rejectUnauthorized: false, // Für self-signed certificates
      },
    };

    if (tenantSettings.smtp_use_tls) {
      config.requireTLS = true;
    }

    const transporter = nodemailer.createTransporter(config);

    // Verbindung testen
    await transporter.verify();

    return transporter;
  }

  /**
   * E-Mail Content generieren
   */
  generateEmailContent(exportData, downloadUrls) {
    const reportDateFormatted = format(new Date(exportData.reportDate), 'dd.MM.yyyy', {
      locale: de,
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .downloads { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        .btn { background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; }
        .stats { display: inline-block; margin: 0 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧽 HACCP-Protokoll ${reportDateFormatted}</h1>
        <p>Automatischer Export - CleaniDoc System</p>
      </div>

      <div class="content">
        <p>Sehr geehrte Damen und Herren,</p>

        <p>anbei erhalten Sie das tägliche HACCP-Reinigungsprotokoll für den <strong>${reportDateFormatted}</strong>.</p>

        <div class="summary">
          <h3>📊 Zusammenfassung</h3>
          <div class="stats">
            <strong>Protokolle:</strong> ${exportData.summary?.total_logs || 0}
          </div>
          <div class="stats">
            <strong>Abgeschlossen:</strong> ${exportData.summary?.completed_logs || 0}
          </div>
          <div class="stats">
            <strong>Schritte:</strong> ${exportData.summary?.total_steps || 0}
          </div>
          <div class="stats">
            <strong>Fotos:</strong> ${exportData.summary?.total_photos || 0}
          </div>
        </div>

        <h3>📎 Anhänge</h3>
        <ul>
          <li><strong>PDF-Protokoll:</strong> Druckfertiges HACCP-Protokoll mit allen Details und Signaturen</li>
          <li><strong>CSV-Export-Paket:</strong> Maschinenlesbare Daten für Ihre IT-Systeme (ZIP-Archiv)</li>
        </ul>

        ${
          downloadUrls
            ? `
        <div class="downloads">
          <h3>🔗 Download-Links (24h gültig)</h3>
          <p>Falls die Anhänge zu groß sind, nutzen Sie diese sicheren Download-Links:</p>
          ${downloadUrls.pdf ? `<a href="${downloadUrls.pdf.download_url}" class="btn">📄 PDF herunterladen</a>` : ''}
          ${downloadUrls.zip ? `<a href="${downloadUrls.zip.download_url}" class="btn">📦 ZIP herunterladen</a>` : ''}
        </div>
        `
            : ''
        }

        <h3>💾 CSV-Datenformat</h3>
        <p>Das ZIP-Archiv enthält maschinenlesbare CSV-Dateien:</p>
        <ul>
          <li><code>cleandoc_logs_*.csv</code> - Hauptprotokolle mit Zeitstempel</li>
          <li><code>cleandoc_log_steps_*.csv</code> - Detaillierte Reinigungsschritte</li>
          <li><code>cleandoc_log_photos_*.csv</code> - Foto-Metadaten</li>
          <li><code>cleandoc_manifest_*.json</code> - Vollständige Metadaten</li>
          <li><code>README.txt</code> - Import-Anleitung</li>
        </ul>

        <p><strong>Import-Hinweise:</strong> UTF-8 Kodierung, Semikolon-Trennzeichen, erste Zeile = Spaltennamen</p>

        <div class="summary">
          <h3>🔒 Datenschutz & Compliance</h3>
          <ul>
            <li>✅ HACCP-Richtlinien eingehalten</li>
            <li>✅ DSGVO-konforme Verarbeitung</li>
            <li>✅ Verschlüsselte Speicherung (AES-256)</li>
            <li>✅ SHA-256 Prüfsummen für Integrität</li>
            <li>✅ Aufbewahrung: 24 Monate</li>
          </ul>
        </div>

        <p>Bei Fragen zum Import oder technischen Problemen kontaktieren Sie gerne unseren Support.</p>

        <p>Mit freundlichen Grüßen<br>
        Ihr CleaniDoc Team</p>
      </div>

      <div class="footer">
        <p>CleaniDoc Export System v2.0 | Export-ID: ${exportData.exportId}</p>
        <p>Support: support@cleanidoc.de | Dokumentation: https://docs.cleanidoc.de</p>
        <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
      </div>
    </body>
    </html>
    `;

    const text = `
HACCP-Protokoll ${reportDateFormatted}
====================================

Sehr geehrte Damen und Herren,

anbei erhalten Sie das tägliche HACCP-Reinigungsprotokoll für den ${reportDateFormatted}.

ZUSAMMENFASSUNG:
- Protokolle: ${exportData.summary?.total_logs || 0}
- Abgeschlossen: ${exportData.summary?.completed_logs || 0}
- Schritte: ${exportData.summary?.total_steps || 0}
- Fotos: ${exportData.summary?.total_photos || 0}

ANHÄNGE:
- PDF-Protokoll: Druckfertiges HACCP-Protokoll
- CSV-Export-Paket: Maschinenlesbare Daten (ZIP)

CSV-IMPORT:
- Kodierung: UTF-8
- Trennzeichen: Semikolon (;)
- Erste Zeile: Spaltennamen

Bei Fragen: support@cleanidoc.de

Mit freundlichen Grüßen
Ihr CleaniDoc Team

Export-ID: ${exportData.exportId}
System: CleaniDoc Export v2.0
    `;

    return { html, text };
  }

  // ============================================================================
  // WEBHOOK HELPERS
  // ============================================================================

  /**
   * Webhook Payload generieren
   */
  generateWebhookPayload(exportData, downloadUrls, tenantSettings) {
    return {
      event: 'daily_export_completed',
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenant_id: tenantSettings.tenant_id,
      export_id: exportData.exportId,
      report_date: exportData.reportDate,

      summary: exportData.summary || {
        total_logs: 0,
        completed_logs: 0,
        failed_logs: 0,
        total_steps: 0,
        total_photos: 0,
        total_size_bytes: 0,
      },

      files: this.buildFilesSection(exportData, downloadUrls),

      tenant_info: {
        company_name: tenantSettings.company_legal,
        location: tenantSettings.company_location || '',
      },

      compliance: {
        haccp_requirements_met: true,
        signature_count: exportData.signatures?.length || 0,
        audit_trail_complete: true,
        retention_expires_at: this.calculateRetentionDate(
          exportData.reportDate,
          tenantSettings.retention_days
        ),
      },

      metadata: {
        export_generated_by: 'cleanidoc-system',
        export_version: '2.0.1',
        processing_time_ms: exportData.processing_time_ms || 0,
        region: process.env.AWS_REGION || 'eu-central-1',
      },
    };
  }

  /**
   * Files Section für Webhook aufbauen
   */
  buildFilesSection(exportData, downloadUrls) {
    const files = {};

    if (downloadUrls?.pdf) {
      files.pdf_report = {
        filename: `cleandoc_daily_report_${exportData.reportDate}.pdf`,
        size_bytes: exportData.pdf?.size || 0,
        sha256: exportData.pdf?.sha256 || '',
        download_url: downloadUrls.pdf.download_url,
        expires_at: downloadUrls.pdf.expires_at,
      };
    }

    if (downloadUrls?.csv_logs && exportData.csvs?.logs) {
      files.csv_logs = {
        filename: exportData.csvs.logs.filename,
        size_bytes: exportData.csvs.logs.size,
        sha256: exportData.csvs.logs.sha256,
        download_url: downloadUrls.csv_logs.download_url,
        expires_at: downloadUrls.csv_logs.expires_at,
      };
    }

    // Weitere Dateien analog...

    return files;
  }

  /**
   * HMAC Signatur berechnen
   */
  calculateHMAC(payload, secret) {
    if (!secret) {
      throw new Error('HMAC secret is required for webhook signatures');
    }

    return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Retry-Logik für fehlschlagende Operationen
   */
  async retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Retention Date berechnen
   */
  calculateRetentionDate(reportDate, retentionDays = 730) {
    const date = new Date(reportDate);
    date.setDate(date.getDate() + retentionDays);
    return date.toISOString();
  }

  /**
   * Delivery-Statistiken
   */
  generateDeliveryStats(deliveryResults) {
    return {
      total_methods: Object.keys(deliveryResults).length,
      successful_deliveries: Object.values(deliveryResults).filter(r => r.success).length,
      failed_deliveries: Object.values(deliveryResults).filter(r => r.attempted && !r.success)
        .length,
      not_attempted: Object.values(deliveryResults).filter(r => !r.attempted).length,
    };
  }
}

export default new DeliveryService();
