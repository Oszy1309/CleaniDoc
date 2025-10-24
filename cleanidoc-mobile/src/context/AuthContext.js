import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check aktive Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkerData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen für Auth-Änderungen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkerData(session.user.id);
      } else {
        setWorker(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWorkerData = async (userId) => {
    console.log('📋 Lade Mitarbeiter-Daten für User-ID:', userId);
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Fehler beim Laden der Mitarbeiter-Daten:', error);
        // Wenn kein Worker gefunden wurde, User ausloggen
        if (error.code === 'PGRST116') {
          console.error('❌ Kein Mitarbeiter-Eintrag für diesen User gefunden');
          await supabase.auth.signOut();
          throw new Error('Dieser Account ist kein Mitarbeiter-Account');
        }
        throw error;
      }

      console.log('✅ Mitarbeiter-Daten geladen:', data?.name);
      setWorker(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Mitarbeiter-Daten:', error);
      // User ausloggen bei Fehler
      setUser(null);
      setWorker(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    console.log('🔐 Versuche Anmeldung mit Supabase...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Supabase Auth Fehler:', error.message);
      } else {
        console.log('✅ Supabase Auth erfolgreich');
      }

      return { data, error };
    } catch (err) {
      console.error('❌ Unerwarteter Fehler bei signIn:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setWorker(null);
    return { error };
  };

  const value = {
    user,
    worker,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  }
  return context;
};
