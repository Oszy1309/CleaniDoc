/**
 * Offline Service
 * Manages offline-first workflows with IndexedDB queue and background sync
 *
 * Features:
 * - Queue actions when offline
 * - Auto-sync when online
 * - IndexedDB persistence
 * - Conflict resolution
 * - Optimistic updates
 */

class OfflineService {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = [];

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Request Periodic Background Sync (if supported)
    if ('serviceWorkerRegistration' in navigator) {
      navigator.serviceWorkerRegistration?.ready.then(registration => {
        if ('periodicSync' in registration) {
          registration.periodicSync.register('update-offline-data', {
            minInterval: 30 * 60 * 1000, // 30 minutes
          });
        }
      });
    }
  }

  /**
   * Initialize offline service (call on app start)
   */
  async initialize() {
    try {
      await this.openDatabase();
      console.log('✅ Offline Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline service:', error);
    }
  }

  /**
   * Open IndexedDB
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('cleani-offline', 1);

      request.onerror = () => {
        console.error('❌ Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened');
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // Create object stores if not exist
        if (!db.objectStoreNames.contains('pending_actions')) {
          const actionStore = db.createObjectStore('pending_actions', {
            keyPath: 'id',
          });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('sync_history')) {
          const historyStore = db.createObjectStore('sync_history', {
            keyPath: 'id',
          });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline_data')) {
          db.createObjectStore('offline_data', { keyPath: 'key' });
        }

        console.log('✅ Database upgraded');
      };
    });
  }

  /**
   * Queue an action for offline/sync
   * @param {string} type - 'shifts', 'tasks', 'reports', etc.
   * @param {string} action - 'create', 'update', 'delete', 'sign'
   * @param {object} data - Action data
   * @param {string} optimisticId - Temporary ID for optimistic update
   * @returns {Promise<string>} - Action ID
   */
  async queueAction(type, action, data, optimisticId = null) {
    if (!this.db) {
      throw new Error('Offline service not initialized');
    }

    const actionId = optimisticId || this.generateId();
    const actionData = {
      id: actionId,
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retries: 0,
      error: null,
    };

    try {
      const tx = this.db.transaction('pending_actions', 'readwrite');
      await new Promise((resolve, reject) => {
        const request = tx.objectStore('pending_actions').add(actionData);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      console.log(`📝 Queued ${action} ${type}:`, actionId);
      this.notifyListeners('ACTION_QUEUED', { actionId, ...actionData });

      // Try to sync if online
      if (this.isOnline) {
        setImmediate(() => this.syncPendingActions());
      }

      return actionId;
    } catch (error) {
      console.error('❌ Failed to queue action:', error);
      throw error;
    }
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(status = 'pending') {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('pending_actions', 'readonly');
      const index = tx.objectStore('pending_actions').index('status');

      return new Promise((resolve, reject) => {
        const request = index.getAll(status);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error('❌ Failed to get pending actions:', error);
      return [];
    }
  }

  /**
   * Sync pending actions to server
   */
  async syncPendingActions() {
    if (this.syncInProgress || !this.isOnline) {
      console.log('⏸️ Sync in progress or offline');
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners('SYNC_START');

    try {
      const pendingActions = await this.getPendingActions('pending');
      console.log(`🔄 Syncing ${pendingActions.length} actions...`);

      let successCount = 0;
      let failureCount = 0;

      for (const action of pendingActions) {
        try {
          await this.sendActionToServer(action);
          await this.markActionSynced(action.id);
          successCount++;
          this.notifyListeners('ACTION_SYNCED', { actionId: action.id });
        } catch (error) {
          failureCount++;
          await this.updateActionError(action.id, error.message);
          console.error(`❌ Failed to sync ${action.id}:`, error.message);
        }
      }

      console.log(`✅ Sync complete: ${successCount} synced, ${failureCount} failed`);
      this.notifyListeners('SYNC_COMPLETE', { successCount, failureCount });
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners('SYNC_ERROR', { error: error.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Send action to server
   */
  async sendActionToServer(action) {
    const { type, action: actionType, data } = action;

    // Get auth token
    const { data: { session } } = await import('../lib/supabase').then(m =>
      m.supabase.auth.getSession()
    );

    if (!session) {
      throw new Error('No auth session');
    }

    // Build endpoint
    const endpoint = `/api/${type}/${actionType}`;

    // Send request
    const response = await fetch(endpoint, {
      method: actionType === 'create' ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Mark action as synced
   */
  async markActionSynced(actionId) {
    if (!this.db) return;

    const tx = this.db.transaction('pending_actions', 'readwrite');
    const store = tx.objectStore('pending_actions');

    return new Promise((resolve, reject) => {
      const request = store.get(actionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const action = request.result;
        action.status = 'synced';
        const updateRequest = store.put(action);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      };
    });
  }

  /**
   * Update action error
   */
  async updateActionError(actionId, errorMessage) {
    if (!this.db) return;

    const tx = this.db.transaction('pending_actions', 'readwrite');
    const store = tx.objectStore('pending_actions');

    return new Promise((resolve, reject) => {
      const request = store.get(actionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const action = request.result;
        action.status = 'error';
        action.error = errorMessage;
        action.retries = (action.retries || 0) + 1;
        const updateRequest = store.put(action);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      };
    });
  }

  /**
   * Retry failed action
   */
  async retryAction(actionId) {
    if (!this.db) return;

    const tx = this.db.transaction('pending_actions', 'readwrite');
    const store = tx.objectStore('pending_actions');

    return new Promise((resolve, reject) => {
      const request = store.get(actionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const action = request.result;
        action.status = 'pending';
        action.error = null;
        const updateRequest = store.put(action);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => {
          resolve();
          // Try sync
          if (this.isOnline) {
            this.syncPendingActions();
          }
        };
      };
    });
  }

  /**
   * Delete action from queue
   */
  async deleteAction(actionId) {
    if (!this.db) return;

    const tx = this.db.transaction('pending_actions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('pending_actions').delete(actionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Store offline data for later use
   */
  async storeOfflineData(key, data) {
    if (!this.db) return;

    const tx = this.db.transaction('offline_data', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('offline_data').put({
        key,
        data,
        timestamp: new Date().toISOString(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get offline data
   */
  async getOfflineData(key) {
    if (!this.db) return null;

    const tx = this.db.transaction('offline_data', 'readonly');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('offline_data').get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('🌐 Online');
    this.isOnline = true;
    this.notifyListeners('ONLINE');
    this.syncPendingActions();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('📵 Offline');
    this.isOnline = false;
    this.notifyListeners('OFFLINE');
  }

  /**
   * Subscribe to events
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(type, data = {}) {
    this.listeners.forEach(callback => {
      callback({ type, ...data });
    });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register Service Worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      console.log('✅ Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            this.notifyListeners('SW_UPDATED');
          }
        });
      });

      return registration;
    } catch (error) {
      console.error('❌ Failed to register Service Worker:', error);
    }
  }

  /**
   * Unregister Service Worker
   */
  async unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('✅ Service Workers unregistered');
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData() {
    if (!this.db) return;

    const stores = ['pending_actions', 'sync_history', 'offline_data'];
    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readwrite');
      await new Promise((resolve, reject) => {
        const request = tx.objectStore(storeName).clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    console.log('✅ All offline data cleared');
  }
}

// Singleton export
export default new OfflineService();
