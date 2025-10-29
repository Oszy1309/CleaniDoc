import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Calendar, Filter, Eye, Printer } from 'lucide-react';
import DailyReportViewProfessional from '../../components/features/DailyReportViewProfessional';
import './DailyReportPage.css';

function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: logsData, error: logsError } = await supabase
        .from('cleaning_logs')
        .select(
          `
          *,
          customers:customer_id(id, name, email, contact_person),
          areas:area_id(id, name, description),
          cleaning_plans:cleaning_plan_id(id, name, description),
          cleaning_log_steps(*)
        `
        )
        .eq('scheduled_date', selectedDate)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      const { data: areasData } = await supabase
        .from('areas')
        .select('id, name')
        .order('name', { ascending: true });

      setCustomers(customersData || []);
      setAreas(areasData || []);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLogs = logs.filter(log => {
    if (selectedCustomerId !== 'all' && log.customer_id !== selectedCustomerId) return false;
    if (selectedAreaId !== 'all' && log.area_id !== selectedAreaId) return false;
    return true;
  });

  const getStatistics = () => {
    return {
      totalLogs: filteredLogs.length,
      completedLogs: filteredLogs.filter(l => l.status === 'completed').length,
      inProgressLogs: filteredLogs.filter(l => l.status === 'in_progress').length,
      pendingLogs: filteredLogs.filter(l => l.status === 'pending').length,
      signedLogs: filteredLogs.filter(l => l.signature).length,
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePDF = async () => {
    try {
      setExportingPDF(true);

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const reportElement = document.getElementById('daily-report-professional');
      if (!reportElement) {
        alert('Bericht konnte nicht generiert werden');
        return;
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const formattedDate = new Date(selectedDate)
        .toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '-');

      pdf.save(`Tagesprotokoll_${selectedDate}_${formattedDate}.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('PDF-Export fehlgeschlagen: ' + error.message);
    } finally {
      setExportingPDF(false);
    }
  };

  const stats = getStatistics();

  return (
    <div className="daily-report-page">
      <div className="page-header">
        <h1>Tagesprotokoll & Archivierung</h1>
        <p className="subtitle">
          Professionelle A4-Sammelberichte aller Reinigungsprotokolle für einen Tag
        </p>
      </div>

      <div className="controls-section">
        <div className="control-group">
          <label htmlFor="date-picker">Datum:</label>
          <div className="date-picker-wrapper">
            <Calendar size={18} />
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="customer-filter">Kunde:</label>
          <select
            id="customer-filter"
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
          >
            <option value="all">Alle Kunden</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="area-filter">Bereich:</label>
          <select
            id="area-filter"
            value={selectedAreaId}
            onChange={e => setSelectedAreaId(e.target.value)}
          >
            <option value="all">Alle Bereiche</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowPreview(!showPreview)}
            title="Vorschau anzeigen"
          >
            <Eye size={18} /> {showPreview ? 'Verstecken' : 'Vorschau'}
          </button>
          <button
            className="btn-secondary"
            onClick={handlePrint}
            disabled={filteredLogs.length === 0}
            title="Drucken (Strg+P)"
          >
            <Printer size={18} /> Drucken
          </button>
          <button
            className="btn-primary"
            onClick={handleGeneratePDF}
            disabled={exportingPDF || filteredLogs.length === 0}
            title="Professionelles A4-PDF herunterladen"
          >
            <Download size={18} /> {exportingPDF ? 'PDF wird generiert...' : 'PDF exportieren'}
          </button>
        </div>
      </div>

      {!loading && (
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Gesamt</span>
            <span className="stat-value">{stats.totalLogs}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">Abgeschlossen</span>
            <span className="stat-value">{stats.completedLogs}</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-label">In Bearbeitung</span>
            <span className="stat-value">{stats.inProgressLogs}</span>
          </div>
          <div className="stat-item info">
            <span className="stat-label">Ausstehend</span>
            <span className="stat-value">{stats.pendingLogs}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">Unterschrieben</span>
            <span className="stat-value">{stats.signedLogs}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Lädt Protokolle...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <p>
            Keine Protokolle für den {new Date(selectedDate).toLocaleDateString('de-DE')} vorhanden
          </p>
        </div>
      ) : (
        <>
          {showPreview && (
            <div className="report-preview-container">
              <div id="daily-report-professional">
                <DailyReportViewProfessional
                  logs={filteredLogs}
                  date={selectedDate}
                  customers={customers}
                  areas={areas}
                />
              </div>
            </div>
          )}

          <div id="daily-report-professional" style={{ display: 'none' }}>
            <DailyReportViewProfessional
              logs={filteredLogs}
              date={selectedDate}
              customers={customers}
              areas={areas}
              isPdfExport={true}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default DailyReportPage;
