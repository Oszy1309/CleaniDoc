// Application constants and configuration
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
    pageSizeOptions: [5, 10, 20, 50],
  },

  // File upload
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // User roles
  roles: {
    ADMIN: 'admin',
    WORKER: 'worker',
    CUSTOMER: 'customer',
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
    customerLogin: '/customer-login',
  },
};

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const STORAGE_KEYS = {
  USER_SESSION: 'user_session',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
};

export default APP_CONFIG;
