"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { fetchEmailVerified } from "../api/profile";
import { useProfile } from "../ProfileProvider";

// Account details as label / value / action rows (see the profile design)
export function AccountCard() {
  const { profile } = useProfile();
  const { message, isLoggingOut, handleLogout, clearMessage } = useLogout();

  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmailVerified()
      .then((isVerified) => {
        if (!cancelled) setVerified(isVerified);
      })
      .catch(() => undefined); // badge just stays hidden if the request fails
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      aria-labelledby="account-title"
      className="flex flex-col gap-3 rounded-mt-xl border border-mt-border bg-mt-surface p-6"
    >
      <h2 id="account-title" className="text-[17px] font-semibold text-mt-text">
        Account
      </h2>

      <dl className="flex flex-col">
        {/* The badge appears once the verification check resolves */}
        <AccountRow
          label="Email"
          action={verified !== null ? <EmailBadge verified={verified} /> : undefined}
        >
          {profile ? profile.email : "Loading…"}
        </AccountRow>

        <AccountRow
          label="Session"
          action={
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-mt-md px-2 py-1 text-sm font-medium text-mt-accent-text hover:bg-mt-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </button>
          }
        >
          Signed in on this device
        </AccountRow>
      </dl>

      {/* Only shown if the logout request failed */}
      {message && <Toast message={message} onClose={clearMessage} />}
    </section>
  );
}

// Green "✓ Verified" or yellow "Not verified" pill next to the email address
function EmailBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-mt-success-bg px-2 text-xs font-medium text-mt-success-fg">
        <Check className="size-3" strokeWidth={2.4} aria-hidden="true" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] items-center rounded-full bg-mt-warning-bg px-2 text-xs font-medium text-mt-warning-fg">
      Not verified
    </span>
  );
}

interface AccountRowProps {
  label: string;
  children: ReactNode; // the value in the middle column
  action?: ReactNode; // optional button on the right
}

// One row: label on the left, value in the middle, optional action on the right
function AccountRow({ label, children, action }: AccountRowProps) {
  return (
    <div className="grid min-h-11 grid-cols-[120px_1fr_auto] items-center gap-4 border-t border-mt-border py-1.5">
      <dt className="text-[13px] text-mt-text-muted">{label}</dt>
      <dd className="truncate text-sm text-mt-text">{children}</dd>
      <dd>{action}</dd>
    </div>
  );
}
