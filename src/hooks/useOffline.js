/**
 * useOffline Hook
 * Manage offline state, pending actions, and sync status
 */

import { useEffect, useState, useCallback } from 'react';
import offlineService from '../services/offlineService';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, complete, error
  const [lastSync, setLastSync] = useState(null);

  // Initialize offline service
  useEffect(() => {
    offlineService.initialize();
    offlineService.registerServiceWorker();

    // Subscribe to offline events
    const unsubscribe = offlineService.subscribe(event => {
      console.log('📲 Offline event:', event.type);

      switch (event.type) {
        case 'ONLINE':
          setIsOnline(true);
          break;
        case 'OFFLINE':
          setIsOnline(false);
          break;
        case 'SYNC_START':
          setSyncStatus('syncing');
          break;
        case 'SYNC_COMPLETE':
          setSyncStatus('complete');
          setLastSync(new Date());
          setTimeout(() => setSyncStatus('idle'), 3000);
          loadPendingActions();
          break;
        case 'SYNC_ERROR':
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 5000);
          break;
        case 'ACTION_QUEUED':
          loadPendingActions();
          break;
        case 'ACTION_SYNCED':
          loadPendingActions();
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Load pending actions on mount
  useEffect(() => {
    loadPendingActions();
  }, []);

  /**
   * Load pending actions
   */
  const loadPendingActions = useCallback(async () => {
    try {
      const actions = await offlineService.getPendingActions();
      setPendingActions(actions);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  /**
   * Queue an action
   */
  const queueAction = useCallback(
    async (type, action, data, optimisticId) => {
      try {
        const actionId = await offlineService.queueAction(type, action, data, optimisticId);
        await loadPendingActions();
        return actionId;
      } catch (error) {
        console.error('Failed to queue action:', error);
        throw error;
      }
    },
    [loadPendingActions]
  );

  /**
   * Sync pending actions
   */
  const sync = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      await offlineService.syncPendingActions();
      setSyncStatus('complete');
      setLastSync(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, []);

  /**
   * Retry action
   */
  const retryAction = useCallback(
    async actionId => {
      try {
        await offlineService.retryAction(actionId);
        await loadPendingActions();
      } catch (error) {
        console.error('Failed to retry action:', error);
      }
    },
    [loadPendingActions]
  );

  /**
   * Delete action
   */
  const deleteAction = useCallback(
    async actionId => {
      try {
        await offlineService.deleteAction(actionId);
        await loadPendingActions();
      } catch (error) {
        console.error('Failed to delete action:', error);
      }
    },
    [loadPendingActions]
  );

  return {
    isOnline,
    pendingActions,
    syncStatus,
    lastSync,
    queueAction,
    sync,
    retryAction,
    deleteAction,
    refreshPending: loadPendingActions,
  };
}

/**
 * HOC: Wrap component with offline context
 */
export function withOfflineContext(Component) {
  return function OfflineComponent(props) {
    const offline = useOffline();
    return <Component {...props} offline={offline} />;
  };
}
