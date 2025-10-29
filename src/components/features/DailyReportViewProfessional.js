import React from 'react';

function DailyReportViewProfessional({ logs, date, customers, areas, isPdfExport = false }) {
  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCustomerName = customerId => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unbekannter Kunde';
  };

  const getAreaName = areaId => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.name : 'Unbekannter Bereich';
  };

  const getStatusText = status => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'pending':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#000',
    backgroundColor: '#fff',
    padding: isPdfExport ? '20mm' : '20px',
    maxWidth: isPdfExport ? 'none' : '210mm',
    margin: '0 auto',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #2563eb',
    paddingBottom: '15px',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: '10px',
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: '#666',
    marginBottom: '5px',
  };

  const logItemStyle = {
    marginBottom: '25px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#fafafa',
    pageBreakInside: 'avoid',
  };

  const logHeaderStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #ddd',
  };

  const infoGroupStyle = {
    marginBottom: '8px',
  };

  const labelStyle = {
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: '8px',
  };

  const stepsTableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    fontSize: '11px',
  };

  const thStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '8px 6px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: '1px solid #ddd',
  };

  const tdStyle = {
    padding: '6px',
    border: '1px solid #ddd',
    verticalAlign: 'top',
  };

  const statusBadgeStyle = status => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor:
      status === 'completed' ? '#10b981' : status === 'in_progress' ? '#f59e0b' : '#6b7280',
  });

  const signatureStyle = {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>CleaniDoc - Tagesprotokoll</h1>
        <p style={subtitleStyle}>{formatDate(date)}</p>
        <p style={{ ...subtitleStyle, fontSize: '14px' }}>
          Zusammenfassung aller Reinigungsprotokolle vom{' '}
          {new Date(date).toLocaleDateString('de-DE')}
        </p>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Keine Protokolle für diesen Tag vorhanden.
        </div>
      ) : (
        logs.map((log, index) => (
          <div key={log.id} style={logItemStyle}>
            <div style={logHeaderStyle}>
              <div>
                <div style={infoGroupStyle}>
                  <span style={labelStyle}>Protokoll #{index + 1}:</span>
                  <span>{log.id}</span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={labelStyle}>Kunde:</span>
                  <span>{getCustomerName(log.customer_id)}</span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={labelStyle}>Bereich:</span>
                  <span>{getAreaName(log.area_id)}</span>
                </div>
              </div>
              <div>
                <div style={infoGroupStyle}>
                  <span style={labelStyle}>Status:</span>
                  <span style={statusBadgeStyle(log.status)}>{getStatusText(log.status)}</span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={labelStyle}>Erstellt:</span>
                  <span>{new Date(log.created_at).toLocaleString('de-DE')}</span>
                </div>
                {log.completed_at && (
                  <div style={infoGroupStyle}>
                    <span style={labelStyle}>Abgeschlossen:</span>
                    <span>{new Date(log.completed_at).toLocaleString('de-DE')}</span>
                  </div>
                )}
              </div>
            </div>

            {log.notes && (
              <div style={{ marginBottom: '15px' }}>
                <span style={labelStyle}>Notizen:</span>
                <span>{log.notes}</span>
              </div>
            )}

            {log.cleaning_log_steps && log.cleaning_log_steps.length > 0 && (
              <div>
                <span style={labelStyle}>Reinigungsschritte:</span>
                <table style={stepsTableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '40%' }}>Schritt</th>
                      <th style={{ ...thStyle, width: '20%' }}>Reinigungsmittel</th>
                      <th style={{ ...thStyle, width: '15%' }}>Einwirkzeit</th>
                      <th style={{ ...thStyle, width: '10%' }}>Status</th>
                      <th style={{ ...thStyle, width: '15%' }}>Notizen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.cleaning_log_steps.map((step, stepIndex) => (
                      <tr key={stepIndex}>
                        <td style={tdStyle}>{step.step_name}</td>
                        <td style={tdStyle}>{step.cleaning_agent || '-'}</td>
                        <td style={tdStyle}>{step.contact_time || '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span
                            style={{
                              color: step.completed ? '#10b981' : '#6b7280',
                              fontWeight: 'bold',
                            }}
                          >
                            {step.completed ? '✓' : '○'}
                          </span>
                        </td>
                        <td style={tdStyle}>{step.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {log.signature && (
              <div style={signatureStyle}>
                <span style={labelStyle}>Unterschrift vorhanden:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  ✓ Protokoll unterschrieben
                </span>
              </div>
            )}
          </div>
        ))
      )}

      <div
        style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#666',
          borderTop: '1px solid #ddd',
          paddingTop: '15px',
        }}
      >
        <p>Erstellt am {new Date().toLocaleString('de-DE')} | CleaniDoc Dashboard</p>
      </div>
    </div>
  );
}

export default DailyReportViewProfessional;
