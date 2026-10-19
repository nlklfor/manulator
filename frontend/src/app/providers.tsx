"use client";

// Providers — mounts the client-side providers once for the whole app.
// This is a separate "use client" file because RootLayout is a server component:
// a provider placed directly in it would be remounted on navigation and the
// library state would be lost.
import type { ReactNode } from "react";
import { LibraryProvider } from "@/features/upload-manuscript/context/LibraryContext";

export function Providers({ children }: { children: ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>;
}
