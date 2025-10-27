# CleaniDoc Dashboard - Deployment Guide

## Vercel Deployment Setup

### 1. Umgebungsvariablen konfigurieren

Bevor du das Projekt auf Vercel deployest, musst du die folgenden Umgebungsvariablen im Vercel Dashboard konfigurieren:

#### Vercel Dashboard → Settings → Environment Variables:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Lokale Entwicklung

1. Kopiere `.env.example` zu `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fülle die Supabase-Werte in `.env.local` aus

3. Starte die Entwicklung:
   ```bash
   npm start
   ```

### 3. Build & Deployment

Das Projekt wird automatisch deployed, wenn Änderungen an den `master` Branch gepusht werden.

#### Manueller Build-Test:
```bash
npm run build
serve -s build
```

### 4. Troubleshooting

#### "supabaseKey is required" Fehler:
- Überprüfe, ob die Umgebungsvariablen in Vercel gesetzt sind
- Vercel Dashboard → Project → Settings → Environment Variables
- Nach dem Setzen der Variablen: Redeploy auslösen

#### Blank Page auf Vercel:
- `vercel.json` ist bereits konfiguriert für React Router
- Prüfe Browser-Konsole für JavaScript-Fehler

### 5. Vercel-spezifische Konfiguration

Die `vercel.json` Datei ist bereits konfiguriert:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Dies sorgt dafür, dass Client-Side-Routing korrekt funktioniert.