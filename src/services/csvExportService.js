/**
 * CSV Export Service für HACCP-Protokolle
 * Erzeugt maschinenlesbare CSV-Dateien nach Schema v1.0
 */

// Removed crypto import - not needed in browser environment
import { format, parseISO } from 'date-fns';

class CSVExportService {
  constructor() {
    this.delimiter = ';';
    this.encoding = 'utf-8';
    this.schemaVersion = 'v1';
  }

  /**
   * Haupteinstiegspunkt für täglichen CSV-Export
   */
  async generateDailyCSVExport(tenantId, reportDate, logsData) {
    try {
      const exports = {
        logs: await this.generateLogsCSV(tenantId, reportDate, logsData),
        steps: await this.generateStepsCSV(tenantId, reportDate, logsData),
        photos: await this.generatePhotosCSV(tenantId, reportDate, logsData),
      };

      // Prüfsummen berechnen
      exports.logs.sha256 = this.calculateSHA256(exports.logs.content);
      exports.steps.sha256 = this.calculateSHA256(exports.steps.content);
      exports.photos.sha256 = this.calculateSHA256(exports.photos.content);

      return exports;
    } catch (error) {
      throw new Error(`CSV Export failed: ${error.message}`);
    }
  }

  /**
   * Logs CSV - Hauptprotokolle
   */
  async generateLogsCSV(tenantId, reportDate, logsData) {
    const filename = `cleandoc_logs_${reportDate}_${this.schemaVersion}.csv`;

    const headers = [
      'report_date',
      'tenant_id',
      'log_id',
      'protocol_id',
      'customer_name',
      'site_name',
      'area_name',
      'status',
      'started_at',
      'completed_at',
      'duration_min',
      'created_by_user_id',
      'approved_by_user_id',
      'pdf_s3_key',
      'pdf_sha256',
      'record_version',
    ];

    const rows = logsData.map(log => [
      reportDate,
      tenantId,
      log.id,
      log.protocol_id || log.cleaning_plan_id,
      this.escapeCsvValue(log.customer?.name || ''),
      this.escapeCsvValue(log.customer?.location || log.site_name || ''),
      this.escapeCsvValue(log.area_name || log.cleaning_plan?.area || ''),
      log.status || 'pending',
      this.formatISO8601(log.started_at),
      this.formatISO8601(log.completed_at),
      this.calculateDurationMinutes(log.started_at, log.completed_at),
      log.created_by || log.worker_id,
      log.approved_by || '',
      log.pdf_s3_key || '',
      log.pdf_sha256 || '',
      1, // record_version
    ]);

    const content = this.buildCSVContent(headers, rows);

    return {
      filename,
      content,
      rowCount: rows.length,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  /**
   * Steps CSV - Detaillierte Reinigungsschritte
   */
  async generateStepsCSV(tenantId, reportDate, logsData) {
    const filename = `cleandoc_log_steps_${reportDate}_${this.schemaVersion}.csv`;

    const headers = [
      'report_date',
      'tenant_id',
      'log_id',
      'step_id',
      'step_seq',
      'step_name',
      'chemical',
      'dwell_time_s',
      'status',
      'notes',
      'completed_by_user_id',
      'completed_at',
      'photo_count',
    ];

    const rows = [];

    logsData.forEach(log => {
      if (!log.steps || !Array.isArray(log.steps)) return;

      log.steps.forEach((step, index) => {
        rows.push([
          reportDate,
          tenantId,
          log.id,
          step.id,
          step.sequence || index + 1,
          this.escapeCsvValue(step.name || step.description || ''),
          this.escapeCsvValue(step.chemical || step.cleaning_agent || ''),
          step.dwell_time || step.dwell_time_seconds || '',
          step.status || 'pending',
          this.escapeCsvValue(step.notes || ''),
          step.completed_by || step.worker_id || log.created_by,
          this.formatISO8601(step.completed_at),
          (step.photos && step.photos.length) || 0,
        ]);
      });
    });

    const content = this.buildCSVContent(headers, rows);

    return {
      filename,
      content,
      rowCount: rows.length,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  /**
   * Photos CSV - Foto-Metadaten
   */
  async generatePhotosCSV(tenantId, reportDate, logsData) {
    const filename = `cleandoc_log_photos_${reportDate}_${this.schemaVersion}.csv`;

    const headers = [
      'report_date',
      'tenant_id',
      'log_id',
      'step_id',
      'photo_id',
      'photo_s3_key',
      'photo_sha256',
      'width',
      'height',
      'content_type',
      'taken_at',
      'uploaded_by_user_id',
    ];

    const rows = [];

    logsData.forEach(log => {
      if (!log.steps || !Array.isArray(log.steps)) return;

      log.steps.forEach(step => {
        if (!step.photos || !Array.isArray(step.photos)) return;

        step.photos.forEach(photo => {
          rows.push([
            reportDate,
            tenantId,
            log.id,
            step.id,
            photo.id,
            photo.s3_key || photo.key || '',
            photo.sha256 || photo.hash || '',
            photo.width || '',
            photo.height || '',
            photo.content_type || photo.mime_type || 'image/jpeg',
            this.formatISO8601(photo.taken_at || photo.created_at),
            photo.uploaded_by || photo.user_id || log.created_by,
          ]);
        });
      });
    });

    const content = this.buildCSVContent(headers, rows);

    return {
      filename,
      content,
      rowCount: rows.length,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  /**
   * Manifest.json erzeugen
   */
  generateManifest(reportDate, tenantId, exports, additionalFiles = {}) {
    const manifest = {
      export_info: {
        schema_version: this.schemaVersion,
        export_date: new Date().toISOString(),
        report_date: reportDate,
        tenant_id: tenantId,
        generated_by: 'cleanidoc-export-system',
        format_specification: 'https://docs.cleanidoc.de/csv-schema-v1',
      },
      files: {
        csv_logs: {
          filename: exports.logs.filename,
          size_bytes: exports.logs.size,
          row_count: exports.logs.rowCount,
          sha256: exports.logs.sha256,
          content_type: 'text/csv; charset=utf-8',
        },
        csv_steps: {
          filename: exports.steps.filename,
          size_bytes: exports.steps.size,
          row_count: exports.steps.rowCount,
          sha256: exports.steps.sha256,
          content_type: 'text/csv; charset=utf-8',
        },
        csv_photos: {
          filename: exports.photos.filename,
          size_bytes: exports.photos.size,
          row_count: exports.photos.rowCount,
          sha256: exports.photos.sha256,
          content_type: 'text/csv; charset=utf-8',
        },
        ...additionalFiles,
      },
      integrity: {
        algorithm: 'SHA-256',
        verification_instructions:
          'Vergleichen Sie die SHA-256 Prüfsummen mit den tatsächlichen Dateien',
        total_files: Object.keys(exports).length + Object.keys(additionalFiles).length,
      },
      compliance: {
        haccp_compliant: true,
        data_retention_days: 730,
        gdpr_compliant: true,
        encryption_at_rest: true,
      },
    };

    return {
      filename: `cleandoc_manifest_${reportDate}.json`,
      content: JSON.stringify(manifest, null, 2),
      size: Buffer.byteLength(JSON.stringify(manifest, null, 2), 'utf8'),
    };
  }

  /**
   * Checksums.txt erzeugen
   */
  generateChecksums(exports, additionalFiles = {}) {
    const allFiles = { ...exports, ...additionalFiles };

    let content = '# CleaniDoc SHA-256 Checksums\n';
    content += `# Generated: ${new Date().toISOString()}\n`;
    content += '# Format: <hash> <filename>\n\n';

    Object.values(allFiles).forEach(file => {
      if (file.sha256 && file.filename) {
        content += `${file.sha256}  ${file.filename}\n`;
      }
    });

    return {
      filename: `cleandoc_checksums_${new Date().toISOString().split('T')[0]}.txt`,
      content,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * CSV Content Builder
   */
  buildCSVContent(headers, rows) {
    let content = headers.join(this.delimiter) + '\n';

    rows.forEach(row => {
      content += row.map(cell => this.formatCsvCell(cell)).join(this.delimiter) + '\n';
    });

    return content;
  }

  /**
   * CSV Cell Formatting
   */
  formatCsvCell(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Escape wenn Delimiter, Quotes oder Newlines enthalten
    if (
      stringValue.includes(this.delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
  }

  /**
   * CSV Value Escaping
   */
  escapeCsvValue(value) {
    if (!value) return '';

    return String(value)
      .replace(/[\r\n]/g, ' ') // Zeilenumbrüche zu Leerzeichen
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen reduzieren
      .trim(); // Rand-Whitespace entfernen
  }

  /**
   * ISO 8601 Formatierung
   */
  formatISO8601(dateString) {
    if (!dateString) return '';

    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return '';
    }
  }

  /**
   * Dauer in Minuten berechnen
   */
  calculateDurationMinutes(startTime, endTime) {
    if (!startTime || !endTime) return '';

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;

      if (diffMs < 0) return '';

      return Math.round(diffMs / 60000); // Milliseconds zu Minuten
    } catch (error) {
      return '';
    }
  }

  /**
   * SHA-256 Hash berechnen (Browser-Implementierung)
   */
  async calculateSHA256(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Datenvalidierung
   */
  validateExportData(logsData) {
    if (!Array.isArray(logsData)) {
      throw new Error('Logs data must be an array');
    }

    logsData.forEach((log, index) => {
      if (!log.id) {
        throw new Error(`Log at index ${index} missing required field: id`);
      }

      if (log.steps && !Array.isArray(log.steps)) {
        throw new Error(`Log ${log.id} steps must be an array`);
      }

      // Weitere Validierungen...
    });

    return true;
  }

  /**
   * Export-Statistiken
   */
  generateExportStats(logsData) {
    const stats = {
      total_logs: logsData.length,
      completed_logs: logsData.filter(log => log.status === 'completed').length,
      failed_logs: logsData.filter(log => log.status === 'failed').length,
      total_steps: 0,
      total_photos: 0,
    };

    logsData.forEach(log => {
      if (log.steps) {
        stats.total_steps += log.steps.length;

        log.steps.forEach(step => {
          if (step.photos) {
            stats.total_photos += step.photos.length;
          }
        });
      }
    });

    return stats;
  }
}

export default new CSVExportService();
