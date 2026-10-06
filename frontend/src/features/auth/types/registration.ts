export interface RegistrationValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationField = keyof RegistrationValues;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export interface RegistrationApiErrors {
  fieldErrors: RegistrationErrors;
  formError: string | null;
}
