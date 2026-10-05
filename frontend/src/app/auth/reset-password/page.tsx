"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-mt-md border border-mt-border bg-mt-raised px-3 py-2 text-sm text-mt-text focus:border-mt-accent focus:outline-none";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (form.get("password") !== form.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    router.replace("/auth");
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
          className="w-full rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
        >
          Reset password
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
