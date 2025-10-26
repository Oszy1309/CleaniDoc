# 🧹 CleaniDoc - Reinigungsverwaltung

CleaniDoc ist eine umfassende Lösung zur Verwaltung von Reinigungsdiensten, bestehend aus einer Web-App für Administratoren und einer Mobile-App für Mitarbeiter.

## 📦 Projektstruktur

```
CleaniDoc/
├── cleanidoc-webapp/       # 🌐 Web-App (React)
│   ├── src/                # React-Komponenten
│   ├── public/             # Statische Dateien
│   ├── package.json
│   └── README.md           # Web-App Dokumentation
│
├── cleanidoc-mobile/       # 📱 Mobile-App (React Native/Expo)
│   ├── src/
│   ├── package.json
│   └── README.md           # Mobile-App Dokumentation
│
├── .gitignore
└── README.md              # Diese Datei
```

## 🚀 Quick Start

### Web-App (Admin)

```bash
cd cleanidoc-webapp
npm install
cp .env.example .env
# .env bearbeiten und Supabase-Credentials eintragen
npm start
```

📖 Siehe [cleanidoc-webapp/README.md](./cleanidoc-webapp/README.md) für Details

### Mobile-App (Mitarbeiter)

```bash
cd cleanidoc-mobile
npm install
cp .env.example .env
# .env bearbeiten und Supabase-Credentials eintragen
npm start
```

📖 Siehe [cleanidoc-mobile/README.md](./cleanidoc-mobile/README.md) für Details

## ✨ Features

### 🌐 Web-App (Admin)
- ✅ Dashboard mit Übersicht
- ✅ Kundenverwaltung
- ✅ Reinigungspläne erstellen und verwalten
- ✅ Mitarbeiterverwaltung
- ✅ Tägliche Berichte
- ✅ Protokollarchiv

### 📱 Mobile-App (Mitarbeiter)
- ✅ Aufgabenliste
- ✅ Schritt-für-Schritt Anleitungen
- ✅ Digitale Unterschrift
- ✅ Fortschritts-Tracking

## 🏗️ Tech Stack

### Web-App
- React 18
- React Router v6
- Supabase
- Create React App

### Mobile-App
- React Native 19.1
- Expo ~54
- React Navigation v7
- Supabase

## 🔐 Authentifizierung

Beide Apps nutzen **Supabase Authentication**:

- **Admin-Login**: Web-App unter `/`
- **Mitarbeiter-Login**:
  - Web: `/worker-login`
  - Mobile: Native Login-Screen

## 🗄️ Datenbank

Gemeinsame Supabase-Datenbank für beide Apps:

- `customers` - Kundendaten
- `workers` - Mitarbeiter
- `areas` - Reinigungsbereiche
- `cleaning_plans` - Reinigungspläne
- `cleaning_logs` - Reinigungsaufgaben
- `cleaning_log_steps` - Arbeitsschritte

## 🚀 Deployment

### Web-App
Unterstützte Plattformen:
- Vessel
- Vercel
- Netlify
- Docker

→ Siehe [cleanidoc-webapp/DEPLOYMENT.md](./cleanidoc-webapp/DEPLOYMENT.md)

### Mobile-App
Unterstützte Plattformen:
- Expo Application Services (EAS)
- Google Play Store
- Apple App Store

→ Siehe [cleanidoc-mobile/README.md](./cleanidoc-mobile/README.md)

## 🆘 Troubleshooting

### Web-App zeigt nur Quellcode
→ Siehe [cleanidoc-webapp/QUICKSTART.md](./cleanidoc-webapp/QUICKSTART.md)

### Blank Page nach Deployment
1. Prüfen Sie Browser-Konsole (F12)
2. Stellen Sie sicher, dass Umgebungsvariablen gesetzt sind
3. Prüfen Sie Deployment-Logs

### Mobile-App startet nicht
```bash
cd cleanidoc-mobile
npx expo start -c  # Cache löschen
```

## 📄 Lizenz

© 2024 CleaniDoc. Alle Rechte vorbehalten.

---

**Version**: 1.0.0
**Zuletzt aktualisiert**: Oktober 2024
