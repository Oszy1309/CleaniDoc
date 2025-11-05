# 🎯 Neue Features: RBAC, Audit & RLS

Überblick über die neu implementierten Sicherheits- und Zugriffskontroll-Features.

## 🔐 1. Role-Based Access Control (RBAC)

### Was ist RBAC?

RBAC ermöglicht **granulare Zugriffskontrolle** basierend auf Benutzerrollen:
- Verschiedene Rollen haben unterschiedliche Berechtigungen
- Berechtigungen sind auf spezifische Ressourcen/Aktionen beschränkt
- Scope ermöglicht weitere Einschränkungen (z.B. nur eigene Daten)

### 5 Rollen im System

| Rolle | Level | Zugriff | Beispiel |
|-------|-------|--------|---------|
| **Admin** | Highest | Alles | Nutzer verwalten, System-Settings |
| **Manager** (Schichtleiter) | High | Team-Daten | Standort-Shifts sehen, genehmigen |
| **Worker** (Mitarbeiter) | Medium | Eigene Daten | Eigene Shifts, Tasks abhaken |
| **Customer** (Kunde) | Low | Vertrags-Daten | Einsicht Reinigungsberichte |
| **QA Manager** | High | QC-Daten | Qualität kontrollieren, Reports |

### Berechtigungen pro Rolle

#### Admin
```
✅ Alles sehen & ändern
✅ Nutzer verwalten
✅ Rollen zuweisen
✅ Audit-Logs einsehen
✅ Alle Operationen
```

#### Manager (Schichtleiter)
```
✅ Team-Shifts sehen (Standort)
✅ Tasks des Teams ändern
✅ Shift genehmigen (Abnahme)
✅ Reports erstellen (Standort)
❌ Andere Manager sehen
❌ Nutzer-Management
```

#### Worker (Mitarbeiter)
```
✅ Eigene Shifts sehen
✅ Tasks abhaken + Fotos
✅ Signatur abgeben
✅ Incidents melden
❌ Team-Shifts sehen
❌ Reports erstellen
```

#### Customer (Kunde)
```
✅ Eigene Vertrags-Shifts sehen
✅ Reports einsehen (Read-Only)
✅ Abnahme-Fotos ansehen
❌ Tasks ändern
❌ Mitarbeiter sehen
❌ Pläne erstellen
```

---

## 📝 2. Audit Trail (Immutable Event Log)

### Was ist ein Audit Trail?

Ein **Audit Trail** ist ein unveränderliches Protokoll aller Benutzeraktionen:
- Wer? (Nutzer-ID)
- Was? (Aktion: create/update/delete)
- Wann? (Timestamp)
- Wo? (Resource: shifts, tasks, etc.)
- Mit Hashverkettung für Integrität

### Automatisch geloggte Aktionen

```
✅ Shift erstellt/aktualisiert
✅ Task abgehakt
✅ Foto hochgeladen
✅ Signatur abgegeben
✅ Report exportiert
✅ Nutzer-Rolle geändert
✅ Kunden-Abnahme erteilt
❌ Gescheiterte Logins (optional)
```

### Beispiel: Audit Log Entry

```json
{
  "id": 1234,
  "user_id": "abc-123-def",
  "timestamp": "2025-11-05T14:30:00Z",
  "action": "update",
  "resource": "tasks",
  "resource_id": "task-456",
  "resource_name": "Fenster putzen",
  "old_values": {
    "status": "pending",
    "assigned_to": null
  },
  "new_values": {
    "status": "completed",
    "assigned_to": "worker-789",
    "completed_at": "2025-11-05T14:30:00Z"
  },
  "previous_hash": "abc123...",
  "current_hash": "def456...",
  "ip_address": "192.168.1.1",
  "user_agent": "Chrome/120.0"
}
```

### Hash-Kette (Chain of Custody)

Jedes Audit-Event ist an das **vorherige Event gehasht**:
- **Immutability**: Wenn ein Event geändert wird → Hash ändert sich
- **Tampering Detection**: Geänderte Events sind sichtbar
- **Chronological Integrity**: Reihenfolge kann nicht manipuliert werden

```
Event 1: Hash = SHA256("action=create_shift..." + "")
Event 2: Hash = SHA256("action=update_shift..." + Event1.Hash)
Event 3: Hash = SHA256("action=sign_shift..." + Event2.Hash)

Wenn Event 2 manipuliert wird:
↓
SHA256 passt nicht mehr
↓
Event 3 referenziert falschen Hash
↓
Kette ist unterbrochen = TAMPERING DETECTED ✅
```

### Audit Log exportieren

```javascript
// Alle Events der letzten 7 Tage exportieren
const events = await auditService.getAuditLog({
  startDate: new Date(Date.now() - 7*24*60*60*1000),
  resource: 'shifts'
});

// Als CSV herunterladen
auditService.downloadAuditLog(events, 'shifts-audit-2025-11.csv');
```

