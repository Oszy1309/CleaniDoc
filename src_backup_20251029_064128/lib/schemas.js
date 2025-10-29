// Zod validation schemas for API requests and forms
import { z } from 'zod';

// ===== CUSTOM VALIDATORS =====

// Email validation with German domains
const emailSchema = z.string().email('Ungültige E-Mail-Adresse');

// Phone number validation (German format)
const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,15}$/, 'Ungültige Telefonnummer')
  .optional()
  .or(z.literal(''));

// UUID validation
const uuidSchema = z.string().uuid('Ungültige ID');

// Date validation
const dateSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  z.date()
]).transform((val) => {
  if (typeof val === 'string') {
    return new Date(val);
  }
  return val;
});

// ===== USER SCHEMAS =====

export const userCreateSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Passwort muss Klein-, Großbuchstaben und Zahl enthalten'),
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben'),
  role: z.enum(['admin', 'manager', 'worker', 'customer'])
    .default('worker')
});

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .optional(),
  role: z.enum(['admin', 'manager', 'worker', 'customer']).optional(),
  phone: phoneSchema,
  active: z.boolean().optional()
});

export const passwordResetSchema = z.object({
  email: emailSchema
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z.string()
    .min(8, 'Neues Passwort muss mindestens 8 Zeichen haben')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Passwort muss Klein-, Großbuchstaben und Zahl enthalten'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword']
});

// ===== CUSTOMER SCHEMAS =====

export const customerCreateSchema = z.object({
  name: z.string()
    .min(2, 'Firmenname muss mindestens 2 Zeichen haben')
    .max(200, 'Firmenname darf maximal 200 Zeichen haben'),
  email: emailSchema,
  phone: phoneSchema,
  address: z.object({
    street: z.string().min(1, 'Straße ist erforderlich'),
    city: z.string().min(1, 'Stadt ist erforderlich'),
    zipCode: z.string()
      .regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben'),
    country: z.string().default('Deutschland')
  }),
  contactPerson: z.string()
    .min(2, 'Ansprechpartner muss mindestens 2 Zeichen haben')
    .max(100, 'Ansprechpartner darf maximal 100 Zeichen haben')
    .optional(),
  notes: z.string().max(1000, 'Notizen dürfen maximal 1000 Zeichen haben').optional()
});

export const customerUpdateSchema = customerCreateSchema.partial();

// ===== WORKER SCHEMAS =====

export const workerCreateSchema = z.object({
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben'),
  email: emailSchema,
  phone: phoneSchema,
  employeeId: z.string()
    .min(1, 'Mitarbeiter-ID ist erforderlich')
    .max(50, 'Mitarbeiter-ID darf maximal 50 Zeichen haben'),
  position: z.string()
    .min(1, 'Position ist erforderlich')
    .max(100, 'Position darf maximal 100 Zeichen haben'),
  hourlyRate: z.number()
    .min(0, 'Stundenlohn muss positiv sein')
    .max(1000, 'Stundenlohn scheint unrealistisch hoch')
    .optional(),
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().max(1000, 'Notizen dürfen maximal 1000 Zeichen haben').optional()
});

export const workerUpdateSchema = workerCreateSchema.partial();

// ===== CLEANING PLAN SCHEMAS =====

export const cleaningPlanCreateSchema = z.object({
  customerId: uuidSchema,
  title: z.string()
    .min(3, 'Titel muss mindestens 3 Zeichen haben')
    .max(200, 'Titel darf maximal 200 Zeichen haben'),
  description: z.string()
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben')
    .optional(),
  location: z.object({
    name: z.string().min(1, 'Standortname ist erforderlich'),
    address: z.string().min(1, 'Adresse ist erforderlich'),
    floor: z.string().optional(),
    room: z.string().optional(),
    area: z.number().min(0, 'Fläche muss positiv sein').optional()
  }),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
    dayOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday
    timeSlot: z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat'),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat')
    }),
    startDate: dateSchema,
    endDate: dateSchema.optional()
  }),
  tasks: z.array(z.object({
    name: z.string().min(1, 'Aufgabenname ist erforderlich'),
    description: z.string().optional(),
    estimatedDuration: z.number().min(0, 'Geschätzte Dauer muss positiv sein'), // in minutes
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    equipment: z.array(z.string()).optional(),
    chemicals: z.array(z.string()).optional()
  })).min(1, 'Mindestens eine Aufgabe ist erforderlich'),
  assignedWorkers: z.array(uuidSchema).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

export const cleaningPlanUpdateSchema = cleaningPlanCreateSchema.partial();

// ===== CLEANING LOG SCHEMAS =====

