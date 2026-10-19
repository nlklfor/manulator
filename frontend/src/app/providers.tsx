"use client";
// Client-side providers wrapper.
// Must be a separate "use client" file — the root layout is a server component
// and cannot hold client state directly. Wrapping children here ensures
// LibraryProvider is mounted once and survives client-side navigation.
import { LibraryProvider } from "@/features/upload-manuscript/context/LibraryContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>;
}
