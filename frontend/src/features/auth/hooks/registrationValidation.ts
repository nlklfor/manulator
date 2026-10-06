import { ApiError } from "@/lib/api/client";
import {
  BAD_REQUEST_MESSAGE,
  DISPLAY_NAME_MAX_LENGTH,
  DUPLICATE_EMAIL_MESSAGE,
  EMAIL_PATTERN,
  GENERIC_ERROR_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_SPECIAL_CHARACTERS,
  RATE_LIMIT_MESSAGE,
} from "@/features/auth/constants/registration";
import type {
  PasswordRule,
  RegistrationApiErrors,
  RegistrationErrors,
  RegistrationField,
  RegistrationValues,
} from "@/features/auth/types/registration";

function characterCount(value: string): number {
  return [...value].length;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => characterCount(password) >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "An uppercase letter",
    test: (password) => /\p{Lu}/u.test(password),
  },
  {
    id: "lowercase",
    label: "A lowercase letter",
    test: (password) => /\p{Ll}/u.test(password),
  },
  {
    id: "number",
    label: "A number",
    test: (password) => /\p{Nd}/u.test(password),
  },
  {
    id: "special",
    label: "A special character",
    test: (password) => [...password].some((char) => PASSWORD_SPECIAL_CHARACTERS.includes(char)),
  },
];

export function hasErrors(errors: RegistrationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const displayName = values.displayName.trim();
  const email = values.email.trim();
  const { password, confirmPassword } = values;

  if (!displayName) {
    errors.displayName = "Enter your name.";
  } else if (characterCount(displayName) > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, e.g. name@example.com.";
  }

  if (!password) {
    errors.password = "Enter a password.";
  } else if (characterCount(password) > PASSWORD_MAX_LENGTH) {
    errors.password = `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  } else {
    const unmetRules = PASSWORD_RULES.filter((rule) => !rule.test(password));
    if (unmetRules.length > 0) {
      const missing = unmetRules.map((rule) => rule.label.toLowerCase()).join(", ");
      errors.password = `Password needs ${missing}.`;
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Repeat your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = PASSWORD_MISMATCH_MESSAGE;
  }

  return errors;
}

const API_FIELD_NAMES: Record<string, RegistrationField> = {
  display_name: "displayName",
  email: "email",
  password: "password",
};

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

function getValidationFieldErrors(detail: unknown): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!Array.isArray(detail)) {
    return errors;
  }

  for (const issue of detail as ValidationIssue[]) {
    const apiField = issue.loc?.[issue.loc.length - 1];
    const field = typeof apiField === "string" ? API_FIELD_NAMES[apiField] : undefined;
    if (field && !errors[field]) {
      errors[field] = (issue.msg ?? "This value is not valid.").replace(/^Value error, /, "");
    }
  }
  return errors;
}

export function getRegistrationApiErrors(error: unknown): RegistrationApiErrors {
  if (!(error instanceof ApiError)) {
    return { fieldErrors: {}, formError: GENERIC_ERROR_MESSAGE };
  }

  switch (error.status) {
    case 409:
      return { fieldErrors: { email: DUPLICATE_EMAIL_MESSAGE }, formError: null };
    case 422: {
      const fieldErrors = getValidationFieldErrors(error.detail);
      return hasErrors(fieldErrors)
        ? { fieldErrors, formError: null }
        : { fieldErrors: {}, formError: BAD_REQUEST_MESSAGE };
    }
    case 400:
      return { fieldErrors: {}, formError: BAD_REQUEST_MESSAGE };
    case 429:
      return { fieldErrors: {}, formError: RATE_LIMIT_MESSAGE };
    default:
      return { fieldErrors: {}, formError: GENERIC_ERROR_MESSAGE };
  }
}
