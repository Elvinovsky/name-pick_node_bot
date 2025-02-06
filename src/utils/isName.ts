import { Logger } from '../core';

export function isName(v: any, min?: number, max?: number): { isValid: boolean; error?: string } {
  if (typeof v !== 'string') {
    return { isValid: false, error: 'Value is not a string' };
  }

  const trimmedValue = v.trim();

  if (trimmedValue.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (!isNaN(Number(trimmedValue))) {
    return { isValid: false, error: 'Name cannot be a number' };
  }

  if (min !== undefined && trimmedValue.length < min) {
    return { isValid: false, error: `Name is too short (min ${min} characters)` };
  }
  if (max !== undefined && trimmedValue.length > max) {
    return { isValid: false, error: `Name is too long (max ${max} characters)` };
  }

  return { isValid: true };
}
