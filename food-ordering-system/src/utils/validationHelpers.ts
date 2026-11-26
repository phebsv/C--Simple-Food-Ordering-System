// Validation constants
export const VALIDATION = {
  EMAIL_MIN: 5,
  EMAIL_MAX: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 100,
  NAME_MIN: 2,
  NAME_MAX: 50,
} as const;

// Email validation pattern (RFC5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength requirements: letter + number
const PASSWORD_LETTER_REGEX = /[A-Za-z]/;
const PASSWORD_NUMBER_REGEX = /\d/;

/**
 * Validates email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, error: "Email is required." };
  }

  if (trimmed.length < VALIDATION.EMAIL_MIN || trimmed.length > VALIDATION.EMAIL_MAX) {
    return { valid: false, error: `Email must be between ${VALIDATION.EMAIL_MIN} and ${VALIDATION.EMAIL_MAX} characters.` };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  return { valid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < VALIDATION.PASSWORD_MIN || password.length > VALIDATION.PASSWORD_MAX) {
    return { valid: false, error: `Password must be between ${VALIDATION.PASSWORD_MIN} and ${VALIDATION.PASSWORD_MAX} characters.` };
  }

  if (!PASSWORD_LETTER_REGEX.test(password)) {
    return { valid: false, error: "Password must contain at least one letter." };
  }

  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return { valid: false, error: "Password must contain at least one number." };
  }

  return { valid: true };
}

/**
 * Validates that two passwords match
 */
export function validatePasswordMatch(password: string, confirmPassword: string): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match." };
  }
  return { valid: true };
}

/**
 * Validates full name
 */
export function validateName(name: string, fieldName: string = "Name"): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required.` };
  }

  if (trimmed.length < VALIDATION.NAME_MIN || trimmed.length > VALIDATION.NAME_MAX) {
    return { valid: false, error: `${fieldName} must be between ${VALIDATION.NAME_MIN} and ${VALIDATION.NAME_MAX} characters.` };
  }

  // Allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { valid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes.` };
  }

  return { valid: true };
}

/**
 * Validates a Philippine mobile number: 09XXXXXXXXX (11 digits) or +63 9XXXXXXXXX.
 * Spaces, dashes and brackets are ignored.
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return { valid: false, error: "Phone number is required." };
  }

  // "+63 917..." -> "0917..."
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits;

  if (!/^09\d{9}$/.test(local)) {
    return {
      valid: false,
      error: "Enter an 11-digit mobile number (e.g. 09171234567) or +63 followed by 10 digits.",
    };
  }

  return { valid: true };
}

/**
 * Validates all register form fields
 */
export function validateRegisterForm(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): { valid: boolean; error?: string } {
  // Validate first name
  const firstNameValidation = validateName(data.firstName, "First name");
  if (!firstNameValidation.valid) {
    return firstNameValidation;
  }

  // Validate last name
  const lastNameValidation = validateName(data.lastName, "Last name");
  if (!lastNameValidation.valid) {
    return lastNameValidation;
  }

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Validate phone
  const phoneValidation = validatePhoneNumber(data.phone);
  if (!phoneValidation.valid) {
    return phoneValidation;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }

  // Validate password match
  const passwordMatchValidation = validatePasswordMatch(data.password, data.confirmPassword);
  if (!passwordMatchValidation.valid) {
    return passwordMatchValidation;
  }

  return { valid: true };
}

/**
 * Validates all login form fields
 */
export function validateLoginForm(data: { email: string; password: string }): { valid: boolean; error?: string } {
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }

  return { valid: true };
}
