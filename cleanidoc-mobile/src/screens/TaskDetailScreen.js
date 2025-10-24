import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../config/supabase';
import SignatureModal from '../components/SignatureModal';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      // Task-Details laden
      const { data: taskData, error: taskError } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customer:customers(name, address, contact_person),
          area:areas(name),
          cleaning_plan:cleaning_plans(name, description)
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Schritte laden
      const { data: stepsData, error: stepsError } = await supabase
        .from('cleaning_log_steps')
        .select('*')
        .eq('cleaning_log_id', taskId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      setTask(taskData);
      setSteps(stepsData || []);

      // Bereits erledigte Schritte markieren
      const completed = new Set(
        stepsData?.filter(s => s.completed).map(s => s.id) || []
      );
      setCompletedSteps(completed);
    } catch (error) {
      console.error('Fehler beim Laden der Aufgabe:', error);
      Alert.alert('Fehler', 'Aufgabe konnte nicht geladen werden');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (stepId) => {
    const newCompleted = new Set(completedSteps);
    const isCompleted = newCompleted.has(stepId);

    if (isCompleted) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }

    setCompletedSteps(newCompleted);

    // In Datenbank speichern
    try {
      await supabase
        .from('cleaning_log_steps')
        .update({ completed: !isCompleted })
        .eq('id', stepId);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Schritts:', error);
    }
  };

  const handleStartTask = async () => {
    if (task.status === 'pending') {
      try {
        await supabase
          .from('cleaning_logs')
          .update({ status: 'in_progress' })
          .eq('id', taskId);

        setTask({ ...task, status: 'in_progress' });
      } catch (error) {
        console.error('Fehler beim Starten der Aufgabe:', error);
      }
    }
  };

  const handleCompleteTask = () => {
    const allStepsCompleted = steps.every(step => completedSteps.has(step.id));

    if (!allStepsCompleted) {
      Alert.alert(
        'Nicht alle Schritte erledigt',
        'Bitte alle Schritte abhaken, bevor Sie die Aufgabe abschließen.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowSignature(true);
  };

  const handleSignatureComplete = async (signature) => {
    try {
      await supabase
        .from('cleaning_logs')
        .update({
          status: 'completed',
          log_date: new Date().toISOString(),
          signature_data: signature,
        })
        .eq('id', taskId);

      Alert.alert(
        'Aufgabe abgeschlossen',
        'Die Aufgabe wurde erfolgreich erledigt!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Fehler beim Abschließen der Aufgabe:', error);
      Alert.alert('Fehler', 'Die Aufgabe konnte nicht abgeschlossen werden');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const allStepsCompleted = steps.every(step => completedSteps.has(step.id));
  const progress = steps.length > 0 ? (completedSteps.size / steps.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.customerName}>{task?.customer?.name}</Text>
          <Text style={styles.areaName}>{task?.area?.name}</Text>
          <Text style={styles.planName}>{task?.cleaning_plan?.name}</Text>
        </View>

        {/* Fortschrittsbalken */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedSteps.size} von {steps.length} Schritten erledigt
          </Text>
        </View>

        {/* Kontaktinformationen */}
        {task?.customer && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Kontaktinformationen</Text>
            <Text style={styles.infoText}>📍 {task.customer.address}</Text>
            {task.customer.contact_person && (
              <Text style={styles.infoText}>👤 {task.customer.contact_person}</Text>
            )}
          </View>
        )}

        {/* Arbeitsschritte */}
        <View style={styles.stepsContainer}>
          <Text style={styles.sectionTitle}>Arbeitsschritte</Text>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={styles.stepCard}
              onPress={() => toggleStep(step.id)}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepCheckbox}>
                  {completedSteps.has(step.id) ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepName,
                    completedSteps.has(step.id) && styles.stepNameCompleted,
                  ]}
                >
                  {step.step_name}
                </Text>
              </View>

              {step.equipment && (
                <Text style={styles.stepDetail}>🛠️ {step.equipment}</Text>
              )}
              {step.cleaning_agent && (
                <Text style={styles.stepDetail}>🧴 {step.cleaning_agent}</Text>
              )}
              {step.dwell_time_minutes && (
                <Text style={styles.stepDetail}>
                  ⏱️ Einwirkzeit: {step.dwell_time_minutes} Min.
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {task?.status === 'pending' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleStartTask}
          >
            <Text style={styles.buttonText}>Aufgabe starten</Text>
          </TouchableOpacity>
        )}

        {task?.status === 'in_progress' && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSuccess,
              !allStepsCompleted && styles.buttonDisabled,
            ]}
            onPress={handleCompleteTask}
            disabled={!allStepsCompleted}
          >
            <Text style={styles.buttonText}>
              {allStepsCompleted ? 'Aufgabe abschließen' : 'Alle Schritte abhaken'}
            </Text>
          </TouchableOpacity>
        )}

        {task?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✓ Aufgabe erledigt</Text>
          </View>
        )}
      </View>

      <SignatureModal
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={handleSignatureComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  areaName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  planName: {
    fontSize: 14,
    color: '#888',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  stepsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  stepCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  stepName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  stepNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  stepDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 44,
    marginBottom: 4,
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedBanner: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
