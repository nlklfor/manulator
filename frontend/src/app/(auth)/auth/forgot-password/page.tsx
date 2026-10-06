"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { sendResetLink } from "@/features/auth/api/password";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email") as string;
    setError(null);
    setIsSubmitting(true);

    try {
      await sendResetLink(email);
      setSentTo(email);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many requests. Please try again later."
          : "We could not send the email right now. Please try again later.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-mt-text">Check your email</h1>
        <p className="mt-1 text-sm text-mt-text-muted">
          If an account exists for <span className="font-medium text-mt-text">{sentTo}</span>, we
          sent a link to reset your password.
        </p>
        <Link
          href="/auth"
          className="mt-6 block text-center text-sm text-mt-accent-text hover:text-mt-accent-hover"
        >
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-mt-text">Forgot password</h1>
      <p className="mt-1 text-sm text-mt-text-muted">
        Enter your email and we will send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-mt-text">
            Email
          </label>
          <input
            required
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-mt-md border border-mt-border bg-mt-raised px-3 py-2 text-sm text-mt-text focus:border-mt-accent focus:outline-none"
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
          {isSubmitting ? "Sending..." : "Send reset link"}
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
