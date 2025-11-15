# 🔐 RBAC System Setup Guide

Anleitung zum Aktivieren des RBAC-Systems mit Audit Trail und RLS auf Supabase.

## 📋 Voraussetzungen

- Supabase-Projekt bereits erstellt
- Datenbankverbindung eingerichtet
- Admin-Zugang zum Supabase Dashboard

## 🚀 Installation (3 Schritte)

### Schritt 1: Migrations ausführen

1. **Supabase Dashboard öffnen**
   - Gehe zu: https://app.supabase.com
   - Wähle dein Projekt

2. **SQL Editor öffnen**
   - Navigiere zu: SQL Editor (linkes Menü)
   - Klick "New Query"

3. **Migration 002 ausführen** (RBAC Schema)
   ```
   Kopiere den gesamten Inhalt aus:
   database/migrations/002_rbac_system.sql

   Paste im SQL Editor und klick "Run"
   ```

4. **Migration 003 ausführen** (RLS Policies)
   ```
   Kopiere den gesamten Inhalt aus:
   database/migrations/003_rls_policies.sql

   Paste im SQL Editor und klick "Run"
   ```

### Schritt 2: RLS aktivieren für alle Tabellen

Führe folgende SQL aus um RLS auf **bestehenden** Tabellen zu aktivieren:

```sql
-- Aktiviere RLS auf bestehenden Tabellen
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;

-- Verifiziere RLS Status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Schritt 3: Verifikation

```sql
-- Verifiziere dass alle Tabellen erstellt wurden
SELECT COUNT(*) as role_count FROM roles;
SELECT COUNT(*) as perm_count FROM permissions;
SELECT COUNT(*) as rp_count FROM role_permissions;

-- Prüfe ob RLS Policies vorhanden sind
SELECT * FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Prüfe Hash-Chain Funktion
SELECT * FROM pg_proc
WHERE proname = 'create_audit_event';
```

---

## 💻 Frontend Integration

### 1. Importiere den RBAC Hook

```jsx
import { useRBAC } from './hooks/useRBAC';

function MyComponent() {
  const { hasPermission, can, user, role } = useRBAC();

  if (!can.viewShifts()) {
    return <p>Keine Berechtigung</p>;
  }

  return <div>Deine Shifts...</div>;
}
```

### 2. Nutze den Audit Service

```jsx
import auditService from './services/auditService';

async function handleTaskComplete(taskId) {
  // ... update task logic ...

  // Log die Aktion
  await auditService.logAction(
    'update',
    'tasks',
    taskId,
    'Task: Reinigung Büro A',
    { status: 'pending' },
    { status: 'completed' }
  );
}
```

### 3. Schütze Komponenten mit RBAC

```jsx
import { withRBAC } from './hooks/useRBAC';

const AdminPanel = () => <h1>Admin Bereich</h1>;

// Nur für Admin sichtbar
export default withRBAC(AdminPanel, 'users', 'create');
```

---

## 📊 Rollen & Berechtigungen

### Verfügbare Rollen

| Rolle | Beschreibung |
|-------|-------------|
| `admin` | Vollständiger Systemzugriff |
| `manager` | Standort-Supervision |
| `worker` | Task-Ausführung |
| `customer` | Einsicht eigener Verträge |
| `qa_manager` | Qualitätskontrolle |

### Verfügbare Berechtigungen (Resource × Action)

```
Shifts:    read, create, update, delete, sign, approve
Tasks:     read, create, update, delete, sign
Reports:   read, create, export
Users:     read, create, update, delete
Incidents: create, read, update
Documents: read, create, update
Audit:     read
```

### Permission Matrix

```javascript
// Scope values
'all'       - Zugriff auf alle Datensätze
'own'       - Nur eigene Datensätze
'team'      - Team-Datensätze
'location'  - Standort-Datensätze
'contract'  - Vertrags-Datensätze
```

---

## 🔍 Testing

### Test 1: RBAC Hook funktioniert

```jsx
// src/pages/RBACTest.jsx
import { useRBAC } from '../hooks/useRBAC';

export default function RBACTest() {
  const { role, permissions, can } = useRBAC();

  return (
    <div>
      <h2>Rolle: {role}</h2>
      <h3>Berechtigungen:</h3>
      <pre>{JSON.stringify(permissions, null, 2)}</pre>

      <h3>Schnelltests:</h3>
      <p>Can create shifts: {can.createShifts() ? '✅' : '❌'}</p>
      <p>Can sign tasks: {can.signTasks() ? '✅' : '❌'}</p>
      <p>Can export reports: {can.exportReports() ? '✅' : '❌'}</p>
    </div>
  );
}
```

### Test 2: Audit Trail funktioniert

```jsx
import auditService from '../services/auditService';

async function testAudit() {
  // Log eine Test-Aktion
  const result = await auditService.logAction(
    'update',
    'shifts',
    'test-id-123',
    'Test Shift'
  );

  console.log('Audit Event ID:', result?.id);

  // Verifiziere Hash-Kette
  const integrity = await auditService.verifyIntegrity();
  console.log('Hash-Kette intakt:', integrity.valid);

  // Hole Audit Log
  const events = await auditService.getAuditLog({ resource: 'shifts' });
  console.log('Audit Events:', events);
}
```

### Test 3: RLS funktioniert

```sql
-- Starte eine Session als Worker
-- (Supabase Dashboard: SQL Editor → "Connect as" dropdown)

SELECT * FROM cleaning_shifts;
-- Sollte nur eigene Shifts zeigen

SELECT * FROM tasks;
-- Sollte nur Tasks eigener Shifts zeigen

-- Versuche unauthorized zu lesen
SELECT * FROM users;
-- Sollte fehlschlagen (RLS Policy blocked)
```

### Test 4: Hash-Integrität

```javascript
// Verifiziere dass Hash-Kette nicht manipuliert wurde
const integrity = await auditService.verifyIntegrity(100);

if (integrity.valid) {
  console.log('✅ Hash-Kette ist intakt');
} else {
  console.error('❌ Integrität kompromittiert:', integrity.errors);
}
```

---

## 🛠️ Troubleshooting

### Problem: "RLS Policy does not exist"

**Lösung:**
```sql
-- Prüfe ob RLS aktiviert ist
ALTER TABLE cleaning_shifts ENABLE ROW LEVEL SECURITY;

-- Führe 003_rls_policies.sql erneut aus
```

### Problem: "role_permissions table not found"

**Lösung:**
```sql
-- Führe 002_rbac_system.sql erneut aus
-- Prüfe ob Fehler in der Ausführung waren
SELECT * FROM information_schema.tables
WHERE table_name = 'role_permissions';
```

### Problem: "Auth user not found"

**Lösung:**
```javascript
// Stelle sicher dass User eingeloggt ist
const { user } = await supabase.auth.getUser();
if (!user) {
  console.error('User nicht authentifiziert');
  // Redirect zu Login
}
```

### Problem: "Cannot insert into audit_events"

**Lösung:**
```sql
-- Prüfe Trigger auf audit_events
SELECT * FROM pg_trigger
WHERE tgrelname = 'audit_events';

-- Trigger sollten vorhanden sein:
-- audit_events_immutable (DELETE protection)
-- audit_events_no_update (UPDATE protection)
```

---

## 📈 Performance & Monitoring

### Audit Log Größe überwachen

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('audit_events')) as size,
  COUNT(*) as event_count
FROM audit_events;
```

### Ineffiziente Queries finden

```sql
-- Indizes prüfen
SELECT * FROM pg_indexes
WHERE tablename = 'audit_events';

-- Query Performance
EXPLAIN ANALYZE
SELECT * FROM audit_events
WHERE resource = 'shifts'
AND timestamp > now() - INTERVAL '7 days';
```

### Hash-Kette Integrität regelmäßig prüfen

```javascript
// Führe täglich aus (z.B. mit Cron-Job)
async function dailyAuditCheck() {
  const { valid, errors } = await auditService.verifyIntegrity();

  if (!valid) {
    // Alert Admin
    await sendAlert({
      level: 'CRITICAL',
      message: `Audit hash-chain broken: ${errors.length} issues`,
      errors
    });
  }
}
```

---

## 🔐 Security Best Practices

### 1. Service Role Key sicherheit

⚠️ **Warnung:** Teile den `service_role_key` **NIEMALS**
- Nur im Backend verwenden
- Umgehen RLS-Policies
- Für Admin-Operationen

```javascript
// ❌ FALSCH - Service Key im Frontend
const supabase = createClient(url, SERVICE_ROLE_KEY);

// ✅ RICHTIG - Nur anon Key im Frontend
const supabase = createClient(url, ANON_KEY);
```

### 2. Audit Log exportieren & archivieren

```javascript
// Monatlich archivieren
async function archiveAuditLogs() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const events = await auditService.getAuditLog(
    { startDate: startOfMonth },
    10000
  );

  const csv = auditService.exportAsCSV(events);
  // Speichere in S3 oder ähnlich
}
```

### 3. Regelmäßige Backups

```bash
# Täglich Backup
pg_dump postgresql://user:pass@host/db > backup-$(date +%Y%m%d).sql

# Mit Supabase: Settings → Backups → Enable Daily Backups
```

---

## 📚 Weitere Ressourcen

- **RBAC Hook Dokumentation**: `src/hooks/useRBAC.js`
- **Audit Service Dokumentation**: `src/services/auditService.js`
- **Implementierungs-Plan**: `IMPLEMENTATION_PLAN.md`
- **RLS Policies**: `database/migrations/003_rls_policies.sql`

---

## ✅ Deployment Checklist

- [ ] Migrations 002 & 003 ausgeführt
- [ ] RLS auf allen Tabellen aktiviert
- [ ] Audit Trigger funktionieren (`CREATE AUDIT_EVENTS`)
- [ ] RBAC Hook importierbar
- [ ] Audit Service importierbar
- [ ] Test-Komponente grün
- [ ] Hash-Integrität verifiziert
- [ ] Audit Log mindestens ein Event
- [ ] RLS-Policies testen pro Rolle
- [ ] Secrets in .env (nicht committed)

---

**Status**: ✅ Ready for Production
**Letzte Aktualisierung**: 2025-11-05
**Support**: Siehe IMPLEMENTATION_PLAN.md
