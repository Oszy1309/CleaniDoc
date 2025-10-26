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

      // Generate combined PDF using the existing utility
      const { generateCleaningLogPDF } = await import('../utils/pdfUtils');
      const jsPDF = (await import('jspdf')).jsPDF;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
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
      yPosition += 20;

      // Add summary list
      pdf.setFontSize(14);
      pdf.setTextColor(30, 64, 175);
      pdf.text('Übersicht der Protokolle:', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      dailyProtocols.forEach((protocol, index) => {
        pdf.text(`${index + 1}. ${protocol.customers?.name} - ${protocol.areas?.name}`, margin + 5, yPosition);
        yPosition += 6;
        pdf.text(`   Status: ${protocol.status === 'completed' ? 'Abgeschlossen' : protocol.status === 'in_progress' ? 'In Bearbeitung' : 'Offen'}`, margin + 5, yPosition);
        yPosition += 6;
        if (protocol.workers?.name) {
          pdf.text(`   Arbeiter: ${protocol.workers.name}`, margin + 5, yPosition);
          yPosition += 6;
        }
        yPosition += 3;
      });

      // Add each protocol as full content
      for (const [index, protocol] of dailyProtocols.entries()) {
        pdf.addPage();

        const pdfData = {
          customerName: protocol.customers?.name || 'Unbekannt',
          areaName: protocol.areas?.name || 'Unbekannt',
          scheduledDate: new Date(protocol.scheduled_date).toLocaleDateString('de-DE'),
          status: protocol.status === 'completed' ? 'Abgeschlossen' : protocol.status === 'in_progress' ? 'In Bearbeitung' : 'Offen',
          planName: protocol.cleaning_plans?.name || 'Kein Plan',
          planDescription: protocol.cleaning_plans?.description || '',
          steps: protocol.cleaning_log_steps || [],
          signature: protocol.signature,
          completedAt: protocol.completed_at,
          workerName: protocol.workers?.name || 'Unbekannt'
        };

        // Manually add protocol content to current PDF
        let currentY = margin;

        // Header
        pdf.setFontSize(20);
        pdf.setTextColor(30, 64, 175);
        pdf.text(`Protokoll ${index + 1}: ${pdfData.customerName}`, margin, currentY);

        currentY += 12;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Datum: ${pdfData.scheduledDate}`, margin, currentY);

        currentY += 10;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // Customer Info
        pdf.setFontSize(12);
        pdf.setTextColor(30, 64, 175);
        pdf.text('Kundeninformation', margin, currentY);
        currentY += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        const customerInfo = [
          { label: 'Kunde:', value: pdfData.customerName },
          { label: 'Bereich:', value: pdfData.areaName },
          { label: 'Termin:', value: pdfData.scheduledDate },
          { label: 'Status:', value: pdfData.status },
          { label: 'Arbeiter:', value: pdfData.workerName },
        ];

        customerInfo.forEach((info) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(info.label, margin, currentY);
          pdf.setFont(undefined, 'normal');
          pdf.text(info.value, margin + 40, currentY);
          currentY += 7;
        });

        currentY += 10;

        // Plan Info
        pdf.setFontSize(12);
        pdf.setTextColor(30, 64, 175);
        pdf.text('Reinigungsplan', margin, currentY);
        currentY += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text('Plan:', margin, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(pdfData.planName, margin + 40, currentY);
        currentY += 7;

        if (pdfData.planDescription) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Beschreibung:', margin, currentY);
          currentY += 7;
          pdf.setFont(undefined, 'normal');

          const splitDescription = pdf.splitTextToSize(pdfData.planDescription, pageWidth - margin - 30);
          splitDescription.forEach((line) => {
            pdf.text(line, margin + 10, currentY);
            currentY += 5;
          });
        }

        currentY += 10;

        // Steps
        pdf.setFontSize(12);
        pdf.setTextColor(30, 64, 175);
        pdf.text('Reinigungsschritte', margin, currentY);
        currentY += 10;

        pdf.setFontSize(9);

        pdfData.steps.forEach((step, stepIndex) => {
          // Check if we need a new page
          if (currentY > pageHeight - 40) {
            pdf.addPage();
            currentY = margin;
          }

          // Step Header
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(30, 64, 175);
          pdf.text(`${stepIndex + 1}. ${step.step_name}`, margin, currentY);
          currentY += 6;

          // Step Details
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(80, 80, 80);

          const stepDetails = [];
          if (step.cleaning_agent && step.cleaning_agent !== 'none') {
            stepDetails.push(`Mittel: ${step.cleaning_agent}`);
          }
          if (step.dwell_time_minutes > 0) {
            stepDetails.push(`Einwirkzeit: ${step.dwell_time_minutes} min`);
          }
          if (step.completed) {
            stepDetails.push('✓ Erledigt');
          }

          stepDetails.forEach((detail) => {
            pdf.text(`• ${detail}`, margin + 5, currentY);
            currentY += 5;
          });

          if (step.worker_notes) {
            const splitNotes = pdf.splitTextToSize(`Notizen: ${step.worker_notes}`, pageWidth - margin - 10);
            splitNotes.forEach((line) => {
              pdf.text(line, margin + 5, currentY);
              currentY += 5;
            });
          }

          currentY += 5;
        });

        // Signature
        if (pdfData.signature) {
          currentY += 10;

          // Check if we need a new page for signature
          if (currentY > pageHeight - 60) {
            pdf.addPage();
            currentY = margin;
          }

          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 10;

          pdf.setFontSize(12);
          pdf.setTextColor(30, 64, 175);
          pdf.text('Unterschrift', margin, currentY);
          currentY += 15;

          // Add signature image
          try {
            pdf.addImage(pdfData.signature, 'PNG', margin, currentY, 80, 40);
            currentY += 45;
          } catch (error) {
            console.warn('Fehler beim Hinzufügen der Unterschrift:', error);
          }

          if (pdfData.completedAt) {
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text(
              `Unterschrieben am: ${new Date(pdfData.completedAt).toLocaleDateString('de-DE')}`,
              margin,
              currentY
            );
          }
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
