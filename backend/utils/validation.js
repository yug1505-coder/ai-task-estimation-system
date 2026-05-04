// backend/utils/validation.js - Input Validation Utilities

const validateTaskInput = (data) => {
  const errors = [];

  if (!data.task_name || typeof data.task_name !== 'string') {
    errors.push('Task name is required and must be a string');
  } else if (data.task_name.trim().length < 3) {
    errors.push('Task name must be at least 3 characters long');
  } else if (data.task_name.length > 255) {
    errors.push('Task name must not exceed 255 characters');
  }

  if (data.expected_time !== undefined) {
    const exp = Number(data.expected_time);
    if (!Number.isFinite(exp) || exp < 0) {
      errors.push('Expected time must be a non-negative number');
    }
  }

  if (data.actual_time !== undefined) {
    const act = Number(data.actual_time);
    if (!Number.isFinite(act) || act < 0) {
      errors.push('Actual time must be a non-negative number');
    }
  }

  if (data.complexity && ![1, 2, 3, 4, 5].includes(Number(data.complexity))) {
    errors.push('Complexity must be between 1 and 5');
  }

  if (data.priority && !['Low', 'Medium', 'High', 'Urgent'].includes(data.priority)) {
    errors.push('Invalid priority value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateAuthInput = (email, password, name = null) => {
  const errors = [];

  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (name && (typeof name !== 'string' || name.trim().length < 2)) {
    errors.push('Name must be at least 2 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeString = (str) => {
  return String(str)
    .trim()
    .slice(0, 1000)
    .replace(/[<>\"']/g, '');
};

module.exports = {
  validateTaskInput,
  validateAuthInput,
  sanitizeString
};
