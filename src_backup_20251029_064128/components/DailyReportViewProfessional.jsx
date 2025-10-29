import React from 'react';
import './DailyReportViewProfessional.css';

function DailyReportViewProfessional({ logs, date, customers, areas, isPdfExport = false }) {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: '✓ Abgeschlossen', class: 'success' },
      in_progress: { label: '⏳ In Bearbeitung', class: 'warning' },
      pending: { label: '⏸ Ausstehend', class: 'pending' },
    };
    return badges[status] || badges.pending;
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
    <div className={`daily-report-professional ${isPdfExport ? 'pdf-export' : ''}`}>
      {/* ========== COVER PAGE ========== */}
      <div className="protocol-page cover-page">
        <div className="cover-header">
          <div className="logo-section">
            <svg viewBox="0 0 100 100" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
              <path d="M 50 20 C 65 30 70 45 70 55 C 70 70 62 80 50 80 C 38 80 30 70 30 55 C 30 45 35 30 50 20 Z" 
                    fill="url(#logoGradient)" opacity="0.9"/>
              <circle cx="45" cy="35" r="6" fill="white" opacity="0.6"/>
              <line x1="50" y1="70" x2="50" y2="78" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <h1 className="company-name">CleaniDoc</h1>
            <p className="company-tagline">Professional Cleaning Management</p>
          </div>

          <div className="cover-divider"></div>

          <div className="protocol-title-section">
            <h2 className="protocol-title">TAGESPROTOKOLL REINIGUNG</h2>
            <p className="protocol-subtitle">Sammelberichtigung aller durchgeführten Reinigungen</p>
          </div>
        </div>

        <div className="cover-content">
          <div className="cover-info-grid">
            <div className="info-box">
              <label>Datum</label>
              <p className="info-value">{formattedDate}</p>
            </div>
            <div className="info-box">
              <label>Protokolldatum</label>
              <p className="info-value">{date}</p>
            </div>
            <div className="info-box">
              <label>Gesamtzahl Protokolle</label>
              <p className="info-value">{logs.length}</p>
            </div>
            <div className="info-box">
              <label>Abgeschlossen</label>
              <p className="info-value progress">{logs.filter(l => l.status === 'completed').length}</p>
            </div>
          </div>

          <div className="cover-progress">
            <div className="progress-bar-container">
              <span className="progress-bar-label">Fortschritt</span>
              <div className="progress-bar-wrapper">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: logs.length > 0 
                      ? `${(logs.filter(l => l.status === 'completed').length / logs.length) * 100}%` 
                      : '0%'
                  }}
                ></div>
              </div>
              <span className="progress-bar-percent">
                {logs.length > 0 ? Math.round((logs.filter(l => l.status === 'completed').length / logs.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="cover-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Durchgeführt</span>
            <span className="metadata-value">{logs.length}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Unterschrieben</span>
            <span className="metadata-value">{logs.filter(l => l.signature).length}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Generiert</span>
            <span className="metadata-value">{new Date().toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        <div className="page-break-indicator">Seite 1 von ∞</div>
      </div>

      {/* ========== DETAIL PAGES ========== */}
      {Object.entries(groupedByCustomer).map(([customerId, customerLogs], pageIndex) => {
        const customer = customers.find(c => c.id === customerId);
        const totalPages = Math.ceil(customerLogs.length / 3) + 1;
        
        return (
          <div key={customerId} className="protocol-page detail-page">
            <div className="page-header">
              <div className="header-left">
                <h3 className="header-title">{customer?.name || 'Kunde'}</h3>
                <p className="header-subtitle">Reinigungsprotokolle</p>
              </div>
              <div className="header-right">
                <p className="header-meta">Seite {pageIndex + 2} | {customer?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="steps-section">
              <h4 className="section-title">Durchgeführte Reinigungen ({customerLogs.length})</h4>

              <div className="steps-container">
                {customerLogs.map((log, index) => (
                  <div key={log.id} className="step-block">
                    <div className="step-header">
                      <div className="step-number">
                        <span className={`step-badge ${log.status === 'completed' ? 'completed' : 'pending'}`}>
                          {index + 1}
                        </span>
                        <span className="step-count">PROTOKOLL</span>
                      </div>
                      <div className="step-title-wrapper">
                        <h5 className="step-title">{log.areas?.name || 'Bereich'}</h5>
                      </div>
                    </div>

                    <div className="step-body">
                      <div className="step-details-grid">
                        <div className="detail-item">
                          <label>Plan</label>
                          <span className="value">{log.cleaning_plans?.name || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Datum</label>
                          <span className="value">{log.scheduled_date}</span>
                        </div>
                        <div className="detail-item">
                          <label>Status</label>
                          <span className={`status-badge ${getStatusBadge(log.status).class}`}>
                            {getStatusBadge(log.status).label}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Unterschrift</label>
                          <span className={`status-badge ${log.signature ? 'success' : 'pending'}`}>
                            {log.signature ? '✓ Vorhanden' : '✗ Fehlt'}
                          </span>
                        </div>

                        {log.cleaning_plans?.description && (
                          <div className="detail-item full-width">
                            <label>Plandetails</label>
                            <span className="value">{log.cleaning_plans.description}</span>
                          </div>
                        )}

                        {log.status === 'completed' && log.completed_at && (
                          <div className="detail-item full-width">
                            <label>Abgeschlossen</label>
                            <span className="value">
                              {new Date(log.completed_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                        )}
                      </div>

                      {log.signature && (
                        <div className="notes-box">
                          <label>Unterschrift</label>
                          <div style={{ 
                            width: '100%', 
                            maxHeight: '60px', 
                            overflow: 'hidden',
                            marginTop: '0.5rem'
                          }}>
                            <img 
                              src={log.signature} 
                              alt="Unterschrift" 
                              style={{ 
                                maxHeight: '60px', 
                                objectFit: 'contain' 
                              }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-break-indicator">Seite {pageIndex + 2}</div>
          </div>
        );
      })}

      {/* ========== FINAL PAGE ========== */}
      <div className="protocol-page final-page">
        <div className="page-header">
          <div className="header-left">
            <h3 className="header-title">Abschluss & Archivierung</h3>
            <p className="header-subtitle">Zusammenfassung & Unterschriften</p>
          </div>
        </div>

        <div className="deviations-section">
          <h4 className="section-title">Abweichungen & Bemerkungen</h4>
          <div className="deviations-box">
            <p className="deviations-placeholder">
              {logs.filter(l => l.status !== 'completed').length > 0 
                ? `${logs.filter(l => l.status !== 'completed').length} Protokoll(e) nicht abgeschlossen.`
                : 'Alle Protokolle wurden erfolgreich abgeschlossen.'}
            </p>
          </div>
        </div>

        <div className="signature-section">
          <h4 className="section-title">Unterschriften & Genehmigung</h4>
          <div className="signature-grid">
            <div className="signature-block">
              <div className="signature-label">Bearbeiter</div>
              <div className="signature-line">
                <span className="signature-placeholder">___________</span>
              </div>
              <div className="signature-meta">
                <p className="meta-label">Name:</p>
                <p className="meta-value"></p>
              </div>
            </div>
            <div className="signature-block">
              <div className="signature-label">Qualitätskontrolle</div>
              <div className="signature-line">
                <span className="signature-placeholder">___________</span>
              </div>
              <div className="signature-meta">
                <p className="meta-label">Name:</p>
                <p className="meta-value"></p>
              </div>
            </div>
            <div className="signature-block">
              <div className="signature-label">Genehmigung</div>
              <div className="signature-line">
                <span className="signature-placeholder">___________</span>
              </div>
              <div className="signature-meta">
                <p className="meta-label">Name:</p>
                <p className="meta-value"></p>
              </div>
            </div>
          </div>
        </div>

        <div className="archive-section">
          <div className="archive-grid">
            <div className="archive-item">
              <label>Archive ID</label>
              <span className="archive-value">CP-{date.replace(/-/g, '')}</span>
            </div>
            <div className="archive-item">
              <label>Protokolle</label>
              <span className="archive-value">{logs.length}</span>
            </div>
            <div className="archive-item">
              <label>Abgeschlossen</label>
              <span className="archive-value status-complete">{logs.filter(l => l.status === 'completed').length}</span>
            </div>
            <div className="archive-item">
              <label>Unterschrieben</label>
              <span className="archive-value status-complete">{logs.filter(l => l.signature).length}</span>
            </div>
          </div>
        </div>

        <div className="document-footer">
          <p className="footer-text">
            Dieses Protokoll wurde automatisch von CleaniDoc generiert
          </p>
          <p className="footer-text small">
            Aufbewahrung: 3 Jahre | Datenschutz: DSGVO konform | Qualität: ISO 9001
          </p>
        </div>

        <div className="page-break-indicator">Abschlussseite</div>
      </div>
    </div>
  );
}

export default DailyReportViewProfessional;
