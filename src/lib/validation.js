// Validation schemas and utilities
// Note: You might want to add Zod for runtime validation

export const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  },

  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters',
    },
  },

  required: fieldName => ({
    required: `${fieldName} is required`,
  }),

  minLength: (fieldName, length) => ({
    minLength: {
      value: length,
      message: `${fieldName} must be at least ${length} characters`,
    },
  }),
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
