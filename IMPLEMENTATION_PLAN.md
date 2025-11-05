# 🎯 CleaniDoc Dashboard - Umfassende Implementierungsplan

## Neue Anforderungen (Zusammenfassung)

### 1️⃣ Responsive Design Strategy
- **Mobile-First** für Mitarbeiter & Schichtleiter (Operativ)
- **Desktop-First** für Kunden (View-Only)
- Minimale Klicks: "Heute-Ansicht" als Standard

### 2️⃣ Audit & Compliance
- Jede Aktion → Event + Audit-Trail
- Unveränderbare Hash-Kette für Integrität
- Alle Änderungen versioniert

### 3️⃣ Offline-Fähigkeit (PWA)
- Workflows auch ohne Netz durchführbar
- Automatische Sync bei Wiederherstellung

### 4️⃣ RBAC mit RLS
- Strikte Durchsetzung auf DB-Ebene
- Rollen → Rechte → Sichten
- Daten-Scoping nach Rolle

---

## RBAC Permission Matrix (Verbindlich)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Fähigkeit                                  │ Mita | Schift | Kunde | Admin │
├──────────────────────────────────────────────────────────────────────┤
│ Eigene Schichten sehen/abarbeiten         │ ✅   │ ✅    │ ❌   │ ✅   │
│ Team-Schichten des Standortes sehen       │ ❌   │ ✅    │ ❌   │ ✅   │
│ Aufgaben abhaken + Foto hochladen         │ ✅   │ ✅    │ ❌   │ ✅   │
│ Live-Abweichungen/Incidents melden        │ ✅   │ ✅    │ ❌   │ ✅   │
│ Signatur eigener Aufgaben                 │ ✅   │ ✅    │ ❌   │ ✅   │
│ Gegenzeichnung/Abnahme (Shift-Close)      │ ❌   │ ✅    │ ❌   │ ✅   │
│ Kunden-Abnahme anfordern (digital)        │ ❌   │ ✅    │ ❌   │ ✅   │
│ Reports/Protokolle einsehen               │ 🔸*1 │ ✅*2  │ ✅*3 │ ✅   │
│ Tickets/Feedback erstellen                │ ✅   │ ✅    │ ✅   │ ✅   │
│ Nutzer verwalten / Rollenzuweisung        │ ❌   │ ❌    │ ❌   │ ✅   │
│ Planen (Tages-/Wochenpläne)               │ ❌   │ 🔸*4  │ ❌   │ ✅   │
│ Dokumente (SOP/HACCP/GMP) einsehen        │ 🔸*5 │ ✅    │ ✅   │ ✅   │
└──────────────────────────────────────────────────────────────────────┘

Legende:
✅  = Voll unterstützt
❌  = Nicht erlaubt
🔸  = Bedingt (mit Einschränkungen)

Spezifikationen:
*1 = Mitarbeiter: nur eigene Schichten
*2 = Schichtleiter: ganz Standort
*3 = Kunde: eigener Vertrag/Standort
*4 = Schichtleiter: Vorschlagsrecht (Approval durch Admin)
*5 = Mitarbeiter: rollenbezogen (z.B. nur Reinigungsdocs)
```

---

## Phase 1: Datenbank-Schema & RLS (Sprint 1-2)

### 1.1 Neue Supabase Tabellen

```sql
-- Rollen (Standard)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Berechtigungen
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(50) NOT NULL,      -- 'shifts', 'tasks', 'reports', etc.
  action VARCHAR(50) NOT NULL,         -- 'create', 'read', 'update', 'delete'
  description TEXT,
  UNIQUE(resource, action)
);

-- Rolle → Berechtigungen (M:N)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  scope VARCHAR(100),                  -- 'all', 'own', 'team', 'location'
  PRIMARY KEY (role_id, permission_id)
);

-- Audit Trail (unveränderbar)
CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  action VARCHAR(50) NOT NULL,        -- 'create', 'update', 'delete', 'view'
  resource VARCHAR(50) NOT NULL,      -- table/entity name
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT now(),
  previous_hash TEXT,                 -- Hash der vorherigen Zeile
  current_hash TEXT,                  -- SHA256 dieser Zeile
  INDEX (user_id, timestamp),
  INDEX (resource, timestamp)
);

