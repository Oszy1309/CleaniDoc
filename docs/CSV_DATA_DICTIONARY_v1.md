# CleaniDoc CSV-Datenexport - Datenwörterbuch v1.0

## Übersicht
CleaniDoc exportiert täglich maschinenlesbare Reinigungsprotokolle im CSV-Format (UTF-8, Semikolon-getrennt). Dieses Dokument beschreibt alle Datenfelder für eine reibungslose Integration in Ihre IT-Systeme.

## Dateistruktur
Jeder Tagesexport enthält 3 CSV-Dateien:

### 1. Reinigungsprotokolle (`cleandoc_logs_YYYY-MM-DD_v1.csv`)
**Hauptprotokolle mit Zeitstempel und Status**

| Feldname | Datentyp | Beschreibung | Beispiel |
|----------|----------|--------------|----------|
| `report_date` | DATE | Berichtsdatum (ISO 8601) | `2025-10-31` |
| `tenant_id` | UUID | Eindeutige Kunden-ID | `550e8400-e29b-41d4-a716-446655440000` |
| `log_id` | UUID | Eindeutige Protokoll-ID | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `protocol_id` | UUID | Referenz zum Reinigungsplan | `6ba7b811-9dad-11d1-80b4-00c04fd430c8` |
| `customer_name` | TEXT | Kundenname | `Bäckerei Schmidt GmbH` |
| `site_name` | TEXT | Standortbezeichnung | `Filiale Hauptstraße` |
| `area_name` | TEXT | Reinigungsbereich | `Küche - Arbeitsplätze` |
| `status` | TEXT | Status: `completed`, `pending`, `failed` | `completed` |
| `started_at` | TIMESTAMP | Beginn (ISO 8601, UTC) | `2025-10-31T05:30:00Z` |
| `completed_at` | TIMESTAMP | Ende (ISO 8601, UTC) | `2025-10-31T06:15:00Z` |
| `duration_min` | INTEGER | Dauer in Minuten | `45` |
| `created_by_user_id` | UUID | Ausführender Mitarbeiter | `123e4567-e89b-12d3-a456-426614174000` |
| `approved_by_user_id` | UUID | Prüfende Person (Schichtleiter) | `123e4567-e89b-12d3-a456-426614174001` |
| `pdf_s3_key` | TEXT | Pfad zur PDF-Datei | `exports/tenant123/2025/10/31/log_abc.pdf` |
| `pdf_sha256` | TEXT | SHA-256 Prüfsumme der PDF | `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3` |
| `record_version` | INTEGER | Versionsnummer des Datensatzes | `1` |

### 2. Reinigungsschritte (`cleandoc_log_steps_YYYY-MM-DD_v1.csv`)
**Detaillierte Einzelschritte pro Protokoll**

| Feldname | Datentyp | Beschreibung | Beispiel |
|----------|----------|--------------|----------|
| `report_date` | DATE | Berichtsdatum | `2025-10-31` |
| `tenant_id` | UUID | Kunden-ID | `550e8400-e29b-41d4-a716-446655440000` |
| `log_id` | UUID | Referenz zum Hauptprotokoll | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `step_id` | UUID | Eindeutige Schritt-ID | `6ba7b812-9dad-11d1-80b4-00c04fd430c8` |
| `step_seq` | INTEGER | Reihenfolge im Protokoll | `1` |
| `step_name` | TEXT | Bezeichnung des Schrittes | `Arbeitsflächen desinfizieren` |
| `chemical` | TEXT | Verwendetes Reinigungsmittel | `Bacillol AF` |
| `dwell_time_s` | INTEGER | Einwirkzeit in Sekunden | `300` |
| `status` | TEXT | Status: `completed`, `skipped`, `failed` | `completed` |
| `notes` | TEXT | Bemerkungen | `Starke Verschmutzung entfernt` |
| `completed_by_user_id` | UUID | Ausführender Mitarbeiter | `123e4567-e89b-12d3-a456-426614174000` |
| `completed_at` | TIMESTAMP | Zeitstempel Abschluss (ISO 8601, UTC) | `2025-10-31T05:45:00Z` |
| `photo_count` | INTEGER | Anzahl Fotos zu diesem Schritt | `2` |

### 3. Dokumentationsfotos (`cleandoc_log_photos_YYYY-MM-DD_v1.csv`)
**Foto-Metadaten für Nachweiszwecke**

| Feldname | Datentyp | Beschreibung | Beispiel |
|----------|----------|--------------|----------|
| `report_date` | DATE | Berichtsdatum | `2025-10-31` |
| `tenant_id` | UUID | Kunden-ID | `550e8400-e29b-41d4-a716-446655440000` |
| `log_id` | UUID | Referenz zum Protokoll | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| `step_id` | UUID | Referenz zum Schritt | `6ba7b812-9dad-11d1-80b4-00c04fd430c8` |
| `photo_id` | UUID | Eindeutige Foto-ID | `6ba7b813-9dad-11d1-80b4-00c04fd430c8` |
| `photo_s3_key` | TEXT | Pfad zur Bilddatei | `photos/tenant123/2025/10/31/photo_xyz.jpg` |
| `photo_sha256` | TEXT | SHA-256 Prüfsumme | `b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9` |
| `width` | INTEGER | Bildbreite in Pixel | `1920` |
| `height` | INTEGER | Bildhöhe in Pixel | `1080` |
| `content_type` | TEXT | MIME-Type | `image/jpeg` |
| `taken_at` | TIMESTAMP | Aufnahmezeitpunkt (ISO 8601, UTC) | `2025-10-31T05:42:00Z` |
| `uploaded_by_user_id` | UUID | Hochladender Benutzer | `123e4567-e89b-12d3-a456-426614174000` |

## Datenintegrität & Sicherheit

### Prüfsummen
Jede Datei wird mit SHA-256 gehasht. Die Prüfsummen finden Sie in:
- `cleandoc_checksums_YYYY-MM-DD.txt`
- `cleandoc_manifest_YYYY-MM-DD.json`

### Verschlüsselung
- CSV-Dateien: UTF-8 ohne BOM
- S3-Storage: AES-256 serverseitig verschlüsselt
- Zugriff: Pre-signed URLs (24h gültig)

### DSGVO-Konformität
- Personenbezogene Daten: minimal (nur Benutzer-UUIDs)
- Aufbewahrung: 24 Monate (konfigurierbar)
- Anonymisierung nach Retention-Frist

## Import-Hinweise

### CSV-Format
- **Kodierung**: UTF-8
- **Trennzeichen**: Semikolon (`;`)
- **Anführungszeichen**: Doppelt (`"`) bei Zeilenumbrüchen/Semikola im Text
- **NULL-Werte**: Leeres Feld zwischen Semikola

### Beispiel-Import (Excel/LibreOffice)
1. Datei → Öffnen → CSV-Import
2. Kodierung: UTF-8
3. Trennzeichen: Semikolon
4. Erste Zeile: Spaltennamen

### Datenbank-Import (SQL)
```sql
COPY logs_import FROM '/path/cleandoc_logs_2025-10-31_v1.csv'
WITH (FORMAT csv, DELIMITER ';', HEADER true, ENCODING 'UTF8');
```

## Support & Versionierung

- **Schema-Version**: v1.0 (stabil, rückwärtskompatibel)
- **Änderungen**: Neue Felder werden angefügt, bestehende bleiben
- **Support**: support@cleanidoc.de
- **Dokumentation**: Immer aktuell unter `/docs/csv-schema`

---
*CleaniDoc GmbH | Version 1.0 | 2025-10-31*