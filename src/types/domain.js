// Domain-specific types and interfaces
// Note: Convert to TypeScript (.ts) files for better type safety

export const UserRole = {
  ADMIN: 'admin',
  WORKER: 'worker',
  CUSTOMER: 'customer',
};

export const CleaningPlanStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const LogLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
};

// Example type definitions (convert to TypeScript interfaces)
export const UserType = {
  id: 'string',
  email: 'string',
  role: 'UserRole',
  name: 'string',
  created_at: 'Date',
  updated_at: 'Date',
};

export const CustomerType = {
  id: 'string',
  name: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  created_at: 'Date',
  updated_at: 'Date',
};

export const WorkerType = {
  id: 'string',
  name: 'string',
  email: 'string',
  phone: 'string',
  role: 'string',
  created_at: 'Date',
  updated_at: 'Date',
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
  updated_at: 'Date',
};

export default {
  UserRole,
  CleaningPlanStatus,
  LogLevel,
  UserType,
  CustomerType,
  WorkerType,
  CleaningPlanType,
};
