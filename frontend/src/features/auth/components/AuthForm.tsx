"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordField from "@/features/auth/components/PasswordField";
import TextField from "@/features/auth/components/TextField";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

type AuthFormProps = {
  registrationSuccess?: boolean;
};

export default function AuthForm({ registrationSuccess = false }: AuthFormProps) {
  const { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useLoginForm();

  const fieldProps = { onChange: handleChange, onBlur: handleBlur, disabled: isSubmitting };

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
      {registrationSuccess && (
        <p
          role="status"
          className="rounded-mt-md border border-mt-success-fg/20 bg-mt-success-bg px-3 py-2 text-sm text-mt-success-fg"
        >
          Account created. Check your email to verify your account, then sign in.
        </p>
      )}

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
        id="login-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
      />

      <PasswordField
        {...fieldProps}
        id="login-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        value={values.password}
        error={errors.password}
      >
        <Link
          href="/auth/forgot-password"
          className="mt-1.5 block text-right text-sm text-mt-text underline underline-offset-2"
        >
          Forgot password?
        </Link>
      </PasswordField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-mt-md bg-mt-accent px-4 py-3 text-sm font-medium text-mt-accent-fg transition hover:bg-mt-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="pt-1 text-center text-sm text-mt-text-muted">
        New to manulator?{" "}
        <Link href="/register" className="text-mt-text underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
