# 📶 Phase 3: PWA Offline Functionality & Background Sync

Comprehensive guide to implementing offline-first Progressive Web App capabilities.

---

## 📋 Überblick

**Phase 3 fokussiert auf:**
- Service Worker für offline support
- IndexedDB für action queueing
- Automatic sync when online
- Background Sync API
- Beautiful offline UI
- PWA manifest & installation

---

## 🎯 Neue Komponenten & Services

### 1. Service Worker (`public/service-worker.js`)

**Zweck**: Offline caching und background sync
**Strategie**:
- **Static Assets**: Cache-first (app shell)
- **API Calls**: Network-first with cache fallback
- **Images**: Stale-while-revalidate

**Features**:
- ✅ Automatic caching on install
- ✅ Cache cleanup on activate
- ✅ Offline fallback page
- ✅ Message handling
- ✅ Background sync events
- ✅ Periodic sync (30 min)

### 2. Offline Service (`src/services/offlineService.js`)

**Zweck**: Manage offline workflows and synchronization
**Hauptfunktionen**:

```javascript
// Queue an action
await offlineService.queueAction(
  'shifts',           // type
  'update',           // action
  { status: 'completed' },  // data
  optimisticId        // temp ID
);

// Get pending actions
const pending = await offlineService.getPendingActions();

// Sync when online
await offlineService.syncPendingActions();

// Retry failed action
await offlineService.retryAction(actionId);

// Listen to events
offlineService.subscribe(event => {
  // { type: 'SYNC_COMPLETE', successCount: 3 }
});
```

**Storage**:
- `pending_actions` - Queue of offline changes
- `sync_history` - Track completed syncs
- `offline_data` - Cache for reference data

### 3. useOffline Hook (`src/hooks/useOffline.js`)

**Zweck**: React hook for offline state management
**Verwendung**:

```jsx
function MyComponent() {
  const {
    isOnline,           // boolean
    pendingActions,     // array
    syncStatus,         // 'idle' | 'syncing' | 'complete' | 'error'
    lastSync,           // Date
    queueAction,        // function
    sync,               // function
    retryAction,        // function
    deleteAction,       // function
  } = useOffline();

  return (
    <>
      {!isOnline && <p>You are offline</p>}
      {pendingActions.length > 0 && (
        <button onClick={sync}>Sync {pendingActions.length} changes</button>
      )}
    </>
  );
}
```

### 4. OfflineIndicator Component

**Zweck**: Show offline status and pending actions
**Features**:
- Status bar (online/offline)
- Pending actions count
- Sync status indicator
- Detailed pending actions panel
- Retry/delete buttons
- Last sync timestamp

**Verwendung**:

```jsx
import OfflineIndicator from './components/offline/OfflineIndicator';
import { PendingSyncButton } from './components/offline/OfflineIndicator';

function App() {
  return (
    <>
      <OfflineIndicator />  {/* Status bar at top */}
      {/* Rest of app */}
      <PendingSyncButton /> {/* Sync button */}
    </>
  );
}
```

### 5. PWA Manifest (`public/manifest.json`)

**Zweck**: PWA metadata und configuration
**Features**:
- App name & description
- Theme colors
- Icons (192x192, 512x512)
- Display mode: standalone
- App shortcuts (Today, Tasks, Reports)
- Start URL configuration

### 6. Offline Page (`public/offline.html`)

**Zweck**: Beautiful fallback page when offline
**Features**:
- Friendly message
- What you can do offline
- Retry & home buttons
- Auto-reload when online
- Dark mode support
- Responsive design

---

## 🚀 Integration Steps

### Schritt 1: Import OfflineIndicator in App.js

```jsx
import OfflineIndicator from './components/offline/OfflineIndicator';

function App() {
  return (
    <>
      <OfflineIndicator />  {/* Show at top */}
      <Router>
        {/* Routes */}
      </Router>
    </>
  );
}
```

### Schritt 2: Use useOffline in Components