export const cleaningLogCreateSchema = z.object({
  planId: uuidSchema,
  workerId: uuidSchema,
  scheduledDate: dateSchema,
  actualStartTime: z.string().datetime().optional(),
  actualEndTime: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'])
    .default('scheduled'),
  tasks: z.array(z.object({
    taskId: z.string().min(1, 'Aufgaben-ID ist erforderlich'),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    actualDuration: z.number().min(0).optional(), // in minutes
    notes: z.string().max(500, 'Notizen dürfen maximal 500 Zeichen haben').optional(),
    issues: z.array(z.string()).optional()
  })),
  overallNotes: z.string().max(1000, 'Gesamtnotizen dürfen maximal 1000 Zeichen haben').optional(),
  customerSignature: z.object({
    signature: z.string().optional(),
    name: z.string().optional(),
    timestamp: z.string().datetime().optional()
  }).optional(),
  photos: z.array(z.object({
    url: z.string().url('Ungültige Bild-URL'),
    caption: z.string().optional(),
    timestamp: z.string().datetime()
  })).optional()
});

export const cleaningLogUpdateSchema = cleaningLogCreateSchema.partial();

// ===== PROTOCOL SCHEMAS =====

export const protocolCreateSchema = z.object({
  logId: uuidSchema,
  type: z.enum(['daily', 'weekly', 'monthly', 'incident', 'maintenance']),
  title: z.string()
    .min(3, 'Titel muss mindestens 3 Zeichen haben')
    .max(200, 'Titel darf maximal 200 Zeichen haben'),
  content: z.string()
    .min(10, 'Inhalt muss mindestens 10 Zeichen haben')
    .max(5000, 'Inhalt darf maximal 5000 Zeichen haben'),
  findings: z.array(z.object({
    category: z.string().min(1, 'Kategorie ist erforderlich'),
    description: z.string().min(1, 'Beschreibung ist erforderlich'),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    resolved: z.boolean().default(false),
    resolution: z.string().optional()
  })).optional(),
  recommendations: z.array(z.string()).optional(),
  nextActions: z.array(z.object({
    action: z.string().min(1, 'Aktion ist erforderlich'),
    dueDate: dateSchema.optional(),
    assignedTo: uuidSchema.optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium')
  })).optional(),
  attachments: z.array(z.object({
    name: z.string().min(1, 'Dateiname ist erforderlich'),
    url: z.string().url('Ungültige Datei-URL'),
    type: z.string().min(1, 'Dateityp ist erforderlich'),
    size: z.number().min(0, 'Dateigröße muss positiv sein')
  })).optional()
});

export const protocolUpdateSchema = protocolCreateSchema.partial();

// ===== AUTH SCHEMAS =====

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Passwort ist erforderlich'),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Passwort muss Klein-, Großbuchstaben und Zahl enthalten'),
  confirmPassword: z.string(),
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben'),
  terms: z.boolean().refine(val => val === true, 'AGBs müssen akzeptiert werden')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword']
});

// ===== SEARCH & FILTER SCHEMAS =====

export const searchSchema = z.object({
  query: z.string().max(200, 'Suchanfrage darf maximal 200 Zeichen haben').optional(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    customerId: uuidSchema.optional(),
    workerId: uuidSchema.optional(),
    priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional()
  }).optional(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']).default('desc')
  }).optional(),
  pagination: z.object({
    page: z.number().min(1, 'Seite muss mindestens 1 sein').default(1),
    limit: z.number().min(1).max(100, 'Limit darf maximal 100 sein').default(10)
  }).optional()
});

// ===== UTILITY FUNCTIONS =====

export const validateSchema = (schema, data) => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    const errors = {};
    if (error.errors) {
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
    }
    return { success: false, data: null, errors };
  }
};

export const createValidationMiddleware = (schema) => {
  return (data) => {
    const validation = validateSchema(schema, data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }
    return validation.data;
  };
};

// ===== ERROR RESPONSE SCHEMA =====

export const errorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.any()).optional(),
    timestamp: z.string().datetime(),
    path: z.string().optional()
  })
});

// ===== API RESPONSE SCHEMAS =====

export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
});

export const paginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  }),
  timestamp: z.string().datetime()
});

// Export all schemas as default
export default {
  // User schemas
  userCreateSchema,
  userUpdateSchema,
  passwordResetSchema,
  passwordUpdateSchema,

  // Customer schemas
  customerCreateSchema,
  customerUpdateSchema,

  // Worker schemas
  workerCreateSchema,
  workerUpdateSchema,

  // Cleaning plan schemas
  cleaningPlanCreateSchema,
  cleaningPlanUpdateSchema,

  // Cleaning log schemas
  cleaningLogCreateSchema,
  cleaningLogUpdateSchema,

  // Protocol schemas
  protocolCreateSchema,
  protocolUpdateSchema,

  // Auth schemas
  loginSchema,
  registerSchema,

  // Search schema
  searchSchema,

  // Response schemas
  errorResponseSchema,
  successResponseSchema,
  paginatedResponseSchema,

  // Utilities
  validateSchema,
  createValidationMiddleware
};