# CleaniDoc Photo Upload System

Vollständige Anleitung zum Hinzufügen von Bildern in Reinigungsprotokollen für HACCP-konforme Dokumentation.

## 🎯 Überblick

Das Photo Upload System ermöglicht es, **jeden Reinigungsschritt** mit Fotos zu dokumentieren:

- **Vor der Reinigung**: Ausgangszustand
- **Während der Reinigung**: Prozessdokumentation
- **Nach der Reinigung**: Ergebnis und Sauberkeit
- **Probleme**: Verschmutzungen, Defekte, Besonderheiten

## 📸 Verwendung

### 1. In der Cleaning Logs Page

```javascript
import CleaningStepForm from '../components/protocol/CleaningStepForm';

// In Ihrer Log-Detail-Ansicht:
<CleaningStepForm
  log={currentLog}
  step={step}
  stepIndex={index}
  tenantId="tenant-123"
  onStepUpdate={handleStepUpdate}
  onStepComplete={handleStepComplete}
/>
```

### 2. Direkte PhotoUpload Komponente

```javascript
import PhotoUpload from '../components/protocol/PhotoUpload';

<PhotoUpload
  logId="log-uuid"
  stepId="step-1"
  tenantId="tenant-123"
  existingPhotos={[]}
  onPhotosUpdate={handlePhotosUpdate}
  maxPhotos={5}
  maxSizeMB={10}
/>
```

## 🛠 Setup & Installation

### 1. Database Migration ausführen

```bash
psql -d your_database < database/migrations/create_step_photos_table.sql
```

### 2. Abhängigkeiten prüfen

Die Photo Upload Komponenten benötigen:
- AWS S3 Service (bereits installiert)
- File Upload Handling (Browser APIs)
- Image Processing (Canvas API)

### 3. Umgebungsvariablen

Stellen Sie sicher, dass S3 konfiguriert ist:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=cleanidoc-exports
```

## 📱 Benutzeroberfläche

### Upload-Methoden

1. **Drag & Drop**: Dateien in Upload-Bereich ziehen
2. **Datei auswählen**: Click zum Öffnen des Datei-Browsers
3. **Kamera**: Direktes Fotografieren (Mobile/Webcam)

### Unterstützte Formate

- **JPEG/JPG**: Beste Kompression für Fotos
- **PNG**: Für Screenshots und Grafiken
- **WebP**: Moderne, effiziente Kompression

### Limits

- **Maximale Dateigröße**: 10MB pro Foto
- **Maximale Anzahl**: 5 Fotos pro Reinigungsschritt
- **Auflösung**: Automatische Metadaten-Extraktion

## 🔄 Workflow Integration

### In Reinigungsprotokollen

1. **Step starten**: Status auf "In Bearbeitung" setzen
2. **Vorher-Foto**: Ausgangszustand dokumentieren
3. **Reinigung durchführen**: Chemikalien, Einwirkzeit notieren
4. **Problem-Fotos**: Bei Besonderheiten/Problemen
5. **Nachher-Foto**: Endergebnis dokumentieren
6. **Step abschließen**: Status auf "Abgeschlossen" setzen

### Automatische Features

- **Thumbnail-Generierung**: Für schnelle Vorschau
- **Metadaten-Extraktion**: Auflösung, Dateigröße
- **SHA-256 Checksums**: Für Integrität und Compliance
- **Structured Storage**: Organisiert nach Tenant/Datum/Log/Step

## 💾 Datenspeicherung

### S3 Struktur

```
cleanidoc-exports/
└── photos/
    └── {tenant-id}/
        └── {date}/
            └── {log-id}/
                └── {step-id}/
                    └── {photo-id}.jpg
