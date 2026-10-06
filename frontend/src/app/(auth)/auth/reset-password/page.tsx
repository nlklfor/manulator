"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { resetPassword } from "@/features/auth/api/password";

const inputClass =
  "mt-1 w-full rounded-mt-md border border-mt-border bg-mt-raised px-3 py-2 text-sm text-mt-text focus:border-mt-accent focus:outline-none";

// Opened from the email link: /auth/reset-password#access_token=...&type=recovery
export default function ResetPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password") as string;

    if (password !== form.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }

    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
    if (!accessToken) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(accessToken, password);
      router.replace("/auth");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "This reset link is invalid or has expired, or the password is too weak."
          : "Could not change your password right now. Please try again later.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-mt-text">Reset password</h1>
      <p className="mt-1 text-sm text-mt-text-muted">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-mt-text">
            New password
          </label>
          <input
            required
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-mt-text">
            Confirm password
          </label>
          <input
            required
            id="confirm"
            name="confirm"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-mt-md border border-mt-danger bg-mt-danger-bg px-3 py-2 text-sm text-mt-danger-fg"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Reset password"}
        </button>

        <Link
          href="/auth"
          className="block text-center text-sm text-mt-accent-text hover:text-mt-accent-hover"
        >
          Back to sign in
        </Link>
      </form>
    </>
  );
}
