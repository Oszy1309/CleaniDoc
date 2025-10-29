// API validation middleware and helpers
import { validateSchema } from './schemas';

// ===== API VALIDATION HELPERS =====

export class ValidationError extends Error {
  constructor(errors, statusCode = 400) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

export const validateRequest = schema => {
  return data => {
    const validation = validateSchema(schema, data);
    if (!validation.success) {
      throw new ValidationError(validation.errors, 400);
    }
    return validation.data;
  };
};

// ===== API WRAPPER WITH VALIDATION =====

export const createValidatedApiCall = (apiFunction, requestSchema, responseSchema) => {
  return async data => {
    try {
      // Validate request data
      const validatedData = requestSchema ? validateRequest(requestSchema)(data) : data;

      // Make API call
      const response = await apiFunction(validatedData);

      // Validate response if schema provided
      if (responseSchema) {
        const validation = validateSchema(responseSchema, response);
        if (!validation.success) {
          console.warn('API response validation failed:', validation.errors);
          // Don't throw here, just log warning as backend might return unexpected format
        }
        return validation.success ? validation.data : response;
      }

      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // Transform other errors into standardized format
      throw new Error(`API call failed: ${error.message}`);
    }
  };
};

// ===== VALIDATION HOOKS FOR FORMS =====

export const useFormValidation = schema => {
  const validateField = (fieldName, value) => {
    try {
      const fieldSchema = schema.shape[fieldName];
      if (fieldSchema) {
        fieldSchema.parse(value);
        return null; // No error
      }
      return null;
    } catch (error) {
      return error.errors?.[0]?.message || 'Invalid value';
    }
  };

  const validateForm = formData => {
    const validation = validateSchema(schema, formData);
    return {
      isValid: validation.success,
      errors: validation.errors || {},
      data: validation.data,
    };
  };

  return {
    validateField,
    validateForm,
  };
};

// ===== CLIENT-SIDE API HELPERS WITH VALIDATION =====

export const apiClient = {
  // Generic request handler with validation
  async request(url, options = {}, requestSchema = null, responseSchema = null) {
    try {
      // Validate request body if schema provided
      if (requestSchema && options.body) {
        const bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;

        const validatedBody = validateRequest(requestSchema)(bodyData);
        options.body = JSON.stringify(validatedBody);
      }

      // Set default headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 400 && data.errors) {
          throw new ValidationError(data.errors, 400);
        }
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate response if schema provided
      if (responseSchema) {
        const validation = validateSchema(responseSchema, data);
        if (!validation.success) {
          console.warn('Response validation failed:', validation.errors);
        }
        return validation.success ? validation.data : data;
      }

      return data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      // Network or other errors
      throw new Error(`Request failed: ${error.message}`);
    }
  },

  // GET request
  async get(url, requestSchema = null, responseSchema = null) {
    return this.request(url, { method: 'GET' }, requestSchema, responseSchema);
  },

  // POST request
  async post(url, data, requestSchema = null, responseSchema = null) {
    return this.request(
      url,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      requestSchema,
      responseSchema
    );
  },

  // PUT request
  async put(url, data, requestSchema = null, responseSchema = null) {
    return this.request(
      url,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      requestSchema,
      responseSchema
    );
  },

  // PATCH request
  async patch(url, data, requestSchema = null, responseSchema = null) {
    return this.request(
      url,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      requestSchema,
      responseSchema
    );
  },

  // DELETE request
  async delete(url, requestSchema = null, responseSchema = null) {
    return this.request(url, { method: 'DELETE' }, requestSchema, responseSchema);
  },
};

// ===== SUPABASE INTEGRATION HELPERS =====

export const createSupabaseValidator = supabase => {
  return {
    async insertWithValidation(table, data, schema) {
      const validatedData = validateRequest(schema)(data);
      const { data: result, error } = await supabase.from(table).insert(validatedData).select();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          throw new ValidationError({
            _general: 'Ein Eintrag mit diesen Daten existiert bereits',
          });
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return result;
    },

    async updateWithValidation(table, id, data, schema) {
      const validatedData = validateRequest(schema)(data);
      const { data: result, error } = await supabase
        .from(table)
        .update(validatedData)
        .eq('id', id)
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new ValidationError({
            _general: 'Ein Eintrag mit diesen Daten existiert bereits',
          });
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return result;
    },
  };
};

// ===== ERROR FORMATTING HELPERS =====

export const formatValidationErrors = errors => {
  if (typeof errors === 'string') {
    return { _general: errors };
  }

  const formatted = {};
  Object.entries(errors).forEach(([key, value]) => {
    // Handle nested errors (e.g., "address.street")
    const keys = key.split('.');
    let current = formatted;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  });

  return formatted;
};

export const getFieldError = (errors, fieldPath) => {
  if (!errors) return null;

  const keys = fieldPath.split('.');
  let current = errors;

  for (const key of keys) {
    if (current[key] === undefined) return null;
    current = current[key];
  }

  return typeof current === 'string' ? current : null;
};

// ===== TOAST INTEGRATION =====

export const handleValidationError = (error, toast) => {
  if (error instanceof ValidationError) {
    const errors = formatValidationErrors(error.errors);

    // Show general error if exists
    if (errors._general) {
      toast.error(errors._general);
      return errors;
    }

    // Show first field error
    const firstError = Object.values(errors).find(err => typeof err === 'string');
    if (firstError) {
      toast.error(firstError);
    } else {
      toast.error('Bitte überprüfen Sie Ihre Eingaben');
    }

    return errors;
  }

  // Handle other errors
  toast.error(error.message || 'Ein unerwarteter Fehler ist aufgetreten');
  return { _general: error.message };
};

export default {
  ValidationError,
  validateRequest,
  createValidatedApiCall,
  useFormValidation,
  apiClient,
  createSupabaseValidator,
  formatValidationErrors,
  getFieldError,
  handleValidationError,
};