---

## 🛡️ 3. Row Level Security (RLS)

### Was ist RLS?

RLS ist ein **Datenbank-Level** Security Feature:
- Implementiert in PostgreSQL (Supabase)
- Prüft jede Query und filtert Reihen nach Benutzer-Rolle
- Kann **nicht umgangen** werden (auch nicht im Backend)

### RLS in Aktion

```
Worker mit ID "alice-123" fragt an:
SELECT * FROM cleaning_shifts;

↓ RLS Policy prüft:
"workers_see_own_shifts" ON cleaning_shifts
  FOR SELECT USING (assigned_to = auth.uid())

↓ Alice bekommt nur:
- Shift 1: assigned_to = 'alice-123' ✅
- Shift 2: assigned_to = 'bob-456' ❌ (filtered)

Result: Nur Alices Shifts
```

### RLS Policies pro Rolle

#### Manager Policy (Standort-Level)
```sql
CREATE POLICY "managers_see_location_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'manager' AND
    location_id IN (
      SELECT location_id FROM users
      WHERE id = auth.uid()
    )
  );
```
**Effekt**: Manager sieht alle Shifts seines Standortes ✅

#### Customer Policy (Vertrags-Level)
```sql
CREATE POLICY "customers_see_contract_shifts" ON cleaning_shifts
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'customer' AND
    contract_id IN (
      SELECT id FROM contracts
      WHERE customer_id = auth.uid()
    )
  );
```
**Effekt**: Kunde sieht nur Shifts seines Vertrags ✅

---

## 💻 4. Frontend Integration

### Komponenten mit RBAC schützen

```jsx
import { useRBAC } from './hooks/useRBAC';

function AdminPanel() {
  const { can } = useRBAC();

  if (!can.manageUsers()) {
    return <div>❌ Zugriff verweigert</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin-only content */}
    </div>
  );
}
```

### Conditionale Rendering

```jsx
function ShiftCard({ shift }) {
  const { can } = useRBAC();

  return (
    <div>
      <h3>{shift.name}</h3>

      {/* Nur Manager & Admin dürfen genehmigen */}
      {can.approveShifts() && (
        <button onClick={() => approveShift(shift.id)}>
          Genehmigen
        </button>
      )}

      {/* Nur Worker dürfen unterschreiben */}
      {can.signTasks() && (
        <button onClick={() => signTask(shift.id)}>
          Unterschrift
        </button>
      )}

      {/* Audit Log für Admin */}
      {can.viewAudit() && (
        <AuditTrail resourceId={shift.id} />
      )}
    </div>
  );
}
```

### RBAC Context (Global)

```jsx
// App.jsx
import { RBACProvider } from './hooks/useRBAC';

function App() {
  return (
    <RBACProvider>
      <Router>
        {/* Routes */}
      </Router>
    </RBACProvider>
  );
}

// In Komponenten
import { useRBACContext } from './hooks/useRBAC';

function MyComponent() {
  const { role, permissions } = useRBACContext();
  // ...
}
```

---

## 🔍 5. Audit Service API

### Grundlagen

```javascript
import auditService from './services/auditService';

// 1. Log eine Aktion
await auditService.logAction(
  'update',           // action
  'tasks',            // resource
  'task-123',         // resourceId
  'Fenster putzen',   // resourceName
  { status: 'pending' },    // oldValues
  { status: 'completed' }   // newValues
);

// 2. Verifiziere Hash-Integrität
const { valid, errors } = await auditService.verifyIntegrity();
console.log(valid ? '✅ OK' : '❌ Tampering detected');

// 3. Hole Audit Log
const events = await auditService.getAuditLog({
  userId: 'alice-123',
  resource: 'shifts',
  action: 'update',
  startDate: new Date('2025-11-01'),
  endDate: new Date('2025-11-30')
}, 100);

// 4. Exportiere als CSV
auditService.downloadAuditLog(events, 'audit.csv');
```

### Permission Checks

```javascript
const { hasPermission, can } = useRBAC();

// Niedriges Level
hasPermission('shifts', 'read');      // boolean

// Mit Scope
hasPermissionWithScope('shifts', 'read', 'location');

// Hoches Level (shortcuts)
can.createShifts();       // boolean
can.signTasks();          // boolean
can.exportReports();      // boolean

// Alle Permissions für Resource
const shiftsPerms = getResourcePermissions('shifts');
// → [{ resource: 'shifts', action: 'read', scope: 'own' }, ...]
```

---

## 🚀 6. Praktische Anwendungsszenarien

### Szenario 1: Worker komplettiert Task