-- Shift-Details erweitern
ALTER TABLE cleaning_shifts ADD COLUMN visibility_scope VARCHAR(20); -- 'owner', 'team', 'all'
ALTER TABLE cleaning_shifts ADD COLUMN locked_at TIMESTAMP;          -- Nach Abnahme
ALTER TABLE cleaning_shifts ADD COLUMN signed_by_worker UUID;
ALTER TABLE cleaning_shifts ADD COLUMN signed_by_manager UUID;
ALTER TABLE cleaning_shifts ADD COLUMN signature_hash TEXT;

-- Tasks erweitern
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN completed_by UUID;
ALTER TABLE tasks ADD COLUMN signature_hash TEXT;
ALTER TABLE tasks ADD COLUMN photo_evidence JSONB;
```

### 1.2 RLS Policies implementieren

```sql
-- RLS für cleaning_shifts
-- Mitarbeiter: sehen nur ihre eigenen + vom Manager zugewiesenen
CREATE POLICY "workers_see_own_shifts" ON cleaning_shifts
  FOR SELECT USING (
    assigned_to = auth.uid()
  );

-- Schichtleiter: sehen alle Shifts ihres Standortes
CREATE POLICY "managers_see_location_shifts" ON cleaning_shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'manager'
      AND location_id = cleaning_shifts.location_id
    )
  );

-- Kunden: sehen nur Shifts ihres Vertrags
CREATE POLICY "customers_see_contract_shifts" ON cleaning_shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = cleaning_shifts.contract_id
      AND c.customer_id = auth.uid()
    )
  );

-- Admin: alles sehen
CREATE POLICY "admin_all_shifts" ON cleaning_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## Phase 2: Frontend - Responsive Design (Sprint 3-4)

### 2.1 Datei-Struktur

```
src/
├── layouts/
│   ├── MobileLayout.jsx         (Mitarbeiter/Schichtleiter)
│   └── DesktopLayout.jsx        (Kunden)
├── pages/
│   ├── dashboard/
│   │   ├── TodayView.jsx        (Operativ, Default für Mitarbeiter)
│   │   ├── WorkerDashboard.jsx  (Mobile-optimiert)
│   │   ├── ManagerDashboard.jsx (Mobile/Desktop hybrid)
│   │   └── CustomerDashboard.jsx (Desktop-first)
├── components/
│   ├── today/
│   │   ├── TodayViewCard.jsx
│   │   ├── ShiftTimeline.jsx
│   │   └── QuickActions.jsx
│   ├── audit/
│   │   ├── AuditTrail.jsx
│   │   └── EventLog.jsx
│   └── offline/
│       ├── OfflineIndicator.jsx
│       └── SyncStatus.jsx
```

### 2.2 Today View (Zentral)

```jsx
// pages/dashboard/TodayView.jsx
- Zeigt nur TODAY's Shifts für Auth User
- Schnellzugriff zu häufigen Aktionen
- Mobile-first responsive
- Offline-Support
```

### 2.3 Responsive Breakpoints

```css
/* Mobile (< 768px) - Mitarbeiter/Schichtleiter */
.mobile-priority {
  display: block;
  width: 100%;
}

/* Tablet (768px - 1024px) - Hybrid */
.tablet-hide {
  display: none;
}

/* Desktop (> 1024px) - Kunden */
.desktop-only {
  display: none;
}

@media (min-width: 768px) {
  .tablet-hide { display: block; }
}

@media (min-width: 1024px) {
  .desktop-only { display: block; }
}
```

---

## Phase 3: Audit & Integrität (Sprint 5)

### 3.1 Event Logging Service

```javascript
// services/auditService.js
class AuditService {
  async logAction(action, resource, resourceId, oldValues, newValues) {
    // 1. Hole letzten Hash
    const lastEvent = await this.getLastEvent();
    const previousHash = lastEvent?.current_hash;

    // 2. Berechne aktuellen Hash
    const eventData = {
      action, resource, resourceId,
      timestamp: new Date(),
      user_id: auth.user.id
    };
    const currentHash = this.sha256(
      JSON.stringify(eventData) + previousHash
    );

    // 3. Speichere in DB
    await supabase.from('audit_events').insert({
      user_id: auth.user.id,
      action,
      resource,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      previous_hash: previousHash,
      current_hash: currentHash,
      timestamp: new Date(),
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent
    });
  }

  async verifyIntegrity() {
    // Prüfe ob Hash-Kette intakt ist
    const events = await supabase
      .from('audit_events')
      .select('*')
      .order('timestamp', { ascending: true });

    let previousHash = null;
    for (const event of events.data) {
      const computed = this.sha256(
        JSON.stringify(event) + previousHash
      );
      if (computed !== event.current_hash) {
        throw new Error(`Hash-Kette unterbrochen bei ID ${event.id}`);
      }
      previousHash = event.current_hash;
    }
    return true;
  }
}
```

