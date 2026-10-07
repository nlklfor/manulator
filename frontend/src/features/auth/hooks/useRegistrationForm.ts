import { useState, type ChangeEvent, type FocusEvent, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/features/auth/api/register";
import {
  getRegistrationApiErrors,
  hasErrors,
  validateRegistration,
} from "@/features/auth/hooks/registrationValidation";
import type {
  RegistrationErrors,
  RegistrationField,
  RegistrationValues,
} from "@/features/auth/types/registration";

type TouchedFields = Partial<Record<RegistrationField, boolean>>;

const EMPTY_VALUES: RegistrationValues = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const FIELDS = Object.keys(EMPTY_VALUES) as RegistrationField[];

export function useRegistrationForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegistrationValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [apiErrors, setApiErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientErrors = validateRegistration(values);
  const errors: RegistrationErrors = {};
  for (const field of FIELDS) {
    errors[field] = apiErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as RegistrationField;
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setApiErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as RegistrationField;
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])));

    if (hasErrors(clientErrors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        display_name: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.replace("/auth?registered=1");
    } catch (error) {
      const result = getRegistrationApiErrors(error);
      setApiErrors(result.fieldErrors);
      setFormError(result.formError);
      setIsSubmitting(false);
    }
  }

  return { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit };
}
