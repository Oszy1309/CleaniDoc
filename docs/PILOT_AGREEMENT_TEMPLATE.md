# CleaniDoc HACCP-Export Pilot-Vereinbarung

**Zwischen:**
- CleaniDoc GmbH, [Adresse], nachfolgend „Anbieter"
- [Kunde], [Adresse], nachfolgend „Teilnehmer"

## 1. Zweck und Gegenstand

Der Teilnehmer testet das **CleaniDoc HACCP-Export-System** zur automatisierten Übermittlung digitaler Reinigungsprotokolle in maschinenlesbarer Form.

**Leistungsumfang:**
- ✅ Tägliche PDF-Protokolle (A4, druckfertig)
- ✅ CSV-Datenexporte (UTF-8, 3 Dateien pro Tag)
- ✅ JSON-Manifest mit Prüfsummen (SHA-256)
- ✅ E-Mail-Versand + optional SFTP/Webhook
- ✅ Kundenportal für Archiv-Zugriff
- ✅ DSGVO-konforme Speicherung (EU-Region)

## 2. Laufzeit

**Testphase:** 60 Kalendertage ab Freischaltung
**Beginn:** [Datum eintragen]
**Ende:** [Datum eintragen]

**Verlängerung:** Nach beiderseitigem Einverständnis um weitere 30 Tage möglich.

## 3. Kosten

**Pilotphase:** kostenfrei
**Bei Übernahme:** Reguläre Tarife gemäß aktueller Preisliste

## 4. Technische Spezifikationen

### CSV-Schema
- **Format:** UTF-8, Semikolon-getrennt
- **Dateien:** `logs`, `steps`, `photos` (täglich)
- **Versionierung:** Schema v1.0 (rückwärtskompatibel)
- **Dokumentation:** Datenwörterbuch beiliegend

### Lieferung
- **Zeit:** Täglich um 06:00 Uhr (Europe/Berlin)
- **E-Mail:** PDF + ZIP-Archiv an [E-Mail-Adressen]
- **Optional:** SFTP-Upload, Webhook-Benachrichtigung

### Datensicherheit
- **Verschlüsselung:** AES-256 (S3-SSE)
- **Zugriff:** Pre-signed URLs (24h gültig)
- **Aufbewahrung:** 24 Monate
- **Löschung:** Automatisch nach Frist + 7 Tage Vorwarnung

## 5. Teilnehmer-Verpflichtungen

Der Teilnehmer stellt bereit:
- **Ansprechperson:** IT-Verantwortlicher für Integration
- **Testumgebung:** Für CSV-Import-Tests
- **Feedback:** Wöchentliche Statusmeldung
- **Abnahme:** Prüfung gegen Anforderungskatalog

## 6. Feedback-Zyklen

**Alle 14 Tage:** Abstimmungstermin (30 Min.)
- Funktionalität bewerten
- Änderungswünsche dokumentieren
- Integrationshürden besprechen
- Go/No-Go für Produktivbetrieb

## 7. Qualitäts-Gates

**Pilot erfolgreich, wenn:**
- [ ] PDF-Protokolle korrekt und vollständig
- [ ] CSV-Import in Teilnehmer-System funktioniert
- [ ] E-Mail-Zustellung zuverlässig (>99%)
- [ ] Prüfsummen validierbar
- [ ] Performance akzeptabel (<5min Export)
- [ ] Support-Anfragen <2h Reaktionszeit

## 8. Datenschutz

**Auftragsverarbeitung:** Nach Art. 28 DSGVO
**Datenstandort:** EU (Frankfurt/Irland)
**Zweck:** HACCP-Dokumentation, keine weiteren Analysen
**Löschung:** 24 Monate nach Erzeugung

**AVV:** Separates Dokument beiliegend

## 9. Beendigung

**Ordentlich:** 7 Tage Frist zum Monatsende
**Außerordentlich:** Bei schwerwiegenden Mängeln sofort

**Datenrückgabe:** Vollständiger Export als ZIP + Manifest innerhalb 14 Tagen

## 10. Gewährleistung & Haftung

**Pilotphase:** Best-Effort, keine SLA-Garantien
**Haftung:** Begrenzt auf grobe Fahrlässigkeit
**Datenverlust:** Backup-Verfahren nach Stand der Technik

## 11. Ansprechpartner

**CleaniDoc:**
- **Technik:** [Name], [E-Mail], [Telefon]
- **Projekt:** [Name], [E-Mail], [Telefon]

**Teilnehmer:**
- **IT-Verantwortlicher:** [Name], [E-Mail], [Telefon]
- **Fachbereich:** [Name], [E-Mail], [Telefon]

## 12. Übernahme in Regelbetrieb

Bei erfolgreichem Pilot:
- **Vertragswechsel:** Auf Hauptvertrag CleaniDoc
- **Migrationsplan:** Nahtloser Übergang ohne Datenverlust
- **Preise:** Gemäß gültiger Preisliste zum Übernahmezeitpunkt

---

**Ort, Datum:**
[Stadt], [Datum]

**Anbieter:**
CleaniDoc GmbH

_______________________
[Name], Geschäftsführer

**Teilnehmer:**
[Firmenname]

_______________________
[Name], [Funktion]

---

**Anlagen:**
- Datenwörterbuch CSV-Schema v1.0
- Auftragsverarbeitungsvertrag (AVV)
- Webhook-Payload-Beispiel (falls gewünscht)
- Technische Integrationshilfe