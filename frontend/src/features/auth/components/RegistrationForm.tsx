"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordField from "@/features/auth/components/PasswordField";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements";
import TextField from "@/features/auth/components/TextField";
import { DUPLICATE_EMAIL_MESSAGE } from "@/features/auth/constants/registration";
import { useRegistrationForm } from "@/features/auth/hooks/useRegistrationForm";

export default function RegistrationForm() {
  const { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useRegistrationForm();

  const fieldProps = { onChange: handleChange, onBlur: handleBlur, disabled: isSubmitting };

  const emailError =
    errors.email === DUPLICATE_EMAIL_MESSAGE ? (
      <>
        {errors.email}{" "}
        <Link href="/auth" className="underline underline-offset-2">
          Sign in instead
        </Link>
      </>
    ) : (
      errors.email
    );

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-mt-md bg-mt-danger-bg px-3 py-2.5 text-sm text-mt-danger-fg"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <TextField
        {...fieldProps}
        id="register-display-name"
        name="displayName"
        label="Full name"
        autoComplete="name"
        value={values.displayName}
        error={errors.displayName}
      />

      <TextField
        {...fieldProps}
        id="register-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={values.email}
        error={emailError}
        hint="Use your university address if you have one."
      />

      <PasswordField
        {...fieldProps}
        id="register-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        describedById="register-password-rules"
      >
        <PasswordRequirements id="register-password-rules" password={values.password} />
      </PasswordField>

      <PasswordField
        {...fieldProps}
        id="register-confirm-password"
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-mt-md bg-mt-accent px-4 py-3 text-sm font-medium text-mt-accent-fg transition hover:bg-mt-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="pt-1 text-center text-sm text-mt-text-muted">
        Already have an account?{" "}
        <Link href="/auth" className="text-mt-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
