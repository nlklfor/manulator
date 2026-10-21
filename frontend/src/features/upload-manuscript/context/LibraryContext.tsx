"use client";

// LibraryContext — shares the library state (uploaded pages and their status)
// between the library page and the workspace page. Every component must read it
// through useLibrary(); calling useFileSelection() directly would create a
// second, separate copy of the state.
import { createContext, useContext, type ReactNode } from "react";
import { useFileSelection } from "../hooks/useFileSelection";

type LibraryContextValue = ReturnType<typeof useFileSelection>;

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const value = useFileSelection();
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
