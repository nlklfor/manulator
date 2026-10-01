import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-mt-lg border border-mt-border bg-mt-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-mt-text">Sign in</h1>
        <p className="mt-1 text-sm text-mt-text-muted">
          Welcome back. Pick up where you left off.
        </p>
        {children}
      </div>
    </div>
  );
}
