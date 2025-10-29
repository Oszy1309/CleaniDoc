// Global error handling and toast integration
import toast from 'react-hot-toast';
import { ValidationError } from './apiValidation';

// ===== ERROR TYPES =====

export const ErrorTypes = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown',
};

// ===== ERROR CLASSIFICATION =====

export const classifyError = error => {
  if (error instanceof ValidationError) {
    return ErrorTypes.VALIDATION;
  }

  if (error.message?.includes('fetch') || error.message?.includes('Network')) {
    return ErrorTypes.NETWORK;
  }

  if (error.status === 401 || error.message?.includes('Unauthorized')) {
    return ErrorTypes.AUTH;
  }

  if (error.status === 403 || error.message?.includes('Forbidden')) {
    return ErrorTypes.PERMISSION;
  }

  if (error.status >= 500) {
    return ErrorTypes.SERVER;
  }

  if (error.status >= 400 && error.status < 500) {
    return ErrorTypes.CLIENT;
  }

  return ErrorTypes.UNKNOWN;
};

// ===== ERROR MESSAGES =====

const ErrorMessages = {
  [ErrorTypes.VALIDATION]: 'Bitte überprüfen Sie Ihre Eingaben',
  [ErrorTypes.NETWORK]: 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung',
  [ErrorTypes.AUTH]: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an',
  [ErrorTypes.PERMISSION]: 'Sie haben keine Berechtigung für diese Aktion',
  [ErrorTypes.SERVER]: 'Serverfehler. Bitte versuchen Sie es später erneut',
  [ErrorTypes.CLIENT]: 'Anfrage fehlerhaft. Bitte versuchen Sie es erneut',
  [ErrorTypes.UNKNOWN]: 'Ein unerwarteter Fehler ist aufgetreten',
};

// ===== GLOBAL ERROR HANDLER =====

class GlobalErrorHandler {
  constructor() {
    this.errorReportingService = null;
    this.onAuthError = null;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  // Initialize error reporting service (e.g., Sentry)
  setErrorReportingService(service) {
    this.errorReportingService = service;
  }

  // Set auth error callback (for logout, redirect, etc.)
  setAuthErrorHandler(handler) {
    this.onAuthError = handler;
  }

  // Handle errors with appropriate UI feedback
  handleError(error, context = {}) {
    const errorType = classifyError(error);
    const userMessage = this.getUserMessage(error, errorType);

    // Log error for debugging
    this.logError(error, context, errorType);

    // Report to external service
    this.reportError(error, context, errorType);

    // Handle auth errors specially
    if (errorType === ErrorTypes.AUTH && this.onAuthError) {
      this.onAuthError(error);
    }

    // Show toast notification
    this.showToast(error, errorType, userMessage);

    return {
      type: errorType,
      message: userMessage,
      originalError: error,
    };
  }

  // Get user-friendly error message
  getUserMessage(error, errorType) {
    // Check if error has a custom user message
    if (error.userMessage) {
      return error.userMessage;
    }

    // For validation errors, use the first error message
    if (errorType === ErrorTypes.VALIDATION && error.errors) {
      const firstError = Object.values(error.errors)[0];
      if (typeof firstError === 'string') {
        return firstError;
      }
    }

    // Use error message if it's user-friendly
    if (error.message && this.isUserFriendlyMessage(error.message)) {
      return error.message;
    }

    // Fall back to default message for error type
    return ErrorMessages[errorType];
  }

  // Check if error message is user-friendly
  isUserFriendlyMessage(message) {
    const technicalTerms = [
      'fetch',
      'undefined',
      'null',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'stack',
      'trace',
      'JSON.parse',
      'Cannot read',
    ];

    return !technicalTerms.some(term => message.toLowerCase().includes(term.toLowerCase()));
  }

  // Show toast notification based on error type
  showToast(error, errorType, message) {
    const toastOptions = {
      duration: this.getToastDuration(errorType),
      position: 'top-right',
      style: {
        maxWidth: '400px',
      },
    };

    switch (errorType) {
      case ErrorTypes.VALIDATION:
        toast.error(message, {
          ...toastOptions,
          icon: '⚠️',
          duration: 4000,
        });
        break;

      case ErrorTypes.NETWORK:
        toast.error(message, {
          ...toastOptions,
          icon: '🌐',
          duration: 5000,
        });
        break;

      case ErrorTypes.AUTH:
        toast.error(message, {
          ...toastOptions,
          icon: '🔒',
          duration: 6000,
        });
        break;

      case ErrorTypes.PERMISSION:
        toast.error(message, {
          ...toastOptions,
          icon: '🚫',
          duration: 5000,
        });
        break;

      case ErrorTypes.SERVER:
        toast.error(message, {
          ...toastOptions,
          icon: '🔧',
          duration: 6000,
        });
        break;

      default:
        toast.error(message, toastOptions);
    }
  }

  // Get toast duration based on error severity
  getToastDuration(errorType) {
    switch (errorType) {
      case ErrorTypes.VALIDATION:
        return 4000;
      case ErrorTypes.NETWORK:
      case ErrorTypes.AUTH:
      case ErrorTypes.SERVER:
        return 6000;
      default:
        return 4000;
    }
  }

  // Log error for debugging
  logError(error, context, errorType) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (this.isDevelopment) {
      console.group('🚨 Error Handler');
      console.error('Error:', error);
      console.log('Type:', errorType);
      console.log('Context:', context);
      console.log('Full log data:', logData);
      console.groupEnd();
    }

    // Store recent errors for debugging
    if (typeof window !== 'undefined') {
      const recentErrors = JSON.parse(localStorage.getItem('cleanidoc_recent_errors') || '[]');
      recentErrors.unshift(logData);

      // Keep only last 10 errors
      const trimmedErrors = recentErrors.slice(0, 10);
      localStorage.setItem('cleanidoc_recent_errors', JSON.stringify(trimmedErrors));
    }
  }

