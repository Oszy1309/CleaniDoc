/**
 * S3 Storage Service für HACCP-Exporte
 * Sichere, verschlüsselte Speicherung mit Pre-Signed URLs
 */

import AWS from 'aws-sdk';
// Removed crypto import - not needed in browser environment

class S3StorageService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-central-1',
      signatureVersion: 'v4',
    });

    this.bucket = process.env.S3_BUCKET_NAME || 'cleanidoc-exports';
    this.defaultSSE = 'AES256'; // Server-side encryption
    this.defaultExpiration = 24 * 60 * 60; // 24h für Pre-signed URLs
  }

  /**
   * Haupteinstiegspunkt für Export-Upload
   */
  async uploadDailyExport(tenantId, reportDate, exportData) {
    try {
      const basePath = this.buildExportPath(tenantId, reportDate);
      const uploads = {};

      // PDF Upload
      if (exportData.pdf) {
        uploads.pdf = await this.uploadFile(
          `${basePath}/cleandoc_daily_report_${reportDate}.pdf`,
          exportData.pdf.buffer,
          'application/pdf',
          {
            'Content-Disposition': `attachment; filename="cleandoc_daily_report_${reportDate}.pdf"`,
          }
        );
      }

      // CSV Uploads
      if (exportData.csvs) {
        uploads.csv_logs = await this.uploadFile(
          `${basePath}/${exportData.csvs.logs.filename}`,
          Buffer.from(exportData.csvs.logs.content, 'utf8'),
          'text/csv; charset=utf-8'
        );

        uploads.csv_steps = await this.uploadFile(
          `${basePath}/${exportData.csvs.steps.filename}`,
          Buffer.from(exportData.csvs.steps.content, 'utf8'),
          'text/csv; charset=utf-8'
        );

        uploads.csv_photos = await this.uploadFile(
          `${basePath}/${exportData.csvs.photos.filename}`,
          Buffer.from(exportData.csvs.photos.content, 'utf8'),
          'text/csv; charset=utf-8'
        );
      }

      // Manifest Upload
      if (exportData.manifest) {
        uploads.manifest = await this.uploadFile(
          `${basePath}/${exportData.manifest.filename}`,
          Buffer.from(exportData.manifest.content, 'utf8'),
          'application/json; charset=utf-8'
        );
      }

      // Checksums Upload
      if (exportData.checksums) {
        uploads.checksums = await this.uploadFile(
          `${basePath}/${exportData.checksums.filename}`,
          Buffer.from(exportData.checksums.content, 'utf8'),
          'text/plain; charset=utf-8'
        );
      }

      // ZIP Archive Upload
      if (exportData.zipBuffer) {
        uploads.zip = await this.uploadFile(
          `${basePath}/cleandoc_export_${reportDate}.zip`,
          exportData.zipBuffer,
          'application/zip',
          { 'Content-Disposition': `attachment; filename="cleandoc_export_${reportDate}.zip"` }
        );
      }

      return uploads;
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Einzeldatei hochladen
   */
  async uploadFile(key, buffer, contentType, additionalMetadata = {}) {
    try {
      const sha256Hash = this.calculateSHA256(buffer);

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: this.defaultSSE,
        Metadata: {
          'sha256-hash': sha256Hash,
          'upload-timestamp': new Date().toISOString(),
          system: 'cleanidoc-export',
          ...additionalMetadata,
        },
        // Cache-Control für optimale Delivery
        CacheControl: 'max-age=86400', // 24h
        // ACL
        ACL: 'private',
      };

      // KMS Verschlüsselung wenn konfiguriert
      if (process.env.AWS_KMS_KEY_ID) {
        params.ServerSideEncryption = 'aws:kms';
        params.SSEKMSKeyId = process.env.AWS_KMS_KEY_ID;
      }

      const result = await this.s3.upload(params).promise();

      return {
        s3_key: key,
        etag: result.ETag,
        location: result.Location,
        sha256: sha256Hash,
        size: buffer.length,
        uploaded_at: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to upload ${key}: ${error.message}`);
    }
  }

  /**
   * Pre-signed URL für Download erzeugen
   */
  async generatePresignedUrl(s3Key, expiresIn = this.defaultExpiration, filename = null) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: s3Key,
        Expires: expiresIn,
      };

      // Filename für Download setzen
      if (filename) {
        params.ResponseContentDisposition = `attachment; filename="${filename}"`;
      }

      const url = await this.s3.getSignedUrlPromise('getObject', params);

      return {
        download_url: url,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        expires_in_seconds: expiresIn,
      };
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Batch Pre-signed URLs für alle Export-Dateien
   */
  async generateExportDownloadUrls(uploads, expiresIn = this.defaultExpiration) {
    const urls = {};

    for (const [type, uploadInfo] of Object.entries(uploads)) {
      if (uploadInfo && uploadInfo.s3_key) {
        const filename = uploadInfo.s3_key.split('/').pop();
        urls[type] = await this.generatePresignedUrl(uploadInfo.s3_key, expiresIn, filename);
      }
    }

    return urls;
  }

  /**
   * Datei-Metadaten abrufen
   */
  async getFileMetadata(s3Key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: s3Key,
      };

      const result = await this.s3.headObject(params).promise();

      return {
        size: result.ContentLength,
        content_type: result.ContentType,
        last_modified: result.LastModified,
        etag: result.ETag,
        sha256: result.Metadata['sha256-hash'],
        encryption: result.ServerSideEncryption,
        metadata: result.Metadata,
      };
    } catch (error) {
      if (error.code === 'NotFound') {
        return null;
      }
      throw new Error(`Failed to get metadata for ${s3Key}: ${error.message}`);
    }
  }

  /**
   * Datei existiert prüfen
   */
  async fileExists(s3Key) {
    const metadata = await this.getFileMetadata(s3Key);
    return metadata !== null;
  }

  /**
   * Retention Cleanup - Alte Exports löschen
   */
  async cleanupExpiredExports(tenantId, retentionDays = 730) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const listParams = {
        Bucket: this.bucket,
        Prefix: `exports/${tenantId}/`,
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();
      const expiredKeys = [];

      objects.Contents.forEach(obj => {
        if (obj.LastModified < cutoffDate) {
          expiredKeys.push({ Key: obj.Key });
        }
      });

      if (expiredKeys.length > 0) {
        const deleteParams = {
          Bucket: this.bucket,
          Delete: {
            Objects: expiredKeys,
            Quiet: true,
          },
        };

        const deleteResult = await this.s3.deleteObjects(deleteParams).promise();

        return {
          deleted_count: deleteResult.Deleted?.length || 0,
          errors: deleteResult.Errors || [],
        };
      }

      return { deleted_count: 0, errors: [] };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * ZIP Archive erstellen (für E-Mail/SFTP)
   */
  async createZipArchive(files) {
    const JSZip = require('jszip');
    const zip = new JSZip();

    // CSV Dateien hinzufügen
    if (files.csvs) {
      zip.file(files.csvs.logs.filename, files.csvs.logs.content);
      zip.file(files.csvs.steps.filename, files.csvs.steps.content);
      zip.file(files.csvs.photos.filename, files.csvs.photos.content);
    }

    // Manifest und Checksums
    if (files.manifest) {
      zip.file(files.manifest.filename, files.manifest.content);
    }

    if (files.checksums) {
      zip.file(files.checksums.filename, files.checksums.content);
    }

    // README hinzufügen
    const readme = this.generateReadmeContent();
    zip.file('README.txt', readme);

    return await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  /**
   * Foto-Upload für Cleaning Steps
   */
  async uploadStepPhoto(tenantId, logId, stepId, photoBuffer, metadata = {}) {
    try {
      const photoId = require('uuid').v4();
      const extension = this.getFileExtension(metadata.content_type || 'image/jpeg');
      const s3Key = `photos/${tenantId}/${new Date().toISOString().split('T')[0]}/${logId}/${stepId}/${photoId}${extension}`;

      const uploadResult = await this.uploadFile(
        s3Key,
        photoBuffer,
        metadata.content_type || 'image/jpeg',
        {
          'log-id': logId,
          'step-id': stepId,
          'photo-id': photoId,
          width: metadata.width?.toString() || '',
          height: metadata.height?.toString() || '',
        }
      );

      return {
        ...uploadResult,
        photo_id: photoId,
        width: metadata.width,
        height: metadata.height,
        content_type: metadata.content_type || 'image/jpeg',
      };
    } catch (error) {
      throw new Error(`Photo upload failed: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Export-Pfad strukturiert aufbauen
   */
  buildExportPath(tenantId, reportDate) {
    const date = new Date(reportDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `exports/${tenantId}/${year}/${month}/${day}`;
  }

  /**
   * SHA-256 Hash berechnen (Browser-Implementierung)
   */
  async calculateSHA256(buffer) {
    const encoder = new TextEncoder();
    const data = encoder.encode(buffer);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * File Extension ermitteln
   */
  getFileExtension(contentType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/csv': '.csv',
      'application/json': '.json',
      'text/plain': '.txt',
      'application/zip': '.zip',
    };

    return extensions[contentType] || '';
  }

  /**
   * README Content für ZIP-Archive
   */
  generateReadmeContent() {
    return `CleaniDoc HACCP-Export Archiv
================================

Dieses Archiv enthält maschinenlesbare Reinigungsprotokolle im CSV-Format.

Dateien:
- cleandoc_logs_*.csv: Hauptprotokolle mit Zeitstempel und Status
- cleandoc_log_steps_*.csv: Detaillierte Reinigungsschritte
- cleandoc_log_photos_*.csv: Foto-Metadaten für Dokumentation
- cleandoc_manifest_*.json: Vollständige Metadaten mit Prüfsummen
- cleandoc_checksums_*.txt: SHA-256 Prüfsummen aller Dateien

Import-Hinweise:
- Kodierung: UTF-8
- Trennzeichen: Semikolon (;)
- Erste Zeile: Spaltennamen

Datenschutz:
- DSGVO-konform
- Aufbewahrung: 24 Monate
- Verschlüsselt gespeichert

Support: support@cleanidoc.de
Dokumentation: https://docs.cleanidoc.de/csv-schema

Generiert: ${new Date().toISOString()}
System: CleaniDoc Export v2.0
`;
  }

  /**
   * S3 Bucket Setup validieren
   */
  async validateBucketAccess() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      return { success: true, bucket: this.bucket };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        bucket: this.bucket,
      };
    }
  }

  /**
   * Storage Statistiken
   */
  async getStorageStats(tenantId) {
    try {
      const listParams = {
        Bucket: this.bucket,
        Prefix: `exports/${tenantId}/`,
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();

      const stats = {
        total_objects: objects.KeyCount || 0,
        total_size_bytes: 0,
        oldest_file: null,
        newest_file: null,
      };

      objects.Contents?.forEach(obj => {
        stats.total_size_bytes += obj.Size;

        if (!stats.oldest_file || obj.LastModified < stats.oldest_file) {
          stats.oldest_file = obj.LastModified;
        }

        if (!stats.newest_file || obj.LastModified > stats.newest_file) {
          stats.newest_file = obj.LastModified;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }
}

export default new S3StorageService();
