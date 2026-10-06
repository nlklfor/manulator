import { useState, type ChangeEvent, type FocusEvent, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/features/auth/api/password";
import { PASSWORD_RULES } from "@/features/auth/hooks/registrationValidation";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from "@/features/auth/constants/registration";
import { ApiError } from "@/lib/api/client";

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

type ResetPasswordField = keyof ResetPasswordValues;
type ResetPasswordErrors = Partial<Record<ResetPasswordField, string>>;

const EMPTY_VALUES: ResetPasswordValues = { password: "", confirmPassword: "" };
const FIELDS = Object.keys(EMPTY_VALUES) as ResetPasswordField[];
const INVALID_LINK_MESSAGE = "This reset link is invalid or has expired. Please request a new one.";

function validateResetPassword({ password, confirmPassword }: ResetPasswordValues) {
  const errors: ResetPasswordErrors = {};

  if (!password) {
    errors.password = "Enter a new password.";
  } else if ([...password].length > PASSWORD_MAX_LENGTH) {
    errors.password = `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  } else {
    const unmetRules = PASSWORD_RULES.filter((rule) => !rule.test(password));
    if (unmetRules.length > 0) {
      const missing = unmetRules.map((rule) => rule.label.toLowerCase()).join(", ");
      errors.password = `Password needs ${missing}.`;
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Repeat your new password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = PASSWORD_MISMATCH_MESSAGE;
  }

  return errors;
}

export function useResetPasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState<ResetPasswordValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<ResetPasswordField, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientErrors = validateResetPassword(values);
  const errors: ResetPasswordErrors = {};
  for (const field of FIELDS) {
    errors[field] = touched[field] ? clientErrors[field] : undefined;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as ResetPasswordField;
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as ResetPasswordField;
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])));

    if (Object.values(clientErrors).some(Boolean)) {
      return;
    }

    // Supabase puts the token in the link's hash: #access_token=...&type=recovery
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
    if (!accessToken) {
      setFormError(INVALID_LINK_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(accessToken, values.password);
      router.replace("/auth");
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 400
          ? INVALID_LINK_MESSAGE
          : "We couldn't change your password. Please try again later.",
      );
      setIsSubmitting(false);
    }
  }

  return { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit };
}
