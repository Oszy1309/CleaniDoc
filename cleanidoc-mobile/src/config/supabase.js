import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase Credentials aus Environment Variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Warnung wenn Credentials nicht konfiguriert sind
if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('⚠️ WARNUNG: Supabase Credentials nicht konfiguriert!');
  console.error('Bitte .env Datei erstellen mit:');
  console.error('EXPO_PUBLIC_SUPABASE_URL=your-url');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export für Debugging
export const isConfigured = () => {
  return supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
};