```jsx
import { useOffline } from './hooks/useOffline';

function ShiftCard({ shift }) {
  const { isOnline, queueAction } = useOffline();

  const handleComplete = async () => {
    // Optimistic update
    const tempId = `shift-${Date.now()}`;

    try {
      // Queue action (works offline)
      await queueAction('shifts', 'update', {
        id: shift.id,
        status: 'completed'
      }, tempId);

      // Update UI immediately
      setShift(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error('Failed to queue action', error);
    }
  };

  return (
    <>
      <button onClick={handleComplete}>
        {isOnline ? 'Complete' : 'Complete (will sync)'}
      </button>
    </>
  );
}
```

### Schritt 3: Update API Endpoints

**Backend**: Expect queued actions to arrive in bulk

```javascript
// Old API: Single update
PUT /api/shifts/:id { status: 'completed' }

// New API: Batch endpoint
POST /api/sync
[
  { type: 'shifts', action: 'update', id: '...', data: { status: 'completed' } },
  { type: 'tasks', action: 'update', id: '...', data: { status: 'completed' } },
  ...
]
```

### Schritt 4: Test Offline Workflows

**Chrome DevTools**:
1. Open DevTools (F12)
2. Network tab → Offline checkbox
3. Make changes
4. Verify in Console: `indexedDB.databases()`
5. Go online
6. Watch auto-sync

---

## 💻 Code Beispiele

### Example 1: Queue a Shift Change

```jsx
async function startShift(shiftId) {
  const { queueAction, isOnline } = useOffline();

  const tempId = `start-${Date.now()}`;

  // Queue action (works offline)
  await queueAction('shifts', 'update', {
    id: shiftId,
    status: 'in_progress',
    started_at: new Date()
  }, tempId);

  // Show toast
  if (!isOnline) {
    showToast('Shift queued - will sync when online');
  } else {
    showToast('Shift started');
  }

  // Update UI optimistically
  setShifts(prev => prev.map(s =>
    s.id === shiftId
      ? { ...s, status: 'in_progress' }
      : s
  ));
}
```

### Example 2: Monitor Sync Status

```jsx
function SyncStatusIndicator() {
  const { syncStatus, pendingActions, lastSync, sync } = useOffline();

  return (
    <div className="sync-status">
      {syncStatus === 'syncing' && (
        <p>📤 Syncing {pendingActions.length} changes...</p>
      )}

      {syncStatus === 'complete' && (
        <p>✅ Synced at {lastSync?.toLocaleTimeString()}</p>
      )}

      {syncStatus === 'error' && (
        <p>❌ Sync failed - <button onClick={sync}>Retry</button></p>
      )}

      {pendingActions.length > 0 && (
        <p>⏳ {pendingActions.length} pending</p>
      )}
    </div>
  );
}
```

### Example 3: Custom Offline Data

```jsx
function CacheReferencesData() {
  const offlineService = useRef(null);

  useEffect(() => {
    import('../services/offlineService').then(module => {
      offlineService.current = module.default;
    });
  }, []);

  const cacheLocations = async (locations) => {
    for (const location of locations) {
      await offlineService.current.storeOfflineData(
        `location-${location.id}`,
        location
      );
    }
  };

  return {
    cacheLocations,
    getLocation: (id) =>
      offlineService.current.getOfflineData(`location-${id}`)
  };
}
```

---

## 🔍 How Offline Sync Works

```
Timeline:
┌──────────────────────────────────────────────────────┐
│ USER OFFLINE                                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. User completes shift (no internet)             │
│     ↓                                               │
│  2. Action queued in IndexedDB                     │
│     id: "shift-123"                                │
│     status: "pending"                              │
│     ↓                                               │
│  3. UI updates optimistically                      │
│     ↓                                               │
│  4. Service Worker watches for online              │
│                                                      │
├──────────────────────────────────────────────────────┤
│ USER BACK ONLINE                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Navigator.onLine = true                        │
│     ↓                                               │
│  2. offlineService triggers sync                   │
│     ↓                                               │
│  3. For each pending action:                       │
│     - Fetch /api/shifts with action data          │
│     - Mark as "synced" on success                 │
│     - Keep "pending" on failure                   │
│     ↓                                               │
│  4. Notify UI - "Synced 3 changes"               │
│     ↓                                               │
│  5. Remove synced actions from queue              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Go offline (DevTools → Network → Offline)
- [ ] Make changes (complete shift, update task)
- [ ] See pending actions in IndexedDB
- [ ] See OfflineIndicator show pending count
- [ ] Go online
- [ ] Watch auto-sync trigger
- [ ] See sync status change to "complete"
- [ ] Verify changes persisted on server
- [ ] Check audit log for actions

### Automated Testing

```javascript
// Test offline queueing
test('queues action when offline', async () => {
  offline.isOnline = false;
  const actionId = await offline.queueAction('shifts', 'update', {});
  const pending = await offline.getPendingActions();
  expect(pending).toHaveLength(1);
  expect(pending[0].id).toBe(actionId);
});

