"use client";

// ShareDialog — share a manuscript by username or by link.
// A native <dialog> like EditManuscriptDialog: Escape closes it, focus stays inside.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { ShareLinkTab } from "./ShareLinkTab";
import { ShareUsernameTab } from "./ShareUsernameTab";

type ShareTab = "username" | "link";

const TABS = [
  { value: "username" as const, label: "Username" },
  { value: "link" as const, label: "Link" },
];

interface ShareDialogProps {
  manuscriptId: string;
  title: string;
  onClose: () => void;
  onShared: (username: string) => void; // after sharing by username
}

export function ShareDialog({ manuscriptId, title, onClose, onShared }: ShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<ShareTab>("username");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      aria-labelledby="share-dialog-title"
      className="m-auto w-full max-w-md rounded-mt-lg border border-mt-border bg-mt-surface p-6 text-mt-text shadow-lg backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="share-dialog-title" className="text-lg font-semibold">
            Share
          </h2>
          <p className="truncate text-sm text-mt-text-muted">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Segmented
        options={TABS}
        value={tab}
        onChange={setTab}
        ariaLabel="Share by"
        className="mt-5"
      />

      <div className="mt-5">
        {tab === "username" ? (
          <ShareUsernameTab manuscriptId={manuscriptId} onShared={onShared} />
        ) : (
          <ShareLinkTab manuscriptId={manuscriptId} />
        )}
      </div>
    </dialog>
  );
}
