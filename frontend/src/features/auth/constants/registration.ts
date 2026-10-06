// Constants for registration form validation and error messages
// These constants mirror the backend's RegistrationRequest schema
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists.";
export const PASSWORD_MISMATCH_MESSAGE = "Passwords do not match.";
export const RATE_LIMIT_MESSAGE = "Too many registration attempts. Please try again later.";
export const BAD_REQUEST_MESSAGE =
  "Registration could not be completed. Check your email and password.";
export const GENERIC_ERROR_MESSAGE = "We couldn't create your account. Please try again later.";
