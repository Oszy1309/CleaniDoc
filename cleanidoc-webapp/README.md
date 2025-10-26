# 🧹 CleaniDoc Web-App

Web-basierte Admin-Anwendung für die Reinigungsverwaltung.

> 🚨 **Sehen Sie nur Quellcode im Browser?** → Lesen Sie [QUICKSTART.md](./QUICKSTART.md)
>
> 📦 **Deployment auf Vessel/Vercel/Netlify?** → Lesen Sie [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🚀 Quick Start

### 1. Dependencies installieren

```bash
cd cleanidoc-webapp
npm install
```

### 2. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Bearbeiten Sie `.env` und tragen Sie Ihre Supabase-Credentials ein:

```env
REACT_APP_SUPABASE_URL=https://ihr-projekt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=ihr-anon-key
```

### 3. Entwicklungsserver starten

```bash
npm start
```

Die App öffnet sich unter [http://localhost:3000](http://localhost:3000)

## 📦 Production Build

```bash
npm run build
```

Die optimierten Dateien befinden sich im `build/` Ordner.

## ✨ Features

- ✅ Dashboard mit Übersicht
- ✅ Kundenverwaltung
- ✅ Reinigungspläne erstellen und verwalten
- ✅ Mitarbeiterverwaltung
- ✅ Tägliche Berichte
- ✅ Protokollarchiv
- ✅ Cleaning Logs Verwaltung

## 🏗️ Tech Stack

- **Framework:** React 18
- **Routing:** React Router v6
- **Backend:** Supabase
- **Styling:** CSS (Global Design System)
- **Build Tool:** Create React App (react-scripts)

## 📁 Projektstruktur

```
cleanidoc-webapp/
├── public/              # Statische Dateien
│   ├── index.html       # HTML-Template
│   └── _redirects       # SPA-Routing (Netlify)
├── src/
│   ├── components/      # Wiederverwendbare Komponenten
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   └── ...
│   ├── pages/           # Seiten/Routen
│   │   ├── Dashboard.js
│   │   ├── Customers.js
│   │   ├── CleaningPlans.js
│   │   └── ...
│   ├── styles/          # CSS-Dateien
│   │   └── global-design-system.css
│   ├── App.js           # Haupt-App-Komponente
│   └── index.js         # Entry Point
├── package.json         # Dependencies
├── .env.example         # Umgebungsvariablen-Vorlage
├── vessel.json          # Vessel-Konfiguration
└── vercel.json          # Vercel-Konfiguration
```

## 🔐 Authentifizierung

- Admin-Login unter `/`
- Mitarbeiter-Login unter `/worker-login`
- Verwendet Supabase Authentication

## 🗄️ Datenbank-Tabellen

- `customers` - Kundendaten
- `workers` - Mitarbeiter
- `areas` - Reinigungsbereiche
- `cleaning_plans` - Reinigungspläne
- `cleaning_logs` - Reinigungsaufgaben
- `cleaning_log_steps` - Arbeitsschritte

## 🚀 Deployment

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für detaillierte Anleitungen zu:
- Vessel
- Vercel
- Netlify
- Docker

## 🐛 Troubleshooting

**Problem: Blank Page**
→ Prüfen Sie Browser-Konsole und stellen Sie sicher, dass Umgebungsvariablen gesetzt sind

**Problem: Roher Quellcode sichtbar**
→ Siehe [QUICKSTART.md](./QUICKSTART.md)

**Problem: Build schlägt fehl**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 Lizenz

© 2024 CleaniDoc. Alle Rechte vorbehalten.
