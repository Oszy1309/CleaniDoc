# 🚨 WICHTIG: Supabase Konfiguration

## Problem: Login funktioniert nicht?

Das liegt daran, dass die Supabase-Verbindung noch nicht konfiguriert ist!

## Lösung: .env Datei erstellen

### Schritt 1: Supabase Credentials finden

Öffnen Sie Ihr Supabase-Dashboard und finden Sie:
- **Project URL**: https://xxx.supabase.co
- **anon/public Key**: Ein langer String (beginnt mit "eyJ...")

Diese Werte sind die gleichen wie in Ihrer Web-App!

### Schritt 2: .env Datei erstellen

Im Verzeichnis `cleanidoc-mobile/` erstellen Sie eine neue Datei namens `.env`:

```bash
cd cleanidoc-mobile
touch .env
```

### Schritt 3: Credentials eintragen

Öffnen Sie die `.env` Datei und fügen Sie folgendes ein:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ihre-projekt-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ihr-anon-key-hier-einfügen
```

**Wichtig:** Ersetzen Sie die Werte mit Ihren echten Supabase-Credentials!

### Schritt 4: App neu starten

```bash
# Expo-Server stoppen (Ctrl+C)
# Dann neu starten:
npm start
```

**Wichtig:** Drücken Sie in Expo Go auf "Reload" oder schütteln Sie Ihr Gerät und wählen Sie "Reload".

---

## Wo finde ich meine Supabase Credentials?

### Option 1: Supabase Dashboard
1. Öffnen Sie https://supabase.com
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Settings** → **API**
4. Kopieren Sie:
   - **Project URL**
   - **anon public** Key (unter "Project API keys")

### Option 2: Aus der Web-App
Ihre Web-App nutzt die gleichen Credentials. Schauen Sie in:
- Umgebungsvariablen (`.env` Datei)
- Hosting-Plattform (z.B. Vercel, Netlify)
- Build-Konfiguration

---

## Test: Funktioniert die Verbindung?

Wenn Sie die App jetzt öffnen, sollten Sie in der Console sehen:

### ✅ Korrekt konfiguriert:
```
🔐 Login-Versuch für: test@example.com
✅ Supabase Auth erfolgreich
📋 Lade Mitarbeiter-Daten für User-ID: ...
✅ Mitarbeiter-Daten geladen: Max Mustermann
```

### ❌ Nicht konfiguriert:
```
⚠️ WARNUNG: Supabase Credentials nicht konfiguriert!
Bitte .env Datei erstellen mit:
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

## Häufige Fehler

### "Invalid API key"
→ Der Anon Key ist falsch. Kopieren Sie ihn neu aus Supabase.

### "Network request failed"
→ Prüfen Sie:
1. Ist die URL korrekt? (muss mit `https://` beginnen)
2. Haben Sie Internet?
3. Ist Ihr Supabase-Projekt aktiv?

### "Kein Mitarbeiter-Eintrag für diesen User gefunden"
→ Der User existiert in Supabase Auth, aber nicht in der `workers` Tabelle.
→ Lösung: Erstellen Sie einen Eintrag in der `workers` Tabelle mit der gleichen `user_id`.

---

## Sicherheitshinweis

Die `.env` Datei ist in `.gitignore` eingetragen und wird **NICHT** zu Git committed.
Das schützt Ihre Credentials vor versehentlichem Upload.

---

## Benötigen Sie Hilfe?

Wenn es immer noch nicht funktioniert:
1. Schauen Sie in die Console Logs (Expo Terminal)
2. Prüfen Sie die Browser-Console in Expo Go
3. Kontaktieren Sie den Support