// Test sync on online
test('syncs when online', async () => {
  offline.isOnline = false;
  await offline.queueAction('shifts', 'update', { id: '123' });

  offline.isOnline = true;
  await offline.syncPendingActions();

  const pending = await offline.getPendingActions();
  expect(pending).toHaveLength(0);
});

// Test retry on failure
test('retries failed action', async () => {
  const actionId = await offline.queueAction('shifts', 'update', {});
  await offline.updateActionError(actionId, 'Network error');

  await offline.retryAction(actionId);
  const action = await offline.getPendingActions();
  expect(action[0].status).toBe('pending');
});
```

---

## ⚙️ Configuration

### Service Worker Scope

```javascript
// Register with specific scope
navigator.serviceWorker.register('/service-worker.js', {
  scope: '/'  // Serve for entire origin
});
```

### Cache Versions

```javascript
const CACHE_VERSION = 'cleani-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// When ready to update:
// Change to 'cleani-v2' and old caches auto-cleanup
```

### Background Sync

```javascript
// Register periodic sync (30 minutes)
if ('periodicSync' in registration) {
  registration.periodicSync.register('sync-offline-data', {
    minInterval: 30 * 60 * 1000  // 30 minutes
  });
}
```

---

## 🐛 Troubleshooting

### Problem: Service Worker not installing

**Lösung**:
```javascript
// Check console for errors
navigator.serviceWorker.ready.then(registration => {
  console.log('SW ready:', registration);
}).catch(error => {
  console.error('SW failed:', error);
});
```

### Problem: Offline actions not syncing

**Lösung**:
1. Check browser DevTools → Application → IndexedDB
2. Verify pending_actions has data
3. Go online and trigger sync manually:
   ```javascript
   offlineService.syncPendingActions();
   ```

### Problem: Cache too large

**Lösung**:
```javascript
// Clear old caches
caches.keys().then(names => {
  names.forEach(name => {
    if (!name.includes('v1')) {
      caches.delete(name);
    }
  });
});
```

---

## 📊 Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Offline Load Time | < 2s | From cache |
| Sync Time | < 5s | For 10 actions |
| Cache Size | < 50MB | Total cache limit |
| IndexedDB Size | < 10MB | Pending actions |
| SW Install Time | < 1s | On first load |

---

## 🔐 Security Considerations

1. **Token Storage**: Don't cache auth tokens
2. **Sensitive Data**: Encrypt IndexedDB data
3. **API Validation**: Server must validate all actions
4. **Rate Limiting**: Protect sync endpoints
5. **CORS**: Ensure service worker respects CORS

---

## 📚 Referenzen

- **Service Worker API**: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- **IndexedDB**: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Background Sync**: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- **PWA Manifest**: [MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

## ✅ Phase 3 Checklist

- [ ] Service Worker registered
- [ ] OfflineIndicator imported in App.js
- [ ] useOffline hook working
- [ ] IndexedDB operations tested
- [ ] Offline queueing works
- [ ] Auto-sync triggers
- [ ] Sync UI updates
- [ ] Offline page shows
- [ ] PWA installable
- [ ] Background sync working
- [ ] All pending actions sync
- [ ] No data loss

---

**Status**: Phase 3 Complete ✅
**Last Updated**: 2025-11-05
**Next**: Deployment & Production Monitoring
