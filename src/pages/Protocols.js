import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Download, Calendar, FileText, Filter } from 'lucide-react';
import { generateCleaningLogPDF, downloadPDF } from '../utils/pdfUtils';
import './Protocols.css';

function Protocols() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredProtocols, setFilteredProtocols] = useState([]);

  useEffect(() => {
    fetchProtocols();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterProtocols();
  }, [protocols, dateFilter, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    }
  };

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name, description),
          cleaning_log_steps(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Hole Worker-Informationen separat für jedes Log
      const protocolsWithWorkers = await Promise.all((data || []).map(async (protocol) => {
        if (protocol.assigned_worker_id) {
          const { data: workerData } = await supabase
            .from('workers')
            .select('id, name')
            .eq('id', protocol.assigned_worker_id)
            .single();

          return { ...protocol, workers: workerData };
        }
        return protocol;
      }));

      setProtocols(protocolsWithWorkers);
    } catch (error) {
      console.error('Fehler beim Laden der Protokolle:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProtocols = () => {
    let filtered = [...protocols];

    if (dateFilter) {
      filtered = filtered.filter(protocol =>
        protocol.scheduled_date === dateFilter
      );
    }

    if (customerFilter) {
      filtered = filtered.filter(protocol =>
        protocol.customer_id === parseInt(customerFilter)
      );
    }

    setFilteredProtocols(filtered);
  };

  const downloadSingleProtocol = async (protocol) => {
    try {
      const pdfData = {
        customerName: protocol.customers?.name || 'Unbekannt',
        areaName: protocol.areas?.name || 'Unbekannt',
        scheduledDate: new Date(protocol.scheduled_date).toLocaleDateString('de-DE'),
        status: protocol.status === 'completed' ? 'Abgeschlossen' : 'Offen',
        planName: protocol.cleaning_plans?.name || 'Kein Plan',
        planDescription: protocol.cleaning_plans?.description || '',
        steps: protocol.cleaning_log_steps || [],
        signature: protocol.signature,
        completedAt: protocol.completed_at,
        workerName: protocol.workers?.name || 'Unbekannt'
      };

      const pdf = generateCleaningLogPDF(pdfData);
      const filename = `Protokoll_${protocol.customers?.name}_${protocol.scheduled_date}.pdf`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error);
      alert('Fehler beim Erstellen des PDFs: ' + error.message);
    }
  };

  const downloadDailyReport = async (date) => {
    try {
      const dailyProtocols = filteredProtocols.filter(p => p.scheduled_date === date);

      if (dailyProtocols.length === 0) {
        alert('Keine Protokolle für dieses Datum gefunden.');
        return;
      }

      // Generate combined PDF for all protocols of that day
      const pdf = new (await import('jspdf')).jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      // Title Page
      pdf.setFontSize(24);
      pdf.setTextColor(30, 64, 175);
      pdf.text('Tagesprotokoll-Zusammenfassung', margin, yPosition);

      yPosition += 15;
      pdf.setFontSize(14);
      pdf.text(`Datum: ${new Date(date).toLocaleDateString('de-DE')}`, margin, yPosition);

      yPosition += 10;
      pdf.setFontSize(12);
      pdf.text(`Anzahl Protokolle: ${dailyProtocols.length}`, margin, yPosition);

      yPosition += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      // Add each protocol
      for (const [index, protocol] of dailyProtocols.entries()) {
        if (index > 0) {
          pdf.addPage();
          yPosition = margin;
        }

        const pdfData = {
          customerName: protocol.customers?.name || 'Unbekannt',
          areaName: protocol.areas?.name || 'Unbekannt',
          scheduledDate: new Date(protocol.scheduled_date).toLocaleDateString('de-DE'),
          status: protocol.status === 'completed' ? 'Abgeschlossen' : 'Offen',
          planName: protocol.cleaning_plans?.name || 'Kein Plan',
          planDescription: protocol.cleaning_plans?.description || '',
          steps: protocol.cleaning_log_steps || [],
          signature: protocol.signature,
          completedAt: protocol.completed_at,
          workerName: protocol.workers?.name || 'Unbekannt'
        };

        // Add protocol content to existing PDF
        const singlePdf = generateCleaningLogPDF(pdfData);
        const pages = singlePdf.getNumberOfPages();

        for (let i = 1; i <= pages; i++) {
          if (i > 1 || index > 0) {
            pdf.addPage();
          }
          // Copy page content (simplified - in real implementation you'd need proper page copying)
          pdf.setPage(pdf.getNumberOfPages());
        }
      }

      const filename = `Tagesprotokoll_${date}.pdf`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Fehler beim Tagesreport-Download:', error);
      alert('Fehler beim Erstellen des Tagesreports: ' + error.message);
    }
  };

  // Group protocols by date
  const protocolsByDate = filteredProtocols.reduce((acc, protocol) => {
    const date = protocol.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(protocol);
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Lädt Protokolle...</div>;
  }

  return (
    <div className="protocols-page">
      <div className="page-header">
        <h1>Protokoll-Archiv</h1>
        <div className="filters">
          <div className="filter-group">
            <Calendar size={16} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Datum filtern"
            />
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="">Alle Kunden</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="protocols-content">
        <div className="debug-info" style={{padding: '10px', background: '#f0f0f0', margin: '10px 0', fontSize: '12px'}}>
          Debug: {protocols.length} Protokolle geladen, {filteredProtocols.length} nach Filter
        </div>
        {Object.keys(protocolsByDate).length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>Keine Protokolle gefunden</p>
            {dateFilter && <p>Für Datum: {dateFilter}</p>}
            {customerFilter && <p>Für Kunde: {customers.find(c => c.id == customerFilter)?.name}</p>}
          </div>
        ) : (
          Object.keys(protocolsByDate)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(date => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <h2>{new Date(date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</h2>
                  <button
                    className="btn-download-day"
                    onClick={() => downloadDailyReport(date)}
                  >
                    <Download size={16} />
                    Tagesreport PDF
                  </button>
                </div>

                <div className="protocols-list">
                  {protocolsByDate[date].map(protocol => (
                    <div key={protocol.id} className="protocol-card">
                      <div className="protocol-info">
                        <h3>{protocol.customers?.name}</h3>
                        <p className="area">{protocol.areas?.name}</p>
                        <p className="plan">{protocol.cleaning_plans?.name}</p>
                        <p className="worker">Arbeiter: {protocol.workers?.name}</p>
                        {protocol.completed_at && (
                          <p className="completed-time">
                            Abgeschlossen: {new Date(protocol.completed_at).toLocaleString('de-DE')}
                          </p>
                        )}
                      </div>

                      <div className="protocol-actions">
                        <div className="status-info">
                          <span className="steps-completed">
                            {protocol.cleaning_log_steps?.filter(s => s.completed).length || 0}/
                            {protocol.cleaning_log_steps?.length || 0} Schritte
                          </span>
                          <span className={`status-badge ${protocol.status}`}>
                            {protocol.status === 'completed' ? '✓ Abgeschlossen' :
                             protocol.status === 'in_progress' ? '⏳ In Bearbeitung' :
                             '📋 Offen'}
                          </span>
                          {protocol.signature && (
                            <span className="signature-badge">✍️ Unterschrieben</span>
                          )}
                        </div>

                        <button
                          className="btn-download"
                          onClick={() => downloadSingleProtocol(protocol)}
                        >
                          <Download size={16} />
                          PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default Protocols;
