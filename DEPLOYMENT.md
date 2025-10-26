# 🚀 CleaniDoc Deployment Guide

## Problem: "Ich sehe nur Quellcode im Browser"

Wenn Sie rohen JavaScript-Code statt der App sehen, bedeutet das:
- ❌ Die App wurde **nicht kompiliert**
- ❌ Dependencies wurden **nicht installiert**
- ❌ Sie greifen auf **rohe Dateien** statt auf den Build zu

## ✅ Lösung: Proper Build & Deployment

---

## 🖥️ Lokale Entwicklung

### 1. Dependencies installieren

```bash
cd /home/user/CleaniDoc
npm install
```

Dies installiert alle benötigten Pakete in `node_modules/`.

### 2. Umgebungsvariablen setzen

Erstellen Sie `.env`:

```bash
cp .env.example .env
```

Bearbeiten Sie `.env` und tragen Sie Ihre Supabase-Credentials ein:

```env
REACT_APP_SUPABASE_URL=https://ihr-projekt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=ihr-anon-key-hier
```

### 3. Entwicklungsserver starten

```bash
npm start
```

Die App läuft nun unter [http://localhost:3000](http://localhost:3000)

**Wichtig:** Sie müssen `npm start` verwenden, **NICHT** einfach die HTML-Datei öffnen!

---

## ☁️ Vessel Deployment

### Schritt 1: Projekt vorbereiten

Stellen Sie sicher, dass folgende Dateien vorhanden sind:
- ✅ `package.json`
- ✅ `vessel.json` (bereits erstellt)
- ✅ `.env.example`
- ✅ `public/_redirects`

### Schritt 2: Vessel-Projekt erstellen

1. Gehen Sie zu [Vessel Dashboard](https://vessel.land)
2. Klicken Sie auf "New Project"
3. Wählen Sie Ihr Git-Repository

### Schritt 3: Build-Einstellungen konfigurieren

In Vessel-Einstellungen:

```
Framework Preset: Create React App
Build Command: npm install && npm run build
Output Directory: build
Install Command: npm install
Node Version: 18.x
```

### Schritt 4: Umgebungsvariablen setzen

Im Vessel Dashboard unter "Environment Variables":

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | `https://ihr-projekt.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `Ihr Anon Key` |

⚠️ **WICHTIG:** Ohne diese Variablen zeigt die App eine Fehlermeldung!

### Schritt 5: Deploy

Klicken Sie auf "Deploy" - Vessel wird:
1. Dependencies installieren (`npm install`)
2. Build erstellen (`npm run build`)
3. Die App aus dem `build/` Ordner ausliefern

---

## 🔷 Vercel Deployment (Alternative)

### Option A: Via Vercel Dashboard

1. Gehen Sie zu [Vercel](https://vercel.com)
2. "Add New Project" → Import Git Repository
3. Vercel erkennt automatisch Create React App
4. Fügen Sie Umgebungsvariablen hinzu:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
5. Klicken Sie auf "Deploy"

### Option B: Via Vercel CLI

```bash
# Vercel CLI installieren
npm i -g vercel

# In Projekt-Verzeichnis wechseln
cd /home/user/CleaniDoc

# Deploy starten
vercel

# Umgebungsvariablen hinzufügen
vercel env add REACT_APP_SUPABASE_URL
vercel env add REACT_APP_SUPABASE_ANON_KEY

# Production deployment
vercel --prod
```

---

## 🌐 Netlify Deployment (Alternative)

### Option A: Via Netlify Dashboard

1. Gehen Sie zu [Netlify](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. Verbinden Sie Ihr Git-Repository
4. Build-Einstellungen:
   ```
   Build command: npm run build
   Publish directory: build
   ```
5. Environment Variables hinzufügen:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
6. Deploy

### Option B: Via Netlify CLI

```bash
# Netlify CLI installieren
npm install -g netlify-cli

# In Projekt-Verzeichnis
cd /home/user/CleaniDoc

# Deployment initiieren
netlify deploy --prod

# Bei Aufforderung:
# Publish directory: build
```

---

## 🐳 Docker Deployment (Erweitert)

Erstellen Sie `Dockerfile`:

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Erstellen Sie `nginx.conf`:

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Build und Run:

```bash
docker build -t cleanidoc-web .
docker run -p 80:80 \
  -e REACT_APP_SUPABASE_URL=https://ihr-projekt.supabase.co \
  -e REACT_APP_SUPABASE_ANON_KEY=ihr-key \
  cleanidoc-web
```

---

## 🔧 Troubleshooting

### Problem: "Ich sehe nur Quellcode"

**Ursache:** Sie greifen auf ungekompilierte Dateien zu.

**Lösung:**
1. Stellen Sie sicher, dass `npm install` ausgeführt wurde
2. Erstellen Sie den Build: `npm run build`
3. Liefern Sie Dateien aus `build/` aus, **NICHT** aus `src/` oder `public/`
4. Verwenden Sie einen korrekten Webserver (npm start, oder Static File Server für build/)

### Problem: "Blank Page nach Deployment"

**Ursache:** Umgebungsvariablen fehlen.

**Lösung:**
1. Öffnen Sie Browser-Konsole (F12)
2. Sie sollten eine Fehlermeldung mit Anleitung sehen
3. Setzen Sie die Umgebungsvariablen in Ihrer Deployment-Plattform
4. Triggern Sie einen Re-Deploy

### Problem: "404 beim Navigieren"

**Ursache:** SPA-Routing wird nicht unterstützt.

**Lösung:**
- Für Vessel/Vercel: `vercel.json` wurde bereits erstellt ✅
- Für Netlify: `public/_redirects` wurde bereits erstellt ✅
- Für Nginx: Verwenden Sie `try_files $uri /index.html`

### Problem: "npm install" schlägt fehl

```bash
# Cache leeren
npm cache clean --force

# node_modules löschen
rm -rf node_modules package-lock.json

# Neu installieren
npm install
```

---

## 📝 Checkliste vor Deployment

- [ ] `.env` Datei erstellt (lokal)
- [ ] Dependencies installiert: `npm install`
- [ ] Build funktioniert: `npm run build`
- [ ] Lokaler Test erfolgreich: `npm start`
- [ ] Umgebungsvariablen in Deployment-Plattform gesetzt
- [ ] `vessel.json` oder `vercel.json` vorhanden
- [ ] Git committed und pushed

---

## 🎯 Quick Commands

```bash
# Lokale Entwicklung
npm install              # Dependencies installieren
npm start                # Dev-Server starten (localhost:3000)

# Production Build
npm run build            # Build erstellen
npx serve -s build       # Build lokal testen

# Tests
npm test                 # Tests ausführen

# Deployment
git add .
git commit -m "Update app"
git push                 # Vessel/Vercel deployed automatisch
```

---

## 📞 Support

Wenn Sie weiterhin Probleme haben:
1. Öffnen Sie Browser-Console (F12) und prüfen Sie Fehlermeldungen
2. Prüfen Sie Deployment-Logs in Ihrer Plattform
3. Erstellen Sie ein GitHub Issue

**Hinweis:** Stellen Sie immer sicher, dass Sie die **kompilierte Version** (`build/`) ausliefern, nicht die Quellcode-Dateien!
