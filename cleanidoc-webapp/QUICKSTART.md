# ⚡ QUICKSTART - Problem "Quellcode sichtbar" beheben

## 🚨 Problem
Sie sehen im Browser rohen JavaScript-Code statt der Web-App.

## ✅ Schnelle Lösung (3 Schritte)

### 🔧 Für lokale Entwicklung:

#### Schritt 1: Dependencies installieren
```bash
cd cleanidoc-webapp
npm install
```
⏱️ Dauert ca. 2-3 Minuten

#### Schritt 2: Umgebungsvariablen setzen
```bash
# .env Datei erstellen
cp .env.example .env
```

Dann `.env` bearbeiten und eintragen:
```env
REACT_APP_SUPABASE_URL=https://IHR-PROJECT.supabase.co
REACT_APP_SUPABASE_ANON_KEY=IHR-ANON-KEY
```

📍 Diese Werte finden Sie hier: https://app.supabase.com → Ihr Projekt → Settings → API

#### Schritt 3: App starten
```bash
npm start
```

✅ Die App öffnet sich automatisch unter http://localhost:3000

---

### ☁️ Für Vessel Deployment:

#### Schritt 1: Repository pushen
```bash
git add .
git commit -m "Add build configuration"
git push
```

#### Schritt 2: Vessel konfigurieren

Im **Vessel Dashboard**:

1. **Build Settings:**
   - Framework: `Create React App`
   - Build Command: `npm install && npm run build`
   - Output Directory: `build`
   - Node Version: `18.x`

2. **Environment Variables** hinzufügen:
   ```
   REACT_APP_SUPABASE_URL = https://IHR-PROJECT.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = IHR-ANON-KEY
   ```

#### Schritt 3: Deploy triggern

Klicken Sie auf "Redeploy" - fertig! 🎉

---

## 🔍 Was war das Problem?

| ❌ Vorher | ✅ Nachher |
|-----------|-----------|
| Rohe Dateien wurden ausgeliefert | Build wird ausgeliefert |
| Kein Compiler lief | React wird kompiliert |
| `src/index.js` direkt aufgerufen | `build/index.html` wird geladen |

---

## 📖 Weitere Informationen

- **Vollständiger Deployment-Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Projekt-README:** [README.md](./README.md)

---

## 🆘 Immer noch Probleme?

### Browser zeigt Fehlermeldung?
→ Öffnen Sie Browser-Konsole (F12) und lesen Sie die Fehlermeldung

### Build schlägt fehl?
```bash
# Cache leeren und neu probieren
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Vessel zeigt Fehler?
→ Prüfen Sie die Deployment-Logs in Vessel Dashboard
→ Stellen Sie sicher, dass Umgebungsvariablen gesetzt sind

---

**TL;DR:** Führen Sie `npm install` und dann `npm start` aus. Öffnen Sie **NICHT** die HTML-Datei direkt!
