# CleaniDoc HACCP Export System

Das CleaniDoc Export System ist eine vollständige Lösung für automatisierte HACCP-konforme Datenexporte mit PDF-Generierung, CSV-Ausgabe, sicherer S3-Speicherung und Multi-Channel-Delivery.

## 🚀 Features

### Core Funktionalitäten
- **PDF-Berichte**: Professionelle HACCP-Protokolle mit Print-CSS
- **CSV-Exporte**: Maschinenlesbare Daten (Logs, Steps, Photos)
- **S3-Speicherung**: AES-256 verschlüsselt mit Pre-signed URLs
- **Multi-Channel Delivery**: Email, SFTP, Webhook mit HMAC-Signaturen
- **Automatisierung**: Cron-Jobs für tägliche Exports und Cleanup
- **Customer Portal**: Web-Interface für Export-Management

### Compliance & Sicherheit
- **HACCP-konform**: Vollständige Dokumentation und Rückverfolgbarkeit
- **DSGVO-compliant**: Datenschutz und Aufbewahrungsfristen
- **Verschlüsselung**: AES-256 Server-side Encryption
- **Audit-Trail**: Vollständige Nachverfolgung aller Aktionen
- **Rate-Limiting**: API-Schutz und Missbrauchsprävention

## 📋 System-Architektur

### Database Schema
```sql
-- Tenant-spezifische Export-Einstellungen
tenant_settings (tenant_id, export_enabled, delivery_channels, ...)

-- Täglich generierte Exports
daily_exports (tenant_id, report_date, files, status, ...)

-- Digitale Signaturen für Protokolle
log_signatures (log_id, signature_hash, signed_at, ...)

-- Audit-Events für Compliance
audit_events (tenant_id, event_type, event_data, ...)
```

### Service Layer
```
├── haccpExportService.js    # Hauptorchestrator
├── pdfGeneratorService.js   # PDF-Generierung mit Puppeteer
├── csvExportService.js      # CSV-Schema v1.0
├── s3StorageService.js      # AWS S3 Integration
├── deliveryService.js       # Multi-Channel Delivery
└── exportScheduler.js       # Cron Jobs
```

### Frontend Components
```
├── pages/exports/ExportArchive.js    # Customer Portal
├── components/export/               # Export-Komponenten
└── api/exportApi.js                # API Client
```

## 🛠 Installation & Setup

### 1. Abhängigkeiten installieren
```bash
npm install aws-sdk puppeteer nodemailer ssh2-sftp-client
npm install date-fns uuid jszip node-cron
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env.local
```

Wichtige Variablen:
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=cleanidoc-exports

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password

# Export Settings
EXPORT_RETENTION_DAYS=730
DAILY_EXPORT_CRON=0 2 * * *
```

### 3. Database Migration ausführen
```bash
psql -d your_database < database/migrations/create_export_tables.sql
```

### 4. S3 Bucket Setup
- Bucket erstellen: `cleanidoc-exports`
- Verschlüsselung aktivieren: AES-256
- Lifecycle Policy: Automatische Archivierung nach 90 Tagen

## 📖 Verwendung

### Manueller Export (API)
```javascript
import HaccpExportService from './services/haccpExportService.js';

const exportService = new HaccpExportService();

// Export für einen Tag generieren
const result = await exportService.generateDailyExport(
  'tenant-123',
  '2024-11-01',
  {
    include_pdf: true,
    include_csv: true,
    delivery_channels: ['email', 'storage']
  }
);
```

### Customer Portal
- Verfügbar unter `/exports` Route
- Filterung nach Datum, Status, Typ
- Download von Einzeldateien oder ZIP-Archiven
- Export-Statistiken und Übersicht

### Automatisierte Exports
```javascript
import exportScheduler from './cron/exportScheduler.js';

// Scheduler starten
exportScheduler.start();

// Status prüfen
console.log(exportScheduler.getStatus());

// Manueller Trigger
await exportScheduler.triggerManualExport('tenant-123', '2024-11-01');
```

## 🔧 Konfiguration

### Tenant Settings
Jeder Tenant kann individuelle Export-Einstellungen haben:

```javascript
{
  tenant_id: 'tenant-123',
  export_enabled: true,
  export_pdf: true,
  export_csv: true,
  delivery_channels: ['email', 'storage'],
  email_recipients: ['admin@customer.com'],
  sftp_config: { host: 'ftp.customer.com', ... },
  export_retention_days: 730
}
```

### Delivery Channels

#### Email
- SMTP-basiert mit Attachment-Support
- Automatische Kompression großer Dateien
- Retry-Mechanismus bei Fehlern

#### SFTP
- SSH-Key oder Passwort-Authentifizierung
- Strukturierte Verzeichnisse pro Tenant
- Atomare Uploads mit Temp-Files

#### Webhook
- HMAC-SHA256 Signaturen zur Verifikation
- JSON-Payload mit Download-URLs
- Retry-Policy mit exponential backoff

#### Storage Only
- Nur S3-Speicherung ohne Delivery
- Pre-signed URLs für Download
- Customer Portal Zugriff

## 📊 Monitoring & Troubleshooting

### Logs & Debugging
```javascript
// Service-Level Logging
console.log('Export started for tenant:', tenantId);
console.error('Export failed:', error);

// Audit Trail
await this.logAuditEvent(tenantId, 'export_completed', {
  files_count: 5,
  total_size_mb: 12.5
});
```

### Häufige Probleme

#### PDF Generation Fehler
```bash
# Puppeteer Dependencies (Ubuntu/Debian)
sudo apt-get install -y libgbm-dev libxss1 libgtk-3-dev libasound2-dev
```

#### S3 Permission Fehler
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::cleanidoc-exports/*"
    }
  ]
}
```

#### Email Delivery Probleme
- SMTP-Credentials prüfen
- Two-Factor Auth: App-Passwort verwenden
- Rate-Limits beachten (Gmail: 500/Tag)

### Performance Tuning
- Parallele Verarbeitung für große Datenmengen
- Redis-Caching für häufige Abfragen
- S3 Transfer Acceleration für globale Verteilung

## 🔒 Sicherheit

### Verschlüsselung
- S3: AES-256 Server-side Encryption
- Transport: HTTPS/TLS für alle Kommunikation
- Signatures: HMAC-SHA256 für Webhook-Authentifizierung

### Zugriffskontrolle
- Row Level Security (RLS) auf Database-Ebene
- Pre-signed URLs mit Ablaufzeit (24h)
- API-Rate-Limiting pro Tenant

### Audit & Compliance
- Vollständige Audit-Trails
- DSGVO-konforme Datenaufbewahrung
- Automatische Löschung nach Retention-Period

## 📈 Roadmap

### Geplante Features
- [ ] Excel-Export Format (.xlsx)
- [ ] Grafana Dashboard für Export-Metriken
- [ ] Webhook-Templates für gängige Systeme
- [ ] Multi-Region S3 Support
- [ ] Advanced Filtering im Customer Portal

### Version History
- **v1.0** (2024-11): Initial Release mit PDF/CSV/S3
- **v1.1** (geplant): Excel Support und erweiterte Webhooks
- **v2.0** (geplant): Multi-Region und Advanced Analytics

## 🆘 Support

Bei Problemen oder Fragen:
1. Dokumentation prüfen
2. Logs analysieren (`/var/log/cleanidoc/`)
3. GitHub Issues erstellen
4. Support kontaktieren: support@cleanidoc.de

---

**Entwickelt für CleaniDoc Dashboard v1.0**
**HACCP-konform • DSGVO-compliant • Production-ready**