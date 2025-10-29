import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 9999,
        }}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            padding: 'var(--space-md) var(--space-lg)',
            maxWidth: '400px',
            wordBreak: 'break-word',
          },

          // Success toasts
          success: {
            duration: 3000,
            style: {
              background: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              border: '1px solid var(--color-success-200)',
            },
            iconTheme: {
              primary: 'var(--color-success-600)',
              secondary: 'var(--color-success-50)',
            },
          },

          // Error toasts
          error: {
            duration: 5000,
            style: {
              background: 'var(--color-error-50)',
              color: 'var(--color-error-700)',
              border: '1px solid var(--color-error-200)',
            },
            iconTheme: {
              primary: 'var(--color-error-600)',
              secondary: 'var(--color-error-50)',
            },
          },

          // Loading toasts
          loading: {
            duration: Infinity,
            style: {
              background: 'var(--color-primary-50)',
              color: 'var(--color-primary-700)',
              border: '1px solid var(--color-primary-200)',
            },
            iconTheme: {
              primary: 'var(--color-primary-600)',
              secondary: 'var(--color-primary-50)',
            },
          },
        }}
        // Custom toast component styling
        children={t => (
          <div
            className={`toast-container ${t.visible ? 'toast-enter' : 'toast-exit'}`}
            style={{
              transform: t.visible
                ? 'translate3d(0,0,0) scale(1)'
                : 'translate3d(100%,0,0) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: t.visible ? 1 : 0,
            }}
          >
            <div
              className="toast-content"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-sm)',
                ...t.style,
              }}
            >
              {/* Toast icon */}
              {t.icon && (
                <div className="toast-icon" style={{ flexShrink: 0 }}>
                  {t.icon}
                </div>
              )}

              {/* Toast message */}
              <div className="toast-message" style={{ flex: 1 }}>
                {t.message}
              </div>

              {/* Dismiss button for persistent toasts */}
              {t.type === 'error' && t.duration > 4000 && (
                <button
                  onClick={() => window.toast?.dismiss(t.id)}
                  className="toast-dismiss"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    opacity: 0.6,
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '2px',
                    fontSize: '16px',
                    lineHeight: 1,
                    flexShrink: 0,
                    marginLeft: 'var(--space-xs)',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      />

      {/* Toast styles */}
      <style jsx global>{`
        .toast-container {
          pointer-events: auto;
        }

        .toast-content {
          position: relative;
        }

        .toast-dismiss:hover {
          opacity: 1 !important;
          background: rgba(0, 0, 0, 0.1) !important;
        }

        .toast-dismiss:focus {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 1px;
        }

        /* Animation classes */
        .toast-enter {
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toast-exit {
          animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideIn {
          from {
            transform: translate3d(100%, 0, 0) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate3d(100%, 0, 0) scale(0.95);
            opacity: 0;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .Toaster div[role='status'] {
            background: var(--color-bg-primary) !important;
            color: var(--color-text-primary) !important;
            border-color: var(--color-border-primary) !important;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .toast-enter,
          .toast-exit {
            animation: none;
          }

          .toast-container {
            transition: none !important;
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 640px) {
          .Toaster {
            --gap: 8px;
          }

          .Toaster > div {
            left: 16px !important;
            right: 16px !important;
            width: auto !important;
            max-width: none !important;
          }

          .toast-content {
            font-size: var(--font-size-xs) !important;
            padding: var(--space-sm) var(--space-md) !important;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .Toaster div[role='status'] {
            border-width: 2px !important;
          }

          .toast-dismiss {
            border: 1px solid currentColor !important;
          }
        }

        /* Focus management for accessibility */
        .Toaster div[role='status']:focus {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
};

export default ToastProvider;
