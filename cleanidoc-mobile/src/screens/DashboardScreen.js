import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function DashboardScreen({ navigation }) {
  const { worker, signOut } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!worker) return;

    try {
      console.log('🔍 Debug: Worker ID:', worker.id);
      console.log('🔍 Debug: Worker Object:', worker);

      // 1. Hole erst alle eigenen Tasks
      const { data: myTasks, error: myTasksError } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customer:customers(name),
          area:areas(name),
          cleaning_plan:cleaning_plans(name, description)
        `)
        .eq('assigned_worker_id', worker.id)
        .order('scheduled_date', { ascending: true });

      if (myTasksError) throw myTasksError;
      console.log('📋 Debug: Meine Tasks gefunden:', myTasks?.length || 0);
      console.log('📋 Debug: Meine Tasks:', myTasks);

      // 2. Hole die Kunden, denen ich zugewiesen bin
      const { data: myCustomers, error: customersError } = await supabase
        .from('worker_customers')
        .select('customer_id')
        .eq('worker_id', worker.id);

      if (customersError) throw customersError;
      console.log('👥 Debug: Zugewiesene Kunden:', myCustomers);

      const myCustomerIds = myCustomers.map(wc => wc.customer_id);
      console.log('👥 Debug: Kunden-IDs:', myCustomerIds);

      // 3. Prüfe welche meiner eigenen Tasks bereits completed sind
      const myCompletedCustomers = new Set();
      myTasks?.forEach(task => {
        if (task.status === 'completed') {
          myCompletedCustomers.add(task.customer_id);
        }
      });

      // 4. Hole offene Tasks von Kollegen bei Kunden wo ich alle Tasks erledigt habe
      let colleagueTasks = [];
      if (myCompletedCustomers.size > 0) {
        const { data: otherTasks, error: otherTasksError } = await supabase
          .from('cleaning_logs')
          .select(`
            *,
            customer:customers(name),
            area:areas(name),
            cleaning_plan:cleaning_plans(name, description)
          `)
          .in('customer_id', Array.from(myCompletedCustomers))
          .neq('assigned_worker_id', worker.id)
          .in('status', ['pending', 'in_progress'])
          .order('scheduled_date', { ascending: true });

        if (otherTasksError) throw otherTasksError;

        // Worker-Namen separat laden
        if (otherTasks?.length > 0) {
          const workerIds = [...new Set(otherTasks.map(task => task.assigned_worker_id))];
          const { data: workersData, error: workersError } = await supabase
            .from('workers')
            .select('id, name')
            .in('id', workerIds);

          if (!workersError && workersData) {
            const workersMap = workersData.reduce((acc, worker) => {
              acc[worker.id] = worker;
              return acc;
            }, {});

            colleagueTasks = otherTasks.map(task => ({
              ...task,
              assigned_worker: workersMap[task.assigned_worker_id]
            }));
          } else {
            colleagueTasks = otherTasks;
          }
        } else {
          colleagueTasks = [];
        }
      }

      // 5. Kombiniere Tasks: Eigene zuerst, dann Kollegen-Tasks
      const allTasks = [
        ...(myTasks || []),
        ...colleagueTasks.map(task => ({ ...task, isColleagueTask: true }))
      ];

      console.log('📋 Debug: Finale Tasks Liste:', allTasks.length);
      console.log('📋 Debug: Davon Kollegen-Tasks:', colleagueTasks.length);
      setTasks(allTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Aufgaben:', error);
      Alert.alert('Fehler', 'Aufgaben konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [worker]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleLogout = async () => {
    console.log('🚪 handleLogout wurde aufgerufen');

    // Web-kompatible Bestätigung
    if (window.confirm && window.confirm('Möchten Sie sich wirklich abmelden?')) {
      try {
        console.log('🚪 Abmeldung gestartet...');
        const { error } = await signOut();
        if (error) {
          console.error('❌ Abmelde-Fehler:', error);
          window.alert && window.alert('Abmeldung fehlgeschlagen: ' + error.message);
        } else {
          console.log('✅ Erfolgreich abgemeldet');
        }
      } catch (err) {
        console.error('❌ Unerwarteter Abmelde-Fehler:', err);
        window.alert && window.alert('Ein unerwarteter Fehler ist aufgetreten.');
      }
    } else {
      console.log('❌ Abmeldung abgebrochen oder kein window.confirm verfügbar');
      // Fallback: Direkte Abmeldung ohne Bestätigung für mobile
      if (!window.confirm) {
        try {
          console.log('🚪 Direkte Abmeldung (Mobile)...');
          const { error } = await signOut();
          if (error) {
            console.error('❌ Abmelde-Fehler:', error);
          } else {
            console.log('✅ Erfolgreich abgemeldet');
          }
        } catch (err) {
          console.error('❌ Unerwarteter Abmelde-Fehler:', err);
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981'; // Success Green
      case 'in_progress':
        return '#f59e0b'; // Warning Amber
      default:
        return '#2c4a7e'; // Primary Blue
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Erledigt';
      case 'in_progress':
        return 'In Bearbeitung';
      default:
        return 'Ausstehend';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.taskCard,
        item.isColleagueTask && styles.colleagueTaskCard
      ]}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.customerName}>{item.customer?.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.areaName}>{item.area?.name}</Text>
      <Text style={styles.planName}>{item.cleaning_plan?.name}</Text>

      {item.isColleagueTask && (
        <Text style={styles.colleagueInfo}>
          👥 Zugewiesen an: {item.assigned_worker?.name}
        </Text>
      )}

      <View style={styles.taskFooter}>
        <Text style={styles.dateText}>📅 {formatDate(item.scheduled_date)}</Text>
        {item.status !== 'completed' && (
          <Text style={styles.actionText}>
            {item.isColleagueTask ? 'Kollegen-Task ansehen →' : 'Antippen für Details →'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hallo, {worker?.name || 'Mitarbeiter'}!</Text>
          <Text style={styles.subtitle}>
            {pendingTasks.length} offene Aufgabe{pendingTasks.length !== 1 ? 'n' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log('🔘 Abmelde-Button gedrückt!');
            console.log('🔘 Rufe handleLogout auf...');
            handleLogout();
          }}
          style={styles.logoutButton}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Keine Aufgaben vorhanden</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: '#1a2b4c',
    padding: 24,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.85,
    marginTop: 8,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colleagueTaskCard: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#2c4a7e',
    borderColor: '#e2e8f0',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  areaName: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 6,
    fontWeight: '500',
  },
  planName: {
    fontSize: 14,
    color: '#8892a6',
    marginBottom: 16,
    fontWeight: '400',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  actionText: {
    fontSize: 14,
    color: '#2c4a7e',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    color: '#8892a6',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  colleagueInfo: {
    fontSize: 13,
    color: '#2c4a7e',
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: 'rgba(44, 74, 126, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
