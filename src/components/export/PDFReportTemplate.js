import React from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import './PDFReportTemplate.css';

const PDFReportTemplate = ({ reportData, tenantSettings, signatures = [], isPreview = false }) => {
  const { reportDate, logs = [], customer, summary, exportId } = reportData;

  const formatDateTime = dateString => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dateString;
    }
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy', { locale: de });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'skipped':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = status => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'failed':
        return 'Fehlgeschlagen';
      case 'skipped':
        return 'Übersprungen';
      case 'pending':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  return (
    <div className="pdf-container">
      {isPreview && <div className="pdf-preview-note">PDF-Vorschau (Druck: Strg+P)</div>}

      {/* Header Section */}
      <div className="pdf-header no-page-break">
        <div className="pdf-logo">
          {tenantSettings?.logo_url ? (
            <img
              src={tenantSettings.logo_url}
              alt="Logo"
              style={{ width: '100%', height: 'auto' }}
            />
          ) : (
            <div
              style={{
                width: '60pt',
                height: '60pt',
                background: tenantSettings?.brand_primary || '#1e40af',
                borderRadius: '6pt',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14pt',
                fontWeight: 'bold',
              }}
            >
              CD
            </div>
          )}
        </div>

        <div className="pdf-company-info">
          <h1 className="pdf-title">HACCP-Reinigungsprotokoll</h1>
          <p className="pdf-subtitle">
            {tenantSettings?.company_legal || customer?.name || 'CleaniDoc System'}
          </p>
        </div>

        <div className="pdf-date-info">
          <div>
            Berichtsdatum: <strong>{formatDate(reportDate)}</strong>
          </div>
          <div>Erstellt: {formatDateTime(new Date().toISOString())}</div>
          <div>Export-ID: {exportId}</div>
        </div>
      </div>

      {/* Meta Information */}
      <div className="pdf-meta-grid no-page-break">
        <div className="pdf-meta-item">
          <div className="pdf-meta-label">Kunde</div>
          <div className="pdf-meta-value">{customer?.name || '-'}</div>
        </div>
        <div className="pdf-meta-item">
          <div className="pdf-meta-label">Standort</div>
          <div className="pdf-meta-value">{customer?.location || '-'}</div>
        </div>
        <div className="pdf-meta-item">
          <div className="pdf-meta-label">Protokolle Gesamt</div>
          <div className="pdf-meta-value">{summary?.total_logs || logs.length}</div>
        </div>
        <div className="pdf-meta-item">
          <div className="pdf-meta-label">Abgeschlossen</div>
          <div className="pdf-meta-value">
            {summary?.completed_logs || logs.filter(l => l.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="pdf-protocol-section">
        <h2 className="pdf-section-title">Protokoll-Übersicht</h2>

        <table className="pdf-summary-table">
          <thead>
            <tr>
              <th>Bereich</th>
              <th>Beginn</th>
              <th>Ende</th>
              <th>Dauer</th>
              <th>Status</th>
              <th>Mitarbeiter</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id || index}>
                <td>{log.area_name || log.cleaning_plan?.area || '-'}</td>
                <td>{formatDateTime(log.started_at)}</td>
                <td>{formatDateTime(log.completed_at)}</td>
                <td>
                  {log.duration_minutes
                    ? `${log.duration_minutes} Min.`
                    : log.started_at && log.completed_at
                      ? `${Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 60000)} Min.`
                      : '-'}
                </td>
                <td>
                  <span
                    className="pdf-step-status"
                    style={{
                      backgroundColor: getStatusColor(log.status) + '20',
                      color: getStatusColor(log.status),
                    }}
                  >
                    {getStatusText(log.status)}
                  </span>
                </td>
                <td>{log.worker?.name || log.created_by_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Step Documentation */}
      {logs.map((log, logIndex) => (
        <div key={log.id || logIndex} className="pdf-protocol-section">
          <h2 className="pdf-section-title">
            {log.area_name || log.cleaning_plan?.area} - Detailprotokoll
          </h2>

          {log.steps?.map((step, stepIndex) => (
            <div key={step.id || stepIndex} className="pdf-step-container no-page-break">
              <div className="pdf-step-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="pdf-step-number">{stepIndex + 1}</span>
                  <span className="pdf-step-name">{step.name || step.description}</span>
                </div>
                <span
                  className="pdf-step-status"
                  style={{
                    backgroundColor: getStatusColor(step.status) + '20',
                    color: getStatusColor(step.status),
                  }}
                >
                  {getStatusText(step.status)}
                </span>
              </div>

              <div className="pdf-step-details">
                <div className="pdf-step-chemical">
                  <span className="pdf-step-chemical-label">Reinigungsmittel: </span>
                  {step.chemical || step.cleaning_agent || '-'}
                </div>
                <div className="pdf-step-time">
                  <strong>Abgeschlossen: </strong>
                  {formatDateTime(step.completed_at)}
                </div>
                {step.dwell_time && (
                  <div className="pdf-step-chemical">
                    <span className="pdf-step-chemical-label">Einwirkzeit: </span>
                    {step.dwell_time} Sekunden
                  </div>
                )}
                {step.worker_name && (
                  <div className="pdf-step-time">
                    <strong>Mitarbeiter: </strong>
                    {step.worker_name}
                  </div>
                )}
              </div>

              {step.notes && (
                <div className="pdf-step-notes">
                  <strong>Bemerkungen:</strong> {step.notes}
                </div>
              )}

              {/* Photo Documentation */}
              {step.photos && step.photos.length > 0 && (
                <div className="pdf-photo-section">
                  <h4>Foto-Dokumentation:</h4>
                  <div className="pdf-photo-grid">
                    {step.photos.slice(0, 6).map((photo, photoIndex) => (
                      <div key={photo.id || photoIndex} className="pdf-photo-item">
                        <img
                          src={photo.thumbnail_url || photo.url}
                          alt={`Schritt ${stepIndex + 1} - Foto ${photoIndex + 1}`}
                          className="pdf-photo-thumbnail"
                          onError={e => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="pdf-photo-caption">
                          {formatDateTime(photo.taken_at || photo.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Quality Assurance Section */}
      <div className="pdf-qa-section no-page-break">
        <h3 className="pdf-qa-title">Qualitätssicherung & Compliance</h3>
        <div className="pdf-qa-checkpoints">
          <div className="pdf-qa-checkpoint">
            <span className="pdf-qa-checkbox checked"></span>
            HACCP-Richtlinien eingehalten
          </div>
          <div className="pdf-qa-checkpoint">
            <span className="pdf-qa-checkbox checked"></span>
            Alle Reinigungsschritte dokumentiert
          </div>
          <div className="pdf-qa-checkpoint">
            <span className="pdf-qa-checkbox checked"></span>
            Foto-Nachweis erbracht
          </div>
          <div className="pdf-qa-checkpoint">
            <span className="pdf-qa-checkbox checked"></span>
            Chemikalien ordnungsgemäß verwendet
          </div>
          <div className="pdf-qa-checkpoint">
            <span className="pdf-qa-checkbox checked"></span>
            Zeitliche Vorgaben eingehalten
          </div>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="pdf-signatures">
        <h2 className="pdf-section-title">Digitale Signaturen & Freigaben</h2>

        <div className="pdf-signature-grid">
          <div className="pdf-signature-block">
            <div className="pdf-signature-role">Schichtleitung</div>
            {signatures.find(s => s.signed_role === 'SHIFT_LEAD') ? (
              <div>
                <div
                  className="pdf-signature-line"
                  style={{ border: 'none', textAlign: 'center', padding: '10pt' }}
                >
                  <strong>✓ Digital signiert</strong>
                </div>
                <div className="pdf-signature-info">
                  Signiert von:{' '}
                  {signatures.find(s => s.signed_role === 'SHIFT_LEAD').signed_by_name}
                </div>
                <div className="pdf-signature-date">
                  Datum:{' '}
                  {formatDateTime(signatures.find(s => s.signed_role === 'SHIFT_LEAD').signed_at)}
                </div>
              </div>
            ) : (
              <div>
                <div className="pdf-signature-line"></div>
                <div className="pdf-signature-info">Unterschrift Schichtleitung</div>
                <div className="pdf-signature-date">Datum: ________________</div>
              </div>
            )}
          </div>

          <div className="pdf-signature-block">
            <div className="pdf-signature-role">Kunde / Qualitätsbeauftragte(r)</div>
            {signatures.find(s => s.signed_role === 'CLIENT_REP') ? (
              <div>
                <div
                  className="pdf-signature-line"
                  style={{ border: 'none', textAlign: 'center', padding: '10pt' }}
                >
                  <strong>✓ Digital bestätigt</strong>
                </div>
                <div className="pdf-signature-info">
                  Bestätigt von:{' '}
                  {signatures.find(s => s.signed_role === 'CLIENT_REP').signed_by_name}
                </div>
                <div className="pdf-signature-date">
                  Datum:{' '}
                  {formatDateTime(signatures.find(s => s.signed_role === 'CLIENT_REP').signed_at)}
                </div>
              </div>
            ) : (
              <div>
                <div className="pdf-signature-line"></div>
                <div className="pdf-signature-info">Unterschrift Kundenvertreter</div>
                <div className="pdf-signature-date">Datum: ________________</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pdf-footer">
        <div className="pdf-compliance-info">
          Dieses Dokument wurde automatisch generiert und entspricht den HACCP-Richtlinien. Alle
          Daten sind digital signiert und unveränderlich archiviert.
        </div>
        <div className="pdf-export-info">
          CleaniDoc Export System v2.0 | {formatDateTime(new Date().toISOString())} | ID: {exportId}
        </div>
      </div>
    </div>
  );
};

export default PDFReportTemplate;
