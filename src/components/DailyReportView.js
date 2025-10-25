import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './DailyReportView.css';

function DailyReportView({ logs, date, customers, areas, isPdfExport = false }) {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="status-icon completed" />;
      case 'in_progress':
        return <Clock size={20} className="status-icon in-progress" />;
      default:
        return <AlertCircle size={20} className="status-icon pending" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Abgeschlossen',
      in_progress: 'In Bearbeitung',
      pending: 'Ausstehend',
    };
    return labels[status] || status;
  };

  const groupedByCustomer = logs.reduce((acc, log) => {
    const customerId = log.customer_id;
    if (!acc[customerId]) {
      acc[customerId] = [];
    }
    acc[customerId].push(log);
    return acc;
  }, {});

  return (
    <div className={`daily-report-view ${isPdfExport ? 'pdf-export' : ''}`}>
      {/* Header */}
      <div className="report-header">
        <div className="report-title-section">
          <h1>TAGESPROTOKOLL REINIGUNG</h1>
          <p className="report-date">{formattedDate}</p>
        </div>
        <div className="report-meta">
          <p><strong>Gesamtzahl Protokolle:</strong> {logs.length}</p>
          <p><strong>Abgeschlossen:</strong> {logs.filter(l => l.status === 'completed').length}</p>
          <p><strong>Unterschrieben:</strong> {logs.filter(l => l.signature).length}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="report-divider"></div>

      {/* Customer Groups */}
      <div className="report-content">
        {Object.entries(groupedByCustomer).map(([customerId, customerLogs]) => {
          const customer = customers.find(c => c.id === customerId);
          return (
            <div key={customerId} className="customer-section">
              <div className="customer-header">
                <h2>{customer?.name}</h2>
                {customer?.contact_person && (
                  <p className="contact">Ansprechpartner: {customer.contact_person}</p>
                )}
                {customer?.email && (
                  <p className="email">Email: {customer.email}</p>
                )}
              </div>

              {/* Logs for this customer */}
              <div className="logs-section">
                {customerLogs.map((log, index) => (
                  <div key={log.id} className="log-entry">
                    <div className="log-entry-header">
                      <div className="log-entry-title">
                        <span className="log-number">#{index + 1}</span>
                        <span className="area-name">{log.areas?.name}</span>
                      </div>
                      <div className="log-entry-status">
                        {getStatusIcon(log.status)}
                        <span>{getStatusLabel(log.status)}</span>
                      </div>
                    </div>

                    <div className="log-entry-details">
                      <div className="detail-row">
                        <span className="detail-label">Plan:</span>
                        <span className="detail-value">{log.cleaning_plans?.name}</span>
                      </div>

                      {log.cleaning_plans?.description && (
                        <div className="detail-row">
                          <span className="detail-label">Beschreibung:</span>
                          <span className="detail-value">{log.cleaning_plans.description}</span>
                        </div>
                      )}

                      <div className="detail-row">
                        <span className="detail-label">Datum:</span>
                        <span className="detail-value">{log.scheduled_date}</span>
                      </div>

                      {log.assigned_worker_id && (
                        <div className="detail-row">
                          <span className="detail-label">Bearbeiter:</span>
                          <span className="detail-value">{log.assigned_worker_id}</span>
                        </div>
                      )}

                      {log.status === 'completed' && log.completed_at && (
                        <div className="detail-row">
                          <span className="detail-label">Abgeschlossen:</span>
                          <span className="detail-value">
                            {new Date(log.completed_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Signature */}
                    {log.signature && (
                      <div className="log-signature">
                        <p className="signature-label">✓ Unterschrift vorhanden</p>
                        <div className="signature-image">
                          <img src={log.signature} alt="Unterschrift" />
                        </div>
                      </div>
                    )}

                    {/* Divider zwischen Einträgen */}
                    {index < customerLogs.length - 1 && <div className="entry-divider"></div>}
                  </div>
                ))}
              </div>

              {/* Customer section divider */}
              <div className="customer-section-divider"></div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="report-footer">
        <p className="footer-text">
          Dieses Protokoll wurde automatisch generiert von CleaniDoc
        </p>
        <p className="footer-date">
          Generiert am: {new Date().toLocaleString('de-DE')}
        </p>
      </div>
    </div>
  );
}

export default DailyReportView;
