"use client";

import { DisplayNameCard } from "@/features/profile/components/DisplayNameCard";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { Toast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { message, isLoggingOut, handleLogout, clearMessage } = useLogout();
  return (
    <main className="min-h-screen">
      <header className="flex flex-col gap-1 px-10 pt-9 pb-5">
        <h1 className="text-[28px] leading-9 font-semibold text-mt-text">Your profile</h1>
        <p className="text-sm text-mt-text-muted">
          How you appear to the people you share manuscripts with.
        </p>
      </header>
      <div className="flex max-w-[800px] flex-col gap-5 px-10 pb-10">
        <DisplayNameCard />
        <button
          onClick={handleLogout}
          type="button"
          disabled={isLoggingOut}
          className="h-9 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
        {/* Result of the last logout attempt */}
        {message && <Toast message={message} onClose={clearMessage} />}
      </div>
    </main>
  );
}