```javascript
async function completeTask(taskId) {
  const { can } = useRBAC();

  // 1. Prüfe Berechtigung
  if (!can.updateTasks()) {
    alert('Keine Berechtigung');
    return;
  }

  try {
    // 2. Update Task in DB (RLS filtert automatisch)
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date() })
      .eq('id', taskId);

    if (error) throw error;

    // 3. Log in Audit Trail
    await auditService.logAction(
      'update',
      'tasks',
      taskId,
      'Task ' + taskId,
      { status: 'pending' },
      { status: 'completed', completed_at: new Date() }
    );

    console.log('✅ Task complettiert');
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}
```

### Szenario 2: Manager genehmigt Shift

```javascript
async function approveShift(shiftId) {
  const { can, user } = useRBAC();

  // Nur Manager können genehmigen
  if (!can.approveShifts()) {
    return alert('Nur Manager dürfen genehmigen');
  }

  // Update Shift mit Manager-Signatur
  const { error } = await supabase
    .from('cleaning_shifts')
    .update({
      status: 'approved',
      signed_by_manager: user.id,
      signature_hash: generateSignatureHash(user.id),
      locked_at: new Date()
    })
    .eq('id', shiftId);

  if (!error) {
    // Log in Audit
    await auditService.logAction(
      'approve',
      'shifts',
      shiftId,
      'Shift für ' + shiftId,
      { status: 'pending_approval' },
      { status: 'approved', signed_by_manager: user.id }
    );
  }
}
```

### Szenario 3: Customer sieht Report (Read-Only)

```javascript
// RLS filtert automatisch!
const { data: reports } = await supabase
  .from('cleaning_reports')
  .select('*');

// Customer mit ID "customer-1" bekommt:
// - Report A: contract_id = 'contract-1' ✅ (owned by customer)
// - Report B: contract_id = 'contract-2' ❌ (other customer)

// → Nur Report A wird gezeigt
```

### Szenario 4: Admin prüft Audit-Integrität

```javascript
// Täglich ausführen (z.B. mit Cron)
async function dailySecurityCheck() {
  const { valid, errors } = await auditService.verifyIntegrity();

  if (!valid) {
    console.error('🚨 CRITICAL: Audit tampering detected!');
    errors.forEach(e => console.error(`Event ${e.eventId}: ${e.message}`));

    // Alert Admin
    await notifyAdmin({
      level: 'CRITICAL',
      subject: 'Audit Trail Integrity Compromised',
      details: errors
    });
  }
}
```

---

## 📊 7. Reporting & Compliance

### Audit Log Reports

```javascript
// Report: Alle Änderungen an Shifts in diesem Monat
const startOfMonth = new Date();
startOfMonth.setDate(1);

const events = await auditService.getAuditLog({
  resource: 'shifts',
  action: 'update',
  startDate: startOfMonth,
  endDate: new Date()
}, 1000);

console.log(`${events.length} shifts wurden geändert`);

// Breakdown by action
const breakdown = {};
events.forEach(e => {
  breakdown[e.action] = (breakdown[e.action] || 0) + 1;
});
console.log('Breakdown:', breakdown);
// → { update: 45, sign: 30, approve: 12 }
```

### Compliance Export

```javascript
// GDPR Compliance: Export aller Daten eines Users
const userEvents = await auditService.getAuditLog({
  userId: 'alice-123'
}, 10000);

auditService.downloadAuditLog(userEvents, `gdpr-export-alice.csv`);
```

---

## ⚙️ 8. Konfiguration & Anpassung

### Neue Rollen hinzufügen

```sql
-- Neue Rolle erstellen
INSERT INTO roles (name, description)
VALUES ('supervisor', 'Standort-Vorgesetzter');

-- Berechtigungen zuweisen
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'location'
FROM roles r, permissions p
WHERE r.name = 'supervisor'
  AND p.resource = 'shifts';
```

### Neue Permission erstellen

```sql
INSERT INTO permissions (resource, action, description, category)
VALUES ('custom_reports', 'generate', 'Custom Reports generieren', 'reporting');
```

### Scope-Regeln ändern

```javascript
// Beispiel: Worker dürfen nur ihre letzen 5 Shifts sehen
// (Implementierung im Frontend/Backend)

const shiftsScope = {
  'worker': { scope: 'own', limit: 5 },
  'manager': { scope: 'location', limit: null },
  'admin': { scope: 'all', limit: null }
};
```

---

## 🎓 Zusammenfassung

| Feature | Nutzen | Implementierung |
|---------|--------|-----------------|
| **RBAC** | Granulare Zugriffskontrolle | useRBAC Hook + Datenbank |
| **RLS** | Datenbank-Level Security | PostgreSQL Policies |
| **Audit** | Compliance & Forensics | auditService |
| **Hash-Chain** | Tampering Detection | SHA256 Verkettung |

---

**Status**: ✅ Production-Ready
**Letzte Aktualisierung**: 2025-11-05
**Support**: Siehe RBAC_SETUP_GUIDE.md
