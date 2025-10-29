#!/usr/bin/env node

// CleaniDoc Dashboard - Library Files Creation Script
// This script creates the new lib files for better organization

const fs = require('fs');
const path = require('path');

const libFiles = {
  'supabase.js': `// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Error handling for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing!');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'missing');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export default supabase;
`,

  'auth.js': `// Authentication utilities and helpers
import { supabase } from './supabase';

export const authHelpers = {
  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Sign in with email and password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Reset password
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Update password
  async updatePassword(password) {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });
    return { data, error };
  }
};

export default authHelpers;
`,

  'api.js': `// API utilities and data fetching functions
import { supabase } from './supabase';

export const apiHelpers = {
  // Generic fetch function
  async fetchData(table, options = {}) {
    let query = supabase.from(table).select('*');

    if (options.filter) {
      query = query.filter(options.filter.column, options.filter.operator, options.filter.value);
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Create record
  async createRecord(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    return { data: result, error };
  },

  // Update record
  async updateRecord(table, id, data) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    return { data: result, error };
  },

  // Delete record
  async deleteRecord(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    return { error };
  },

  // Upload file
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  // Get file URL
  getFileUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }
};

export default apiHelpers;
`,

  'validation.js': `// Validation schemas and utilities
// Note: You might want to add Zod for runtime validation

export const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  },

  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters'
    }
  },

  required: (fieldName) => ({
    required: \`\${fieldName} is required\`
  }),

  minLength: (fieldName, length) => ({
    minLength: {
      value: length,
      message: \`\${fieldName} must be at least \${length} characters\`
    }
  })
};

export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];

    if (fieldRules.required && (!value || value.trim() === '')) {
      errors[field] = fieldRules.required;
      return;
    }

    if (fieldRules.pattern && value && !fieldRules.pattern.value.test(value)) {
      errors[field] = fieldRules.pattern.message;
      return;
    }

    if (fieldRules.minLength && value && value.length < fieldRules.minLength.value) {
      errors[field] = fieldRules.minLength.message;
      return;
    }
  });

  return errors;
};

export default validationRules;
`,

  'constants.js': `// Application constants and configuration
export const APP_CONFIG = {
  name: 'CleaniDoc Dashboard',
  version: '1.0.0',

  // API endpoints
  api: {
    baseUrl: process.env.REACT_APP_API_URL || '',
  },

  // Pagination
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  },

  // File upload
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
  },

  // User roles
  roles: {
    ADMIN: 'admin',
    WORKER: 'worker',
    CUSTOMER: 'customer'
  },

  // Route paths
  routes: {
    dashboard: '/dashboard',
    customers: '/customers',
    cleaningPlans: '/cleaning-plans',
    protocols: '/protocols',
    workers: '/workers',
    logs: '/logs',
    login: '/login',
    workerLogin: '/worker-login',
    customerLogin: '/customer-login'
  }
};

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export const STORAGE_KEYS = {
  USER_SESSION: 'user_session',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme'
};

export default APP_CONFIG;
`
};

const hooksFiles = {
  'useAuth.js': `// Authentication hook
import { useState, useEffect } from 'react';
import { authHelpers } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { session, error } = await authHelpers.getCurrentSession();

      if (error) {
        setError(error);
        setUser(null);
      } else {
        setUser(session?.user || null);
      }
    } catch (err) {
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await authHelpers.signIn(email, password);

      if (error) {
        setError(error);
        return { success: false, error };
      }

      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await authHelpers.signOut();

      if (error) {
        setError(error);
        return { success: false, error };
      }

      setUser(null);
      return { success: true };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    checkUser
  };
};

export default useAuth;
`,

  'useApi.js': `// API data fetching hook
import { useState, useEffect } from 'react';
import { apiHelpers } from '../lib/api';

export const useApi = (table, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error: fetchError } = await apiHelpers.fetchData(table, options);

      if (fetchError) {
        setError(fetchError);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (table) {
      fetchData();
    }
  }, [table, JSON.stringify(options)]);

  const refetch = () => fetchData();

  return {
    data,
    loading,
    error,
    refetch
  };
};

export default useApi;
`,

  'useToast.js': `// Toast notification hook
import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) =>
    addToast(message, 'success', duration), [addToast]);

  const error = useCallback((message, duration) =>
    addToast(message, 'error', duration), [addToast]);

  const warning = useCallback((message, duration) =>
    addToast(message, 'warning', duration), [addToast]);

  const info = useCallback((message, duration) =>
    addToast(message, 'info', duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};

export default useToast;
`
};

