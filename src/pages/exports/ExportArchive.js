import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Archive,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Database,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import './ExportArchive.css';

const ExportArchive = () => {
  const [exports, setExports] = useState([]);
  const [filteredExports, setFilteredExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    status: 'all',
    search: '',
  });
  const [selectedExport, setSelectedExport] = useState(null);
  const [downloadUrls, setDownloadUrls] = useState({});
  const [stats, setStats] = useState({
    total_exports: 0,
    successful_exports: 0,
    total_size_gb: 0,
    last_export_date: null,
  });

  useEffect(() => {
    loadExports();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [exports, filters]);

  const loadExports = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('daily_exports')
        .select(
          `
          id,
          report_date,
          status,
          total_logs,
          completed_logs,
          failed_logs,
          total_steps,
          total_photos,
          total_size_bytes,
          email_sent_at,
          sftp_uploaded_at,
          webhook_sent_at,
          processing_time_ms,
          created_at,
          error_message
        `
        )
        .order('report_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      setExports(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Exporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_exports')
        .select('status, total_size_bytes, report_date')
        .eq('status', 'COMPLETED');

      if (error) throw error;

      const totalSize = data?.reduce((sum, exp) => sum + (exp.total_size_bytes || 0), 0) || 0;
      const lastExport = data?.[0]?.report_date || null;

      setStats({
        total_exports: data?.length || 0,
        successful_exports: data?.length || 0,
        total_size_gb: (totalSize / 1024 / 1024 / 1024).toFixed(2),
        last_export_date: lastExport,
      });
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...exports];

    // Datumsfilter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case 'last7':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last30':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last90':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'thisMonth':
          startDate = startOfMonth(now);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(exp => new Date(exp.report_date) >= startDate);
      }
    }

    // Status-Filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(exp => exp.status === filters.status.toUpperCase());
    }

    // Suchfilter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        exp =>
          exp.report_date.toLowerCase().includes(searchLower) ||
          exp.id.toLowerCase().includes(searchLower) ||
          (exp.error_message && exp.error_message.toLowerCase().includes(searchLower))
      );
    }

    setFilteredExports(filtered);
  };

  const handleDownload = async (exportId, fileType) => {
    try {
      // Pre-signed URL anfordern
      const { data, error } = await supabase.rpc('generate_export_download_url', {
        export_id: exportId,
        file_type: fileType,
      });

      if (error) throw error;

      if (data?.download_url) {
        // Download in neuem Tab öffnen
        window.open(data.download_url, '_blank');
      } else {
        throw new Error('Download-URL konnte nicht generiert werden');
      }
    } catch (error) {
      console.error('Download-Fehler:', error);
      alert('Download fehlgeschlagen: ' + error.message);
    }
  };

  const handlePreview = exportData => {
    setSelectedExport(exportData);
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'FAILED':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'PROCESSING':
        return <Clock className="text-blue-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getStatusText = status => {
    switch (status) {
      case 'COMPLETED':
        return 'Abgeschlossen';
      case 'FAILED':
        return 'Fehlgeschlagen';
      case 'PROCESSING':
        return 'In Bearbeitung';
      case 'PENDING':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  const formatFileSize = bytes => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const formatDuration = ms => {
    if (!ms) return '-';
    const seconds = Math.round(ms / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="export-archive-loading">
        <RefreshCw className="animate-spin" size={24} />
        <p>Lade Export-Archiv...</p>
      </div>
    );
  }

  return (
    <div className="export-archive-page">
      <div className="archive-header">
        <div className="header-content">
          <h1>
            <Archive size={28} />
            Export-Archiv
          </h1>
          <p>Verwalten und herunterladen Sie Ihre HACCP-Export-Archive</p>
        </div>

        <button className="btn btn-primary" onClick={loadExports}>
          <RefreshCw size={16} />
          Aktualisieren
        </button>
      </div>

      {/* Statistiken */}
      <div className="archive-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_exports}</div>
            <div className="stat-label">Gesamt-Exporte</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.successful_exports}</div>
            <div className="stat-label">Erfolgreich</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_size_gb} GB</div>
            <div className="stat-label">Speicherplatz</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {stats.last_export_date
                ? format(parseISO(stats.last_export_date), 'dd.MM.yyyy', { locale: de })
                : '-'}
            </div>
            <div className="stat-label">Letzter Export</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="archive-filters">
        <div className="filter-group">
          <label>
            <Calendar size={16} />
            Zeitraum
          </label>
          <select
            value={filters.dateRange}
            onChange={e => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
          >
            <option value="all">Alle</option>
            <option value="last7">Letzte 7 Tage</option>
            <option value="last30">Letzte 30 Tage</option>
            <option value="last90">Letzte 90 Tage</option>
            <option value="thisMonth">Dieser Monat</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <Filter size={16} />
            Status
          </label>
          <select
            value={filters.status}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">Alle</option>
            <option value="completed">Abgeschlossen</option>
            <option value="failed">Fehlgeschlagen</option>
            <option value="processing">In Bearbeitung</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <Search size={16} />
            Suchen
          </label>
          <input
            type="text"
            placeholder="Export-ID oder Datum..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Export-Liste */}
      <div className="archive-table-container">
        <table className="archive-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Status</th>
              <th>Protokolle</th>
              <th>Größe</th>
              <th>Verarbeitung</th>
              <th>Versand</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredExports.map(exportData => (
              <tr key={exportData.id} className={`status-${exportData.status.toLowerCase()}`}>
                <td>
                  <div className="export-date">
                    <strong>
                      {format(parseISO(exportData.report_date), 'dd.MM.yyyy', { locale: de })}
                    </strong>
                    <small>
                      {format(parseISO(exportData.created_at), 'HH:mm', { locale: de })}
                    </small>
                  </div>
                </td>

                <td>
                  <div className="status-badge">
                    {getStatusIcon(exportData.status)}
                    <span>{getStatusText(exportData.status)}</span>
                  </div>
                  {exportData.error_message && (
                    <small className="error-text" title={exportData.error_message}>
                      {exportData.error_message.substring(0, 50)}...
                    </small>
                  )}
                </td>

                <td>
                  <div className="protocol-stats">
                    <span className="completed">
                      {exportData.completed_logs}/{exportData.total_logs}
                    </span>
                    {exportData.failed_logs > 0 && (
                      <span className="failed">({exportData.failed_logs} Fehler)</span>
                    )}
                    <small>
                      {exportData.total_steps} Schritte, {exportData.total_photos} Fotos
                    </small>
                  </div>
                </td>

                <td>{formatFileSize(exportData.total_size_bytes)}</td>

                <td>{formatDuration(exportData.processing_time_ms)}</td>

                <td>
                  <div className="delivery-status">
                    {exportData.email_sent_at && (
                      <span className="delivery-success" title="E-Mail versendet">
                        <Mail size={14} />
                      </span>
                    )}
                    {exportData.sftp_uploaded_at && (
                      <span className="delivery-success" title="SFTP hochgeladen">
                        <Database size={14} />
                      </span>
                    )}
                    {exportData.webhook_sent_at && (
                      <span className="delivery-success" title="Webhook gesendet">
                        <CheckCircle size={14} />
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon"
                      onClick={() => handlePreview(exportData)}
                      title="Vorschau"
                    >
                      <Eye size={16} />
                    </button>

                    {exportData.status === 'COMPLETED' && (
                      <>
                        <button
                          className="btn-icon"
                          onClick={() => handleDownload(exportData.id, 'pdf')}
                          title="PDF herunterladen"
                        >
                          <FileText size={16} />
                        </button>

                        <button
                          className="btn-icon"
                          onClick={() => handleDownload(exportData.id, 'zip')}
                          title="CSV-Paket herunterladen"
                        >
                          <Download size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredExports.length === 0 && (
          <div className="empty-state">
            <Archive size={48} />
            <h3>Keine Exporte gefunden</h3>
            <p>Passen Sie Ihre Filter an oder erstellen Sie einen neuen Export.</p>
          </div>
        )}
      </div>

      {/* Export-Detail Modal */}
      {selectedExport && (
        <div className="modal-overlay" onClick={() => setSelectedExport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Export-Details -{' '}
                {format(parseISO(selectedExport.report_date), 'dd.MM.yyyy', { locale: de })}
              </h3>
              <button className="modal-close" onClick={() => setSelectedExport(null)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Export-ID</label>
                  <code>{selectedExport.id}</code>
                </div>

                <div className="detail-item">
                  <label>Status</label>
                  <div className="status-badge">
                    {getStatusIcon(selectedExport.status)}
                    {getStatusText(selectedExport.status)}
                  </div>
                </div>

                <div className="detail-item">
                  <label>Erstellt am</label>
                  <span>
                    {format(parseISO(selectedExport.created_at), 'dd.MM.yyyy HH:mm:ss', {
                      locale: de,
                    })}
                  </span>
                </div>

                <div className="detail-item">
                  <label>Verarbeitungszeit</label>
                  <span>{formatDuration(selectedExport.processing_time_ms)}</span>
                </div>

                <div className="detail-item">
                  <label>Gesamtgröße</label>
                  <span>{formatFileSize(selectedExport.total_size_bytes)}</span>
                </div>

                <div className="detail-item">
                  <label>Protokolle</label>
                  <span>
                    {selectedExport.completed_logs} von {selectedExport.total_logs}
                    {selectedExport.failed_logs > 0 && ` (${selectedExport.failed_logs} Fehler)`}
                  </span>
                </div>
              </div>

              {selectedExport.error_message && (
                <div className="error-details">
                  <label>Fehlermeldung</label>
                  <code>{selectedExport.error_message}</code>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedExport.status === 'COMPLETED' && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDownload(selectedExport.id, 'pdf')}
                  >
                    <FileText size={16} />
                    PDF herunterladen
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(selectedExport.id, 'zip')}
                  >
                    <Download size={16} />
                    CSV-Paket herunterladen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportArchive;
