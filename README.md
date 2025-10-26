# 🧹 CleaniDoc - Reinigungsverwaltung

CleaniDoc ist eine umfassende Lösung zur Verwaltung von Reinigungsdiensten, bestehend aus einer Web-App für Administratoren und einer Mobile-App für Mitarbeiter.

## 📦 Projektstruktur

```
CleaniDoc/
├── src/                    # Web-App (React)
│   ├── components/         # Wiederverwendbare Komponenten
│   ├── pages/              # Seiten/Routen
│   └── styles/             # CSS-Dateien
├── public/                 # Statische Dateien (Web)
├── cleanidoc-mobile/       # Mobile-App (React Native/Expo)
└── README.md              # Diese Datei
```

## 🚀 Quick Start - Web-App

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Supabase-Account mit konfiguriertem Projekt

### Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd CleaniDoc
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**

   Erstellen Sie eine `.env` Datei im Projektverzeichnis:
   ```bash
   cp .env.example .env
   ```

   Tragen Sie Ihre Supabase-Credentials ein:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   > **Wichtig:** Diese Werte finden Sie in Ihrem [Supabase Dashboard](https://app.supabase.com) unter Settings → API

4. **Entwicklungsserver starten**
   ```bash
   npm start
   ```

   Die App öffnet sich automatisch unter [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
```

Die optimierten Dateien befinden sich im `build/` Ordner.

## 🔧 Deployment

### Vessel (oder andere Plattformen)

1. **Umgebungsvariablen setzen**

   Konfigurieren Sie in Ihrer Deployment-Plattform (Vessel, Vercel, Netlify, etc.) die folgenden Umgebungsvariablen:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

2. **Build-Befehl**: `npm run build`
3. **Output-Verzeichnis**: `build`
4. **Install-Befehl**: `npm install`

### Troubleshooting: Blank Page

Wenn Sie eine leere Seite sehen:

1. **Prüfen Sie die Browser-Konsole** (F12 → Console)
   - Suchen Sie nach Fehlermeldungen

2. **Umgebungsvariablen überprüfen**
   - Stellen Sie sicher, dass `.env` existiert und korrekt konfiguriert ist
   - Bei Vessel/Cloud-Deployments: Prüfen Sie die Umgebungsvariablen in Ihrem Dashboard

3. **Cache leeren**
   ```bash
   # Dependencies neu installieren
   rm -rf node_modules package-lock.json
   npm install

   # Build-Cache leeren
   rm -rf build
   npm run build
   ```

4. **Supabase-Verbindung testen**
   - Öffnen Sie die Browser-Konsole
   - Sie sollten eine klare Fehlermeldung sehen, wenn die Credentials fehlen

## 📱 Mobile-App

Die Mobile-App für Mitarbeiter finden Sie im `cleanidoc-mobile/` Verzeichnis.

Siehe [cleanidoc-mobile/README.md](./cleanidoc-mobile/README.md) für Details.

## ✨ Features

### Web-App (Admin)
- ✅ Dashboard mit Übersicht
- ✅ Kundenverwaltung
- ✅ Reinigungspläne erstellen und verwalten
- ✅ Mitarbeiterverwaltung
- ✅ Tägliche Berichte
- ✅ Protokollarchiv

### Mobile-App (Mitarbeiter)
- ✅ Aufgabenliste
- ✅ Schritt-für-Schritt Anleitungen
- ✅ Digitale Unterschrift
- ✅ Fortschritts-Tracking

## 🔐 Authentifizierung

Das System verwendet Supabase Authentication:

- **Admin-Login**: Über Web-App unter `/`
- **Mitarbeiter-Login**:
  - Web: `/worker-login`
  - Mobile: Native Login-Screen

## 📊 Datenbank

Die App nutzt Supabase als Backend mit folgenden Haupttabellen:

- `customers` - Kundendaten
- `workers` - Mitarbeiter
- `areas` - Reinigungsbereiche
- `cleaning_plans` - Reinigungspläne
- `cleaning_logs` - Reinigungsaufgaben
- `cleaning_log_steps` - Arbeitsschritte

## 🆘 Support

Bei Problemen:

1. Prüfen Sie die Browser-Konsole auf Fehlermeldungen
2. Stellen Sie sicher, dass alle Umgebungsvariablen korrekt gesetzt sind
3. Prüfen Sie die Supabase-Verbindung
4. Erstellen Sie ein [GitHub Issue](../../issues)

## 📄 Lizenz

© 2024 CleaniDoc. Alle Rechte vorbehalten.

---

**Version**: 1.0.0
**Zuletzt aktualisiert**: Oktober 2024