```

### Database Schema

```sql
step_photos (
    id UUID PRIMARY KEY,
    log_id UUID REFERENCES cleaning_logs(id),
    step_id TEXT, -- Step identifier
    photo_id UUID UNIQUE, -- S3 reference
    s3_key TEXT UNIQUE,
    filename TEXT,
    content_type TEXT,
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    sha256 TEXT, -- Integrity hash
    uploaded_at TIMESTAMPTZ,
    tenant_id TEXT -- Automatic isolation
)
```

## 🔒 Sicherheit & Compliance

### Verschlüsselung
- **S3**: AES-256 Server-side Encryption
- **Transport**: HTTPS für alle Uploads
- **Integrity**: SHA-256 Checksums

### Datenschutz
- **Tenant Isolation**: Row Level Security (RLS)
- **Zugriffskontr.**: Nur eigene Tenant-Fotos sichtbar
- **Audit Trail**: Vollständige Upload-Nachverfolgung

### HACCP Compliance
- **Unveränderlich**: Fotos können nur gelöscht, nicht bearbeitet werden
- **Timestamping**: Exakte Upload-Zeitstempel
- **Rückverfolgung**: Vollständige Zuordnung zu Log/Step

## 📊 Export Integration

### PDF Reports
Fotos werden automatisch in PDF-Berichte eingebunden:

```css
/* Print-optimiertes CSS */
.step-photos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.step-photo {
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
}
```

### CSV Exports
Photo-Metadaten in `cleandoc_log_photos_*.csv`:

```csv
report_date;tenant_id;log_id;step_id;photo_id;photo_s3_key;photo_sha256;width;height;content_type;taken_at;uploaded_by_user_id
2024-11-01;tenant-123;log-456;step-1;photo-789;photos/.../photo.jpg;abc123...;1920;1080;image/jpeg;2024-11-01T14:30:00Z;user-999
```

## 📈 Monitoring & Analytics

### Storage Analytics

```sql
-- Foto-Statistiken pro Tenant
SELECT
  tenant_id,
  COUNT(*) as total_photos,
  SUM(size_bytes) as total_size_mb,
  AVG(size_bytes) as avg_size_kb,
  COUNT(DISTINCT log_id) as logs_with_photos
FROM step_photos
GROUP BY tenant_id;
```

### Cleanup & Maintenance

```javascript
// Automatisches Cleanup über Cron
import exportScheduler from '../cron/exportScheduler.js';

// Verwaiste Fotos entfernen (ohne zugehörigen Log)
await cleanup_orphaned_photos();

// Alte Fotos basierend auf Retention Policy
await cleanupExpiredExports(tenantId, retentionDays);
```

## 🚀 Best Practices

### Für Benutzer
1. **Konsistente Perspektive**: Gleiche Winkel für Vorher/Nachher
2. **Gute Beleuchtung**: Deutlich erkennbare Details
3. **Relevante Bereiche**: Fokus auf zu reinigende Stellen
4. **Probleme dokumentieren**: Besonderheiten extra fotografieren

### Für Entwickler
1. **Lazy Loading**: Thumbnails für Performance
2. **Compression**: Automatische Größenoptimierung
3. **Error Handling**: Graceful Degradation bei Upload-Fehlern
4. **Progress Indication**: User Feedback während Upload

### Für Administratoren
1. **Storage Monitoring**: Regelmäßige S3-Kostenkontrolle
2. **Cleanup Policies**: Automatische Bereinigung alter Fotos
3. **Backup Strategy**: Export-Archive für Langzeitspeicherung
4. **Access Control**: Regelmäßige Permissions-Reviews

## 🔧 Troubleshooting

### Häufige Probleme

#### Upload schlägt fehl
```javascript
// Debug: S3 Credentials prüfen
await s3StorageService.validateBucketAccess();

// Error: Network oder Permissions
console.error('Upload failed:', error.message);
```

#### Große Dateien
```javascript
// Automatische Kompression implementieren
const compressedImage = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8
});
```

#### Missing Thumbnails
```javascript
// Thumbnail regeneration
const thumbnail = await createThumbnail(file);
```

### Performance Optimierung

1. **Lazy Loading**: Fotos nur bei Bedarf laden
2. **CDN Integration**: S3 CloudFront für globale Performance
3. **Progressive Enhancement**: Graceful Fallbacks
4. **Batch Operations**: Multiple Uploads parallelisieren

## 📞 Support

Bei Problemen mit dem Photo Upload System:

1. **Browser Console** prüfen (F12 → Console)
2. **Network Tab** für Upload-Fehler überprüfen
3. **S3 Bucket Permissions** validieren
4. **Database Connections** testen

**Kontakt**: support@cleanidoc.de

---

**Das Photo Upload System macht Ihre HACCP-Protokolle vollständig und nachweisbar! 📸✅**