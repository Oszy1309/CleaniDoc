/**
 * Audit Service
 * Verwaltet Audit-Trail, Event-Logging und Hash-Verkettung
 * Alle Benutzeraktionen werden immutable geloggt
 */

import { supabase } from '../lib/supabase';
import crypto from 'crypto-js';

class AuditService {
  /**
   * Log eine Benutzeraktion mit Hash-Verkettung
   * @param {string} action - 'create', 'read', 'update', 'delete', 'sign', 'approve'
   * @param {string} resource - 'shifts', 'tasks', 'reports', etc.
   * @param {UUID} resourceId - ID der Ressource
   * @param {string} resourceName - Human-readable Name
   * @param {object} oldValues - Alte Werte (für Updates)
   * @param {object} newValues - Neue Werte (für Updates/Creates)
   * @returns {Promise<{id: number, currentHash: string}>}
   */
  async logAction(
    action,
    resource,
    resourceId = null,
    resourceName = null,
    oldValues = null,
    newValues = null
  ) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.warn('⚠️ Kein User authentifiziert - Audit abgebrochen');
        return null;
      }

      // Hole letzten Hash
      const { data: lastEvent, error: hashError } = await supabase
        .from('audit_events')
        .select('current_hash')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const previousHash = lastEvent?.current_hash || null;

      // Berechne aktuellen Hash
      const eventData = {
        user_id: user.id,
        action,
        resource,
        resource_id: resourceId,
        timestamp: new Date().toISOString(),
        previous_hash: previousHash,
      };

      const currentHash = this.calculateHash(JSON.stringify(eventData));

      // Hole Client Info
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      // Speichere Event
      const { data, error } = await supabase.from('audit_events').insert({
        user_id: user.id,
        action,
        resource,
        resource_id: resourceId,
        resource_name: resourceName,
        old_values: oldValues,
        new_values: newValues,
        previous_hash: previousHash,
        current_hash: currentHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date(),
        status: 'success',
      });

      if (error) {
        console.error('❌ Audit-Fehler:', error);
        throw error;
      }

      console.log(`📝 Audit-Event geloggt: ${action} auf ${resource}#${resourceId}`);

      return {
        id: data?.[0]?.id,
        currentHash,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Fehler beim Audit-Logging:', error);
      // Fehler nicht werfen - Audit soll Anwendung nicht blockieren
      return null;
    }
  }

  /**
   * Verifiziere die Hash-Kette auf Integrität
   * Prüft ob jedes Event den korrekten Hash des vorherigen hat
   * @param {number} limit - Anzahl der letzten Events zu prüfen (0 = alle)
   * @returns {Promise<{valid: boolean, errors: array}>}
   */
  async verifyIntegrity(limit = 100) {
    try {
      const query = supabase
        .from('audit_events')
        .select('id, previous_hash, current_hash, user_id, action, resource, timestamp')
        .order('id', { ascending: true });

      if (limit > 0) {
        query.limit(limit);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      if (!events || events.length === 0) {
        return { valid: true, errors: [] };
      }

      const errors = [];
      let previousHash = null;

      for (const event of events) {
        // Berechne erwarteten Hash
        const eventDataForHash = {
          user_id: event.user_id,
          action: event.action,
          resource: event.resource,
          timestamp: event.timestamp,
          previous_hash: previousHash,
        };

        const expectedHash = this.calculateHash(
          JSON.stringify(eventDataForHash)
        );

        // Vergleiche Hashes
        if (expectedHash !== event.current_hash) {
          errors.push({
            eventId: event.id,
            message: `Hash mismatch: erwartet ${expectedHash}, gefunden ${event.current_hash}`,
            timestamp: event.timestamp,
          });
        }

        // Prüfe previous_hash-Verkettung
        if (previousHash !== event.previous_hash && previousHash !== null) {
          errors.push({
            eventId: event.id,
            message: `Previous hash mismatch: Kette unterbrochen`,
            timestamp: event.timestamp,
          });
        }

        previousHash = event.current_hash;
      }

      const valid = errors.length === 0;

      if (valid) {
        console.log('✅ Hash-Kette ist intakt');
      } else {
        console.error('❌ Hash-Kette-Fehler gefunden:', errors);
      }

      return { valid, errors };
    } catch (error) {
      console.error('❌ Fehler bei Integritätsprüfung:', error);
      return { valid: false, errors: [{ message: error.message }] };
    }
  }

  /**
   * Hole Audit-Log für einen User oder Resource
   * @param {object} filters - { userId, resource, action, startDate, endDate }
   * @param {number} limit - Anzahl der Results
   * @returns {Promise<array>}
   */
  async getAuditLog(filters = {}, limit = 100) {
    try {
      let query = supabase.from('audit_events').select('*');

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.resource) {
        query = query.eq('resource', filters.resource);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Fehler beim Abrufen des Audit-Logs:', error);
      return [];
    }
  }

  /**
   * Exportiere Audit-Log als CSV
   * @param {array} events - Audit-Events zum Exportieren
   * @returns {string} CSV-Content
   */
  exportAsCSV(events) {
    const headers = [
      'Event ID',
      'Timestamp',
      'User ID',
      'Action',
      'Resource',
      'Resource ID',
      'Resource Name',
      'Old Values',
      'New Values',
      'IP Address',
      'Status',
    ];

    const rows = events.map(e => [
      e.id,
      new Date(e.timestamp).toLocaleString('de-DE'),
      e.user_id,
      e.action,
      e.resource,
      e.resource_id || '-',
      e.resource_name || '-',
      JSON.stringify(e.old_values || {}),
      JSON.stringify(e.new_values || {}),
      e.ip_address || '-',
      e.status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Download Audit-Log als CSV
   */
  downloadAuditLog(events, filename = 'audit-log.csv') {
    const csv = this.exportAsCSV(events);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Berechne SHA256 Hash
   * Verwendet crypto-js library
   */
  calculateHash(data) {
    return crypto.SHA256(data).toString();
  }

  /**
   * Hole aktuellen User
   */
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Hole Client IP-Adresse (Best-Effort)
   * Funktioniert nur wenn Backend IP forwarded
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('⚠️ Konnte IP nicht abrufen:', error);
      return null;
    }
  }

  /**
   * Simuliere ein Audit-Event für Testing
   * ACHTUNG: Nur in Development verwenden!
   */
  async simulateEvent(action, resource, resourceId = null) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Simulate nur in Development erlaubt');
    }

    return this.logAction(
      action,
      resource,
      resourceId,
      `Test ${resource} ${new Date().toLocaleTimeString()}`,
      { test: 'old' },
      { test: 'new' }
    );
  }
}

// Singleton Export
export default new AuditService();
