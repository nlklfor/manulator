"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, LoginFormData } from "@/features/auth/api/login";

export default function AuthForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const authData: LoginFormData = {
        username: formData.get("username") as string,
        password: formData.get("password") as string,
      };
      await login(authData).then((response) => {
        if (!response.isAuthenticated) {
          setError(() => response.message);
          setIsSubmitting(false);
        }
        router.replace("/");
      });
    } catch {
      setError("Something went wrong. Please try again later.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-mt-text">
          Email
        </label>
        <input
          required
          id="username"
          name="username"
          type="text"
          autoComplete="email"
          className="mt-1 w-full rounded-mt-md border border-mt-border bg-mt-raised px-3 py-2 text-sm text-mt-text focus:border-mt-accent focus:outline-none"
        />
      </div>

      <div>
        <div className="flex justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-mt-text">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="justify-end text-sm text-mt-text underline hover:text-mt-accent-hover"
          >
            Forgot password?
          </Link>
        </div>

        <input
          required
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <Link
        href="/register"
        className="block text-center text-sm text-mt-accent-text hover:text-mt-accent-hover"
      >
        New to manulator? Create an account
      </Link>
    </form>
  );
}
