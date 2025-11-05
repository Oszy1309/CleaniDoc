/**
 * OfflineIndicator Component
 * Shows offline status and pending actions sync
 */

import React, { useState } from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import './OfflineIndicator.css';

function OfflineIndicator() {
  const { isOnline, pendingActions, syncStatus, lastSync, sync, retryAction, deleteAction } =
    useOffline();
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && pendingActions.length === 0) {
    return null; // Hide when online and no pending actions
  }

  return (
    <>
      {/* Status Bar */}
      <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
        <div className="indicator-left">
          {isOnline ? (
            <>
              <Wifi size={16} className="indicator-icon online" />
              <span>Online</span>
              {pendingActions.length > 0 && (
                <span className="pending-badge">{pendingActions.length} pending</span>
              )}
            </>
          ) : (
            <>
              <WifiOff size={16} className="indicator-icon offline" />
              <span>Offline Mode</span>
              {pendingActions.length > 0 && (
                <span className="pending-badge">{pendingActions.length} will sync</span>
              )}
            </>
          )}
        </div>

        <div className="indicator-right">
          {syncStatus === 'syncing' && (
            <div className="sync-indicator syncing">
              <RefreshCw size={14} className="spin" />
              <span>Syncing...</span>
            </div>
          )}

          {syncStatus === 'complete' && (
            <div className="sync-indicator complete">
              <CheckCircle2 size={14} />
              <span>Synced</span>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="sync-indicator error">
              <AlertCircle size={14} />
              <span>Sync error</span>
            </div>
          )}

          {lastSync && !showDetails && (
            <span className="last-sync">
              Last sync: {lastSync.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {pendingActions.length > 0 && (
            <button
              className="details-toggle"
              onClick={() => setShowDetails(!showDetails)}
              title="Toggle pending actions"
            >
              {showDetails ? '▼' : '▶'}
            </button>
          )}

          {pendingActions.length > 0 && isOnline && syncStatus !== 'syncing' && (
            <button className="sync-button" onClick={sync} title="Sync now">
              <RefreshCw size={14} />
              Sync
            </button>
          )}
        </div>
      </div>

      {/* Pending Actions Details */}
      {showDetails && pendingActions.length > 0 && (
        <PendingActionsPanel
          actions={pendingActions}
          isOnline={isOnline}
          syncStatus={syncStatus}
          onRetry={retryAction}
          onDelete={deleteAction}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
}

/**
 * PendingActionsPanel
 * Show detailed list of pending actions
 */
function PendingActionsPanel({
  actions,
  isOnline,
  syncStatus,
  onRetry,
  onDelete,
  onClose,
}) {
  return (
    <div className="pending-actions-panel">
      <div className="panel-header">
        <h3>Pending Actions ({actions.length})</h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="panel-content">
        {actions.map(action => (
          <PendingActionItem
            key={action.id}
            action={action}
            isOnline={isOnline}
            syncStatus={syncStatus}
            onRetry={() => onRetry(action.id)}
            onDelete={() => onDelete(action.id)}
          />
        ))}
      </div>

      {isOnline && (
        <div className="panel-info">
          <p>Actions will sync automatically when possible.</p>
        </div>
      )}

      {!isOnline && (
        <div className="panel-warning">
          <WifiOff size={14} />
          <p>You are offline. Actions will be saved and synced when you go online.</p>
        </div>
      )}
    </div>
  );
}

/**
 * PendingActionItem
 * Single pending action row
 */
function PendingActionItem({ action, isOnline, syncStatus, onRetry, onDelete }) {
  const getStatusIcon = status => {
    switch (status) {
      case 'pending':
        return <Clock size={14} />;
      case 'synced':
        return <CheckCircle2 size={14} />;
      case 'error':
        return <AlertCircle size={14} />;
      default:
        return null;
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <div className={`action-item action-${action.status}`}>
      <div className="action-left">
        <span className="action-status">{getStatusIcon(action.status)}</span>

        <div className="action-info">
          <p className="action-type">
            {action.action.toUpperCase()} {action.type}
          </p>
          <p className="action-time">
            {new Date(action.timestamp).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {action.error && <p className="action-error">{action.error}</p>}
        </div>
      </div>

      <div className="action-actions">
        {action.status === 'error' && isOnline && (
          <button className="action-button retry" onClick={onRetry} title="Retry">
            <RefreshCw size={14} />
          </button>
        )}

        <button className="action-button delete" onClick={onDelete} title="Delete">
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * PendingSyncButton
 * Standalone button to trigger sync
 */
export function PendingSyncButton() {
  const { isOnline, pendingActions, syncStatus, sync } = useOffline();

  if (!isOnline || pendingActions.length === 0 || syncStatus === 'syncing') {
    return null;
  }

  return (
    <button
      className="pending-sync-button"
      onClick={sync}
      title={`Sync ${pendingActions.length} pending action(s)`}
    >
      <RefreshCw size={16} />
      Sync {pendingActions.length > 0 && `(${pendingActions.length})`}
    </button>
  );
}

export default OfflineIndicator;
