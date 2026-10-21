"use client";

// Providers — client-side providers for the dashboard (see (dashboard)/layout.tsx).
// A separate "use client" file, because the layout that uses it is a server component.
// The state is shared by the library and the workspace page and survives navigation
// between them. It is not mounted on the sign-in pages: nothing is loaded before login
// and nothing stays in memory after logout.
import type { ReactNode } from "react";
import { LibraryProvider } from "@/features/upload-manuscript/context/LibraryContext";

export function Providers({ children }: { children: ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>;
}
