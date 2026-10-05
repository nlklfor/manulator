"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email") as string;

    if (!email) {
      setError("Email is required.");
      return;
    }
    router.push(`/auth/verify?email=${encodeURIComponent(email)}&purpose=reset`);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-mt-text">Forgot password</h1>
      <p className="mt-1 text-sm text-mt-text-muted">
        Enter your email and we will send you a verification code.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-mt-text">
            Email
          </label>
          <input
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
          className="w-full rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
        >
          Send code
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
