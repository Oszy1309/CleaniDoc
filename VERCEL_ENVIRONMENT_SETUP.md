# 🚀 Vercel Environment Variables - Setup Anleitung

## ⚠️ WICHTIG: API Keys gehören NICHT ins Repository!

Die API Keys sind jetzt aus dem Repository entfernt. Du MUSST sie in Vercel als Environment Variablen eintragen!

---

## 📋 Was du eintragen musst

### Schritt 1: Deine Supabase Credentials finden

1. Gehe zu https://app.supabase.com
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **API**
4. Kopiere folgende Werte:

```
Project URL:              https://mfzvuzwxkfbsogqdnnry.supabase.co
Service Role Secret:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Public API Key (anon):    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Schritt 2: JWT Secrets generieren

Öffne Terminal und führe aus:

```bash
node -e "console.log('JWT Secret: ' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('Refresh Secret: ' + require('crypto').randomBytes(32).toString('hex'))"
```

Kopiere die beiden generierten Strings.

### Schritt 3: In Vercel eintragen

1. Gehe zu https://vercel.com
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **Environment Variables**
4. Trage folgende Variablen ein:

| Variable Name | Wert | Beschreibung |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | `https://mfzvuzwxkfbsogqdnnry.supabase.co` | Deine Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (Service Role Secret) | Service Role Key (Backend nur!) |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGc...` (Public API Key) | Anonymous Key (Frontend) |
| `REACT_APP_JWT_SECRET` | (generiert von dir) | JWT Token Secret |
| `REACT_APP_JWT_REFRESH_SECRET` | (generiert von dir) | JWT Refresh Token Secret |
| `REACT_APP_API_URL` | `https://YOUR_VERCEL_DOMAIN/api` | Production API URL |
| `NODE_ENV` | `production` | Environment |

---

## 🔑 Environment Variables im Detail

### REACT_APP_SUPABASE_URL
```
Wert: https://mfzvuzwxkfbsogqdnnry.supabase.co
Quelle: Supabase Dashboard → Settings → API → Project URL
Verwendung: Frontend + Backend (öffentlich sicher)
```

### SUPABASE_SERVICE_ROLE_KEY
```
Wert: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
Quelle: Supabase Dashboard → Settings → API → Service role secret
Verwendung: BACKEND NUR (vertraulich!)
⚠️  NIEMALS im Frontend verwenden!
```

### REACT_APP_SUPABASE_ANON_KEY
```
Wert: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
Quelle: Supabase Dashboard → Settings → API → Public API Key (anon)
Verwendung: Frontend (öffentlich für Clients)
```

### REACT_APP_JWT_SECRET
```
Wert: (beliebige lange Random Hexadecimal String)
Generierung: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Verwendung: Backend JWT Token Signierung
```

### REACT_APP_JWT_REFRESH_SECRET
```
Wert: (beliebige lange Random Hexadecimal String)
Generierung: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Verwendung: Backend Refresh Token Signierung
```

### REACT_APP_API_URL
```
Wert (Development): http://localhost:5000
Wert (Production): https://YOUR_VERCEL_DOMAIN.vercel.app/api
Quelle: Deine Vercel Deployment Domain
```

---

## ✅ Schritte zum Eintragen in Vercel

1. **Vercel Dashboard öffnen**: https://vercel.com/dashboard
2. **Projekt auswählen**: CleaniDoc
3. **Settings klicken**
4. **Environment Variables klicken**
5. **Für jede Variable:**
   - Name eingeben (z.B. `REACT_APP_SUPABASE_URL`)
   - Wert einkopieren
   - Select Environment: `Production`, `Preview`, `Development`
   - **Save** klicken

### Beispiel Screenshot:
```
┌─ Add Environment Variable ──────────────────┐
│ Key: REACT_APP_SUPABASE_URL                 │
│ Value: https://mfzvuzwxkfbsogqdnnry...      │
│ Select environments:                        │
│   ☑ Production   ☑ Preview   ☑ Development │
│ [Save]                                      │
└─────────────────────────────────────────────┘
```

---

## 🔒 Sicherheit: Was ist sicher & was nicht?

### ✅ SICHER (darf öffentlich sichtbar sein):
- `REACT_APP_SUPABASE_URL` - Das ist nur die Projekt URL
- `REACT_APP_SUPABASE_ANON_KEY` - Anonymous Key (read-only für Clients)
- Frontend JavaScript Code

### ❌ NIEMALS öffentlich machen:
- `SUPABASE_SERVICE_ROLE_KEY` - Admin Key (Vollzugriff!)
- `REACT_APP_JWT_SECRET` - Token Signing Key
- `REACT_APP_JWT_REFRESH_SECRET` - Refresh Key
- `DATABASE_PASSWORD` - Falls du hast
- `.env` Dateien - IMMER in `.gitignore`!

### Wie prüfen, ob Keys sicher sind?
```bash
# Prüfe .gitignore
cat .gitignore

# Sollte enthalten:
# .env
# .env.local
# .env.*.local
```

---

## 🧪 Nach dem Setup testen:

1. **Neue Deployment in Vercel auslösen:**
   - Git push
   - oder manual redeploy

2. **Deployment logs prüfen:**
   - Supabase client initialized ✅
   - Keine Fehler über missing credentials

3. **Login testen:**
   - https://YOUR_VERCEL_DOMAIN.vercel.app/login
   - Email: oskar.bongard@proton.me
   - Password: password123

4. **Passwort ändern testen:**
   - Settings → Profile → Password Change

---

## ⚠️ Häufige Fehler

### "Missing Supabase credentials"
```
✗ Lösung: REACT_APP_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt
  → In Vercel Settings prüfen
  → Deployment redeploy mit Cmd+Click (hard reset)
```

### "Cannot read properties of undefined (reading 'users')"
```
✗ Lösung: API_URL falsch oder Backend lädt nicht
  → REACT_APP_API_URL prüfen (muss Vercel Domain sein)
  → API muss deployed sein (server.js läuft?)
```

### "JWT undefined"
```
✗ Lösung: JWT Secrets nicht gesetzt
  → REACT_APP_JWT_SECRET prüfen
  → REACT_APP_JWT_REFRESH_SECRET prüfen
```

---

## 📋 Checkliste

- [ ] REACT_APP_SUPABASE_URL eingegeben
- [ ] SUPABASE_SERVICE_ROLE_KEY eingegeben
- [ ] REACT_APP_SUPABASE_ANON_KEY eingegeben
- [ ] REACT_APP_JWT_SECRET generiert & eingegeben
- [ ] REACT_APP_JWT_REFRESH_SECRET generiert & eingegeben
- [ ] REACT_APP_API_URL auf Production Domain gesetzt
- [ ] NODE_ENV = production gesetzt
- [ ] Deployment neu ausgelöst (git push oder redeploy)
- [ ] Logs prüfen auf Fehler
- [ ] Login getestet
- [ ] Password Change getestet

---

## 🆘 Support

Falls was nicht klappt:

1. Vercel Logs prüfen:
   - Project → Settings → Functions (Backend Logs)
   - Deployments → View Logs

2. Browser Console prüfen:
   - F12 → Console
   - Auf Fehler checken

3. Supabase Status prüfen:
   - https://status.supabase.com
   - Sind Services online?

---

## 🎉 Danach:

✅ Deine App läuft in Production
✅ Alle API Keys sind sicher verstaut
✅ Deployment ist automatisiert
✅ Prêt à l'emploi! (Bereit zum Einsatz!)
