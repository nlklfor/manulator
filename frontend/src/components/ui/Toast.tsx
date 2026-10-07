"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";

const VISIBLE_MS = 3000;

interface ToastProps {
  message: string;
  onClose: () => void;
}

// A small message at the top of the screen that disappears by itself
export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex min-h-11 items-center gap-3 rounded-mt-lg bg-mt-text py-2.5 pr-2.5 pl-3.5 text-sm text-mt-bg shadow-lg"
      >
        <Check className="size-5 text-mt-success-bg" aria-hidden="true" />
        <span>{message}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-mt-md opacity-85 hover:bg-white/20 hover:opacity-100"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