  // Report error to external service
  reportError(error, context, errorType) {
    if (this.errorReportingService && errorType !== ErrorTypes.VALIDATION) {
      try {
        this.errorReportingService.captureException(error, {
          tags: {
            errorType,
            component: context.component,
            action: context.action,
          },
          extra: {
            context,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (reportingError) {
        console.warn('Failed to report error:', reportingError);
      }
    }
  }

  // Handle Promise rejections
  handleUnhandledRejection = event => {
    this.handleError(event.reason, {
      component: 'UnhandledPromise',
      action: 'rejection',
    });

    // Prevent the default browser error logging
    event.preventDefault();
  };

  // Handle uncaught errors
  handleUncaughtError = event => {
    this.handleError(event.error, {
      component: 'UncaughtError',
      action: 'global',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Don't prevent default to maintain browser error logging
  };

  // Setup global error handlers
  setupGlobalHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.addEventListener('error', this.handleUncaughtError);
    }
  }

  // Cleanup global error handlers
  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.removeEventListener('error', this.handleUncaughtError);
    }
  }

  // Get recent errors for debugging
  getRecentErrors() {
    if (typeof window === 'undefined') return [];

    try {
      return JSON.parse(localStorage.getItem('cleanidoc_recent_errors') || '[]');
    } catch {
      return [];
    }
  }

  // Clear recent errors
  clearRecentErrors() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cleanidoc_recent_errors');
    }
  }
}

// ===== SINGLETON INSTANCE =====

const globalErrorHandler = new GlobalErrorHandler();

// ===== HOOKS FOR REACT COMPONENTS =====

export const useErrorHandler = () => {
  const handleError = (error, context = {}) => {
    return globalErrorHandler.handleError(error, context);
  };

  const showSuccess = (message, options = {}) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      ...options,
    });
  };

  const showWarning = (message, options = {}) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fcd34d',
      },
      ...options,
    });
  };

  const showInfo = (message, options = {}) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #93c5fd',
      },
      ...options,
    });
  };

  return {
    handleError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

// ===== PROMISE WRAPPER WITH ERROR HANDLING =====

export const withErrorHandling = (promise, context = {}) => {
  return promise.catch(error => {
    globalErrorHandler.handleError(error, context);
    throw error; // Re-throw to maintain promise chain
  });
};

// ===== ASYNC FUNCTION WRAPPER =====

export const withAsyncErrorHandling = (asyncFn, context = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      globalErrorHandler.handleError(error, context);
      throw error;
    }
  };
};

export { globalErrorHandler, ErrorMessages };

export default globalErrorHandler;
