"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OTP_TTL_MS, OtpPurpose, resendOtp, verifyOtp } from "@/features/auth/api/verifyOtp";

const NEXT_PAGE: Record<OtpPurpose, string> = {
  register: "/auth",
  reset: "/auth/reset-password",
};

export default function OtpForm({ email, purpose }: { email: string; purpose: OtpPurpose }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + OTP_TTL_MS);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_MS / 1000);
  const isExpired = secondsLeft === 0;

  // Count down from the expiry timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const code = new FormData(event.currentTarget).get("code") as string;
    if (await verifyOtp(email, code)) {
      router.replace(NEXT_PAGE[purpose]);
    } else {
      setError("Invalid or expired code. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    const newExpiresAt = await resendOtp(email);
    setExpiresAt(newExpiresAt);
    setSecondsLeft(Math.ceil((newExpiresAt - Date.now()) / 1000));
    setNotice("A new code has been sent.");
  }

  const timeLeft = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-mt-text">
          Verification code
        </label>
        <input
          required
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          className="mt-1 w-full rounded-mt-md border border-mt-border bg-mt-raised px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-mt-text focus:border-mt-accent focus:outline-none"
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
      {notice && (
        <p role="status" className="text-sm text-mt-text-muted">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isExpired}
        className="w-full rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:opacity-60"
      >
        {isSubmitting ? "Verifying..." : "Verify"}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={!isExpired}
        className="block w-full text-center text-sm text-mt-accent-text hover:text-mt-accent-hover disabled:text-mt-text-muted"
      >
        {isExpired ? "Resend code" : `Resend code in ${timeLeft}`}
      </button>
    </form>
  );
}
