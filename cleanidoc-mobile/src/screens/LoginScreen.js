import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../config/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  useEffect(() => {
    // Prüfe ob Supabase konfiguriert ist
    if (!isConfigured()) {
      Alert.alert(
        '⚠️ Konfigurationsfehler',
        'Supabase Credentials fehlen. Bitte .env Datei erstellen.\n\nDetails in der Console.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    console.log('🔐 Login-Versuch für:', email);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error('❌ Login-Fehler:', error);
        Alert.alert(
          'Anmeldefehler',
          error.message || 'Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.'
        );
      } else {
        console.log('✅ Login erfolgreich');
      }
    } catch (err) {
      console.error('❌ Unerwarteter Fehler:', err);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🧹</Text>
          <Text style={styles.title}>CleaniDoc</Text>
          <Text style={styles.subtitle}>Mitarbeiter-App</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Version 1.0.0 • Nur für Mitarbeiter
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1a202c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: '#1a2b4c',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#8892a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: 'center',
    color: '#8892a6',
    marginTop: 40,
    fontSize: 12,
    fontWeight: '500',
  },
});