const typesFiles = {
  'domain.js': `// Domain-specific types and interfaces
// Note: Convert to TypeScript (.ts) files for better type safety

export const UserRole = {
  ADMIN: 'admin',
  WORKER: 'worker',
  CUSTOMER: 'customer'
};

export const CleaningPlanStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const LogLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

// Example type definitions (convert to TypeScript interfaces)
export const UserType = {
  id: 'string',
  email: 'string',
  role: 'UserRole',
  name: 'string',
  created_at: 'Date',
  updated_at: 'Date'
};

export const CustomerType = {
  id: 'string',
  name: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  created_at: 'Date',
  updated_at: 'Date'
};

export const WorkerType = {
  id: 'string',
  name: 'string',
  email: 'string',
  phone: 'string',
  role: 'string',
  created_at: 'Date',
  updated_at: 'Date'
};

export const CleaningPlanType = {
  id: 'string',
  customer_id: 'string',
  worker_id: 'string',
  title: 'string',
  description: 'string',
  status: 'CleaningPlanStatus',
  scheduled_date: 'Date',
  completed_date: 'Date',
  created_at: 'Date',
  updated_at: 'Date'
};

export default {
  UserRole,
  CleaningPlanStatus,
  LogLevel,
  UserType,
  CustomerType,
  WorkerType,
  CleaningPlanType
};
`
};

function createLibFiles() {
  console.log('📚 Creating lib files...');

  const libDir = path.join(process.cwd(), 'src', 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  Object.entries(libFiles).forEach(([filename, content]) => {
    const filePath = path.join(libDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filePath}`);
  });
}

function createHooksFiles() {
  console.log('🪝 Creating hooks files...');

  const hooksDir = path.join(process.cwd(), 'src', 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  Object.entries(hooksFiles).forEach(([filename, content]) => {
    const filePath = path.join(hooksDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filePath}`);
  });
}

function createTypesFiles() {
  console.log('📝 Creating types files...');

  const typesDir = path.join(process.cwd(), 'src', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  Object.entries(typesFiles).forEach(([filename, content]) => {
    const filePath = path.join(typesDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filePath}`);
  });
}

function createUtilsFiles() {
  console.log('🔧 Creating additional utils files...');

  const utilsDir = path.join(process.cwd(), 'src', 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }

  const formatUtils = `// Formatting utilities
export const formatDate = (date, locale = 'de-DE') => {
  if (!date) return '';

  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (date, locale = 'de-DE') => {
  if (!date) return '';

  const d = new Date(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount, currency = 'EUR', locale = 'de-DE') => {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export default {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatFileSize,
  capitalizeFirst,
  truncateText
};
`;

  const idUtils = `// ID and slug utilities
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const createSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, '-')           // Replace spaces with -
    .replace(/[^\\w\\-]+/g, '')     // Remove all non-word chars
    .replace(/\\-\\-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

export const isValidEmail = (email) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^[\\+]?[1-9][\\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\\s\\-\\(\\)]/g, ''));
};

export default {
  generateId,
  generateUUID,
  createSlug,
  isValidEmail,
  isValidPhone
};
`;

  fs.writeFileSync(path.join(utilsDir, 'format.js'), formatUtils);
  fs.writeFileSync(path.join(utilsDir, 'id.js'), idUtils);

  console.log(`✅ Created: ${path.join(utilsDir, 'format.js')}`);
  console.log(`✅ Created: ${path.join(utilsDir, 'id.js')}`);
}

function main() {
  console.log('🚀 Creating library and utility files...');

  createLibFiles();
  createHooksFiles();
  createTypesFiles();
  createUtilsFiles();

  console.log('\\n🎉 Library files creation completed!');
  console.log('📋 Created files:');
  console.log('   📚 lib/ - Database, auth, API, validation, constants');
  console.log('   🪝 hooks/ - useAuth, useApi, useToast');
  console.log('   📝 types/ - Domain types and interfaces');
  console.log('   🔧 utils/ - format, id utilities');
}

if (require.main === module) {
  main();
}

module.exports = { createLibFiles, createHooksFiles, createTypesFiles, createUtilsFiles };