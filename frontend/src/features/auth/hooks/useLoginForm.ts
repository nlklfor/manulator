import { useState, type ChangeEvent, type FocusEvent, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/features/auth/api/login";
import { EMAIL_PATTERN } from "@/features/auth/constants/registration";

interface LoginValues {
  email: string;
  password: string;
}

type LoginField = keyof LoginValues;
type LoginErrors = Partial<Record<LoginField, string>>;

const EMPTY_VALUES: LoginValues = { email: "", password: "" };
const FIELDS = Object.keys(EMPTY_VALUES) as LoginField[];

function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, e.g. name@example.com.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function useLoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientErrors = validateLogin(values);
  const errors: LoginErrors = {};
  for (const field of FIELDS) {
    errors[field] = touched[field] ? clientErrors[field] : undefined;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as LoginField;
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as LoginField;
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])));

    if (Object.values(clientErrors).some(Boolean)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ username: values.email.trim(), password: values.password });
      if (result.isAuthenticated) {
        router.replace("/");
        return;
      }
      setFormError(result.message);
    } catch {
      setFormError("Something went wrong. Please try again later.");
    }
    setIsSubmitting(false);
  }

  return { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit };
}
