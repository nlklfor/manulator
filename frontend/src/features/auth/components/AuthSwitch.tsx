"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SWITCH_LINKS: Record<string, { text: string; href: string; label: string }> = {
  "/auth": { text: "New to manulator?", href: "/register", label: "Create account" },
  "/register": { text: "Already have an account?", href: "/auth", label: "Sign in" },
};

export default function AuthSwitch() {
  const link = SWITCH_LINKS[usePathname()];

  if (!link) {
    return null;
  }

  return (
    <nav aria-label="Authentication" className="flex items-center gap-2 text-xs sm:text-sm">
      <span className="hidden text-mt-text-muted sm:inline">{link.text}</span>
      <Link
        href={link.href}
        className="rounded-mt-md border border-mt-border-strong bg-mt-raised px-3 py-2 text-mt-text hover:bg-mt-hover"
      >
        {link.label}
      </Link>
    </nav>
  );
}
