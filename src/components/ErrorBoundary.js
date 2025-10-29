import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      hasError: true,
    });

    // Log error to external service (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
    });

    // Call optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      isDetailsOpen: !prevState.isDetailsOpen,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-content">
              {/* Error Icon */}
              <div className="error-boundary-icon">
                <AlertTriangle size={64} />
              </div>

              {/* Error Message */}
              <div className="error-boundary-message">
                <h1 className="error-boundary-title">Ups! Etwas ist schiefgelaufen</h1>
                <p className="error-boundary-description">
                  {this.props.message ||
                    'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="error-boundary-actions">
                <button
                  onClick={this.handleRetry}
                  className="error-boundary-button error-boundary-button-primary"
                >
                  <RefreshCw size={20} />
                  Erneut versuchen
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="error-boundary-button error-boundary-button-secondary"
                >
                  <Home size={20} />
                  Zur Startseite
                </button>
              </div>

              {/* Error Details (Development) */}
              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && (
                <div className="error-boundary-details">
                  <button
                    onClick={this.toggleDetails}
                    className="error-boundary-details-toggle"
                    aria-expanded={this.state.isDetailsOpen}
                  >
                    <ChevronDown
                      size={16}
                      className={`error-boundary-chevron ${
                        this.state.isDetailsOpen ? 'error-boundary-chevron-open' : ''
                      }`}
                    />
                    Fehlerdetails anzeigen
                  </button>

                  {this.state.isDetailsOpen && (
                    <div className="error-boundary-details-content">
                      <h3>Fehlermeldung:</h3>
                      <pre className="error-boundary-code">
                        {this.state.error && this.state.error.toString()}
                      </pre>

                      {this.state.errorInfo && (
                        <>
                          <h3>Stack Trace:</h3>
                          <pre className="error-boundary-code">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}

                      <h3>Fehlerzeitpunkt:</h3>
                      <p className="error-boundary-timestamp">
                        {new Date().toLocaleString('de-DE')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Support Information */}
              <div className="error-boundary-support">
                <p className="error-boundary-support-text">
                  Falls das Problem weiterhin besteht, kontaktieren Sie bitte den Support.
                </p>
                {this.props.supportEmail && (
                  <a
                    href={`mailto:${this.props.supportEmail}?subject=CleaniDoc%20Error%20Report`}
                    className="error-boundary-support-link"
                  >
                    Support kontaktieren
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for adding error boundaries to any component
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundaryComponent = props => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error, errorInfo) => {
    // This will be caught by the nearest error boundary
    throw error;
  }, []);

  return handleError;
};

// Specific error boundary for async operations
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="async-error-boundary">
          <div className="async-error-content">
            <AlertTriangle size={32} className="async-error-icon" />
            <h3 className="async-error-title">Laden fehlgeschlagen</h3>
            <p className="async-error-message">
              {this.state.error?.message || 'Daten konnten nicht geladen werden.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="async-error-retry"
            >
              <RefreshCw size={16} />
              Erneut laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
