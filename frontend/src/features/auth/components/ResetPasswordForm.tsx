"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordField from "@/features/auth/components/PasswordField";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements";
import { useResetPasswordForm } from "@/features/auth/hooks/useResetPasswordForm";

export default function ResetPasswordForm() {
  const { values, errors, formError, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useResetPasswordForm();

  const fieldProps = { onChange: handleChange, onBlur: handleBlur, disabled: isSubmitting };

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

      <PasswordField
        {...fieldProps}
        id="reset-password"
        name="password"
        label="New password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        describedById="reset-password-rules"
      >
        <PasswordRequirements id="reset-password-rules" password={values.password} />
      </PasswordField>

      <PasswordField
        {...fieldProps}
        id="reset-confirm-password"
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-mt-md bg-mt-accent px-4 py-3 text-sm font-medium text-mt-accent-fg transition hover:bg-mt-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Reset password"}
      </button>

      <p className="pt-1 text-center text-sm text-mt-text-muted">
        Remembered it?{" "}
        <Link href="/auth" className="text-mt-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