### 3.2 Automatische Audit-Einträge

Beispiele welche Aktionen geloggt werden:

```
✅ Shift geöffnet/geschlossen
✅ Task abgehakt
✅ Foto hochgeladen
✅ Signatur abgegeben
✅ Bericht ausgestellt
✅ Nutzer-Rollen geändert
✅ Reports exportiert
❌ Gescheiterte Anmeldeversuche
```

---

## Phase 4: PWA & Offline (Sprint 6)

### 4.1 Service Worker Registrierung

```javascript
// public/service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('cleani-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/main.css',
        '/js/app.js',
        '/offline.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // API Calls: Network-First mit Fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Speichere Response für Offline
          caches.open('api-cache').then(cache => {
            cache.put(event.request, response.clone());
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            || new Response('Offline - Daten nicht verfügbar',
                { status: 503 });
        })
    );
  } else {
    // Assets: Cache-First
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

### 4.2 Offline Data Sync

```javascript
// services/offlineSyncService.js
class OfflineSyncService {
  async saveOfflineAction(action) {
    // Speichere Aktion in IndexedDB
    const db = await this.openDB();
    const tx = db.transaction('pending_actions', 'readwrite');
    await tx.objectStore('pending_actions').add({
      id: uuid(),
      action,
      timestamp: new Date(),
      status: 'pending'
    });
  }

  async syncWhenOnline() {
    window.addEventListener('online', async () => {
      const db = await this.openDB();
      const tx = db.transaction('pending_actions', 'readonly');
      const actions = await tx.objectStore('pending_actions').getAll();

      for (const { action } of actions) {
        try {
          await this.executeAction(action);
          // Markiere als synced
          await this.markSynced(action.id);
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }
    });
  }
}
```

---

## Phase 5: Testing & Deployment (Sprint 7)

### 5.1 RBAC Test-Matrix

```javascript
// tests/rbac.test.js

// Worker kann nur eigene Shifts sehen
test('worker_sees_own_shifts_only', async () => {
  const shifts = await fetchWorkerShifts(workerId);
  expect(shifts.every(s => s.assigned_to === workerId)).toBe(true);
});

// Manager kann Team-Shifts sehen
test('manager_sees_location_shifts', async () => {
  const shifts = await fetchManagerShifts(managerId);
  expect(shifts.every(s => s.location_id === managerLocation)).toBe(true);
});

// Customer kann nur Contract-Shifts sehen
test('customer_sees_contract_shifts', async () => {
  const shifts = await fetchCustomerShifts(customerId);
  expect(shifts.every(s => s.contract_id === customerContract)).toBe(true);
});

// Unauthorized: 403
test('unauthorized_returns_403', async () => {
  const response = await fetch('/api/all-shifts', {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  expect(response.status).toBe(403);
});

// Hash-Kette Integrität
test('audit_hash_chain_integrity', async () => {
  const integrity = await auditService.verifyIntegrity();
  expect(integrity).toBe(true);
});
```

### 5.2 Deployment Checklist

- [ ] Alle RLS Policies aktiviert
- [ ] Audit-Trail läuft
- [ ] Service Worker registriert
- [ ] PWA installierbar
- [ ] Offline Mode funktioniert
- [ ] Mobile Layout responsiv
- [ ] Desktop Layout optimiert
- [ ] Today View Standard
- [ ] RBAC Tests grün
- [ ] Hash-Integrität verifiziert
- [ ] API-Middleware authentifiziert

---

## Priorisierung

### 🔴 CRITICAL (Woche 1-2)
1. RLS Policies komplett implementieren
2. Backend Authorization Middleware
3. Audit Logging aktiv
4. Today View Frontend

### 🟡 HIGH (Woche 3-4)
1. Mobile/Desktop Layouts
2. Hash-Chain Implementierung
3. PWA Service Worker

### 🟢 MEDIUM (Woche 5+)
1. Offline Sync Verfeinern
2. Analytics Dashboard
3. Performance Optimierung

---

## KPIs zur Messung

- **RBAC**: 0 unauthorized data access in Audit
- **Mobile**: < 3 Sekunden Load auf 4G
- **Audit**: 100% aller Actions geloggt
- **PWA**: Offline Mode funktioniert 100%
- **Hash-Chain**: 0 Integrität-Fehler
