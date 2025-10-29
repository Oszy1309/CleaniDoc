// Sentry configuration and error reporting
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { useState, useEffect } from 'react';

// ===== SENTRY CONFIGURATION =====

export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  const environment = process.env.REACT_APP_ENV || 'development';
  const enableErrorReporting = process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true';

  // Only initialize Sentry if DSN is provided and error reporting is enabled
  if (!dsn || !enableErrorReporting) {
    console.log('Sentry error reporting is disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Integration configuration
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/[^/]*\.supabase\.co\/rest\/v1\//,
          /^https:\/\/api\.cleanidoc\.com/,
        ],
      }),
    ],

    // Performance monitoring sample rate (0.0 to 1.0)
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Error sampling rate (0.0 to 1.0)
    sampleRate: environment === 'production' ? 0.8 : 1.0,

    // Release information
    release: `cleanidoc-dashboard@${process.env.REACT_APP_VERSION || '1.0.0'}`,

    // Additional configuration
    beforeSend(event, hint) {
      // Filter out development/testing errors
      if (environment === 'development') {
        console.log('Sentry event:', event);
      }

      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;

        // Filter out network errors that are expected
        if (
          error?.message?.includes('Failed to fetch') &&
          event.tags?.component === 'NetworkRequest'
        ) {
          return null;
        }

        // Filter out React DevTools extension errors
        if (error?.stack?.includes('react-devtools')) {
          return null;
        }

        // Filter out browser extension errors
        if (error?.stack?.includes('extension://')) {
          return null;
        }
      }

      return event;
    },

    // User context will be set dynamically
    initialScope: {
      tags: {
        component: 'App',
        environment,
      },
      context: {
        app: {
          name: 'CleaniDoc Dashboard',
          version: process.env.REACT_APP_VERSION || '1.0.0',
        },
      },
    },
  });

  console.log(`Sentry initialized for ${environment} environment`);
};

// ===== USER CONTEXT MANAGEMENT =====

export const setSentryUser = user => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name || user.email,
    role: user.role || 'unknown',
  });
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// ===== CUSTOM ERROR REPORTING =====

export const captureError = (error, context = {}) => {
  Sentry.withScope(scope => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });

    // Add timestamp
    scope.setTag('timestamp', new Date().toISOString());

    // Capture the error
    Sentry.captureException(error);
  });
};

export const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope(scope => {
    scope.setLevel(level);

    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });

    Sentry.captureMessage(message);
  });
};

// ===== BREADCRUMB HELPERS =====

export const addBreadcrumb = (message, category = 'custom', level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

export const addNavigationBreadcrumb = (from, to) => {
  addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', 'info', { from, to });
};

export const addActionBreadcrumb = (action, component, data = {}) => {
  addBreadcrumb(`Action: ${action} in ${component}`, 'user', 'info', {
    action,
    component,
    ...data,
  });
};

export const addAPIBreadcrumb = (method, url, status, duration) => {
  addBreadcrumb(`API ${method} ${url} (${status})`, 'http', status >= 400 ? 'error' : 'info', {
    method,
    url,
    status,
    duration,
  });
};

// ===== PERFORMANCE MONITORING =====

export const startTransaction = (name, op = 'navigation') => {
  return Sentry.startTransaction({
    name,
    op,
    tags: {
      component: name,
    },
  });
};

export const measureFunction = (name, fn) => {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  const span = transaction?.startChild({
    op: 'function',
    description: name,
  });

  try {
    const result = fn();
    span?.setStatus('ok');
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    throw error;
  } finally {
    span?.finish();
  }
};

export const measureAsyncFunction = async (name, fn) => {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  const span = transaction?.startChild({
    op: 'async_function',
    description: name,
  });

  try {
    const result = await fn();
    span?.setStatus('ok');
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    throw error;
  } finally {
    span?.finish();
  }
};

// ===== REACT ERROR BOUNDARY INTEGRATION =====

export const sentryErrorBoundaryFallback = ({ error, resetError }) => {
  return (
    <div
      role="alert"
      style={{
        padding: '20px',
        border: '1px solid #f56565',
        borderRadius: '8px',
        backgroundColor: '#fed7d7',
        color: '#c53030',
        margin: '20px',
      }}
    >
      <h2>Something went wrong:</h2>
      <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
        {error && error.toString()}
      </details>
      <button
        onClick={resetError}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#c53030',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
};

// ===== HOC FOR SENTRY ERROR BOUNDARY =====

export const withSentryErrorBoundary = (Component, options = {}) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: options.fallback || sentryErrorBoundaryFallback,
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('componentStack', { componentStack: errorInfo.componentStack });
      scope.setContext('errorInfo', errorInfo);

      if (options.beforeCapture) {
        options.beforeCapture(scope, error, errorInfo);
      }
    },
  });
};

// ===== REACT HOOKS =====

export const useSentryTransaction = (name, op = 'component') => {
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    const txn = startTransaction(name, op);
    setTransaction(txn);

    return () => {
      txn?.finish();
    };
  }, [name, op]);

  return transaction;
};

// ===== DEBUG HELPERS =====

export const getSentryDebugInfo = () => {
  const hub = Sentry.getCurrentHub();
  const client = hub.getClient();

  return {
    isEnabled: !!client,
    dsn: client?.getDsn()?.toString(),
    environment: client?.getOptions()?.environment,
    release: client?.getOptions()?.release,
    user: hub.getScope()?.getUser(),
    tags: hub.getScope()?.getTags(),
    breadcrumbs: hub.getScope()?.getBreadcrumbs(),
  };
};

export default {
  initSentry,
  setSentryUser,
  clearSentryUser,
  captureError,
  captureMessage,
  addBreadcrumb,
  addNavigationBreadcrumb,
  addActionBreadcrumb,
  addAPIBreadcrumb,
  startTransaction,
  measureFunction,
  measureAsyncFunction,
  withSentryErrorBoundary,
  useSentryTransaction,
  getSentryDebugInfo,
};
