"use client";
// LibraryContext — lifts manuscript library state to dashboard layout level.
// This lets the Workspace page read/update entries without prop drilling
// or losing state on client-side navigation.
import { createContext, useContext, type ReactNode } from "react";
import { useFileSelection } from "../hooks/useFileSelection";

type LibraryContextValue = ReturnType<typeof useFileSelection>;

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const value = useFileSelection();
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

/** Use inside any component under (dashboard) layout. */
export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
