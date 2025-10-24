# 🧹 CleaniDoc Mitarbeiter-App

Mobile App für CleaniDoc Mitarbeiter zur Verwaltung und Abarbeitung von Reinigungsaufgaben.

## 📱 Features

### ✅ Für Mitarbeiter
- **Sichere Anmeldung** mit E-Mail und Passwort
- **Aufgabenliste** mit allen zugewiesenen Reinigungsaufgaben
- **Schritt-für-Schritt Anleitung** für jeden Reinigungsplan
- **Fortschritts-Tracking** mit Checkliste
- **Digitale Unterschrift** zur Bestätigung erledigter Arbeiten
- **Offline-fähig** (geplant für zukünftige Versionen)
- **Push-Benachrichtigungen** (geplant)

### 🔒 Eingeschränkte Rechte
Mitarbeiter haben **NUR** Zugriff auf:
- Ihre eigenen zugewiesenen Aufgaben
- Aufgabendetails und Arbeitsschritte
- Unterschriftenfunktion

Mitarbeiter haben **KEINEN** Zugriff auf:
- Kundenverwaltung
- Mitarbeiterverwaltung
- Admin-Dashboard
- Reinigungsplan-Erstellung

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js (v18+)
- npm oder yarn
- Expo Go App auf Ihrem Smartphone (für Entwicklung)
- iOS/Android Entwicklungsumgebung (für Production Builds)

### 1. Dependencies installieren

```bash
cd cleanidoc-mobile
npm install
```

### 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei basierend auf `.env.example`:

```bash
cp .env.example .env
```

Tragen Sie Ihre Supabase-Credentials ein (dieselben wie in der Web-App):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. App starten

#### Entwicklungsmodus (mit Expo Go)

```bash
npm start
```

Scannen Sie den QR-Code mit:
- **iOS**: Kamera-App
- **Android**: Expo Go App

#### iOS Simulator (nur macOS)

```bash
npm run ios
```

#### Android Emulator

```bash
npm run android
```

## 📦 Production Build

### Option 1: Expo Application Services (EAS) - Empfohlen

```bash
# EAS CLI installieren
npm install -g eas-cli

# Bei Expo anmelden
eas login

# Projekt konfigurieren
eas build:configure

# Android Build
eas build --platform android

# iOS Build (benötigt Apple Developer Account)
eas build --platform ios
```

### Option 2: Lokaler Build

#### Android APK

```bash
npm run build:android
```

#### iOS App

```bash
npm run build:ios
```

## 🗂️ Projektstruktur

```
cleanidoc-mobile/
├── src/
│   ├── screens/           # App-Screens
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   └── TaskDetailScreen.js
│   ├── components/        # Wiederverwendbare Komponenten
│   │   └── SignatureModal.js
│   ├── context/           # React Context (Auth)
│   │   └── AuthContext.js
│   ├── config/            # Konfiguration
│   │   └── supabase.js
│   ├── services/          # API Services (geplant)
│   └── utils/             # Hilfsfunktionen (geplant)
├── assets/                # Bilder, Icons
├── App.js                 # Haupt-App Komponente
├── app.json               # Expo Konfiguration
└── package.json
```

## 🔐 Authentifizierung

Die App verwendet **Supabase Authentication** mit den gleichen User-Daten wie die Web-App:

1. Mitarbeiter melden sich mit E-Mail und Passwort an
2. Die App lädt automatisch die Mitarbeiter-Daten aus der `workers` Tabelle
3. Nur Aufgaben, die dem angemeldeten Mitarbeiter zugewiesen sind, werden angezeigt

## 📊 Datenbank-Schema

Die App greift auf folgende Supabase-Tabellen zu:

- `workers` - Mitarbeiter-Informationen
- `cleaning_logs` - Reinigungsaufgaben
- `cleaning_log_steps` - Arbeitsschritte pro Aufgabe
- `customers` - Kundendaten (nur lesend)
- `areas` - Bereiche (nur lesend)
- `cleaning_plans` - Reinigungspläne (nur lesend)

## 🎨 Customization

### App-Name und Branding

Ändern Sie in `app.json`:

```json
{
  "expo": {
    "name": "Ihr App-Name",
    "slug": "ihr-app-slug"
  }
}
```

### Farben

Hauptfarben können in den Screen-Dateien angepasst werden:
- Primärfarbe: `#007AFF` (iOS Blau)
- Erfolg: `#4CAF50` (Grün)
- Warnung: `#FF9800` (Orange)

### Icons und Splash Screen

Ersetzen Sie folgende Dateien in `assets/`:
- `icon.png` (1024x1024)
- `splash-icon.png` (1284x2778)
- `adaptive-icon.png` (1024x1024, nur Android)

## 📱 App veröffentlichen

### Google Play Store (Android)

1. Build mit EAS erstellen: `eas build --platform android`
2. Google Play Console Account erstellen
3. APK/AAB hochladen
4. Store-Listing ausfüllen
5. App zur Überprüfung einreichen

### Apple App Store (iOS)

1. Apple Developer Account benötigt ($99/Jahr)
2. Build mit EAS erstellen: `eas build --platform ios`
3. App Store Connect konfigurieren
4. App zur Überprüfung einreichen

## 🐛 Troubleshooting

### "Network request failed" Fehler

- Prüfen Sie Ihre `.env` Konfiguration
- Stellen Sie sicher, dass Supabase URL und Key korrekt sind
- Prüfen Sie Ihre Internetverbindung

### App startet nicht

```bash
# Cache löschen
npx expo start -c

# Node modules neu installieren
rm -rf node_modules
npm install
```

### Signatur funktioniert nicht

- Stellen Sie sicher, dass `react-native-signature-canvas` korrekt installiert ist
- Auf iOS: Prüfen Sie WebView Berechtigungen

## 📝 Workflow für Mitarbeiter

1. **Anmelden** mit E-Mail und Passwort
2. **Dashboard** zeigt alle zugewiesenen Aufgaben
3. **Aufgabe antippen** um Details zu sehen
4. **"Aufgabe starten"** antippen
5. **Schritte abhaken** während der Arbeit
6. **"Aufgabe abschließen"** antippen
7. **Unterschreiben** zur Bestätigung
8. Aufgabe wird als "Erledigt" markiert

## 🔄 Synchronisation mit Web-App

Die Mobile App und die Web-App nutzen **dieselbe Supabase-Datenbank**:

- Änderungen in der Web-App sind sofort in der Mobile App sichtbar
- Erledigte Aufgaben erscheinen in beiden Apps
- Echtzeit-Updates über Supabase Realtime (geplant)

## 🚧 Geplante Features

- [ ] Offline-Modus mit lokaler Datenspeicherung
- [ ] Foto-Upload für Reinigungsprotokolle
- [ ] Push-Benachrichtigungen für neue Aufgaben
- [ ] QR-Code Scanner für schnellen Check-In
- [ ] Zeiterfassung pro Aufgabe
- [ ] Chat-Funktion mit Admin
- [ ] Mehrsprachigkeit (Englisch, Türkisch)

## 📄 Lizenz

© 2024 CleaniDoc. Alle Rechte vorbehalten.

## 🆘 Support

Bei Fragen oder Problemen:
- GitHub Issues: [Repository URL]
- E-Mail: support@cleanidoc.de

---

**Version**: 1.0.0
**Zuletzt aktualisiert**: Oktober 2024
