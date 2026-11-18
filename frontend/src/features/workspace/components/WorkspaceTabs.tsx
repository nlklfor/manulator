"use client";

// WorkspaceTabs — the tab bar of the text side of the workspace, like browser tabs:
// exactly one tab is open. On the Translation tab, "Compare" shows the transcription
// and the translation side by side.
import { Columns2, FileText, Languages, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceTab = "transcription" | "translation" | "summary";

const TABS: { id: WorkspaceTab; label: string; icon: LucideIcon }[] = [
  { id: "transcription", label: "Transcription", icon: FileText },
  { id: "translation", label: "Translation", icon: Languages },
  { id: "summary", label: "Summary", icon: ScrollText },
];

export function tabId(tab: WorkspaceTab) {
  return `workspace-tab-${tab}`;
}

export function tabPanelId(tab: WorkspaceTab) {
  return `workspace-tabpanel-${tab}`;
}

interface WorkspaceTabsProps {
  active: WorkspaceTab;
  onSelect: (tab: WorkspaceTab) => void;
  isComparing: boolean;
  onCompareChange: (isComparing: boolean) => void;
}

export function WorkspaceTabs({
  active,
  onSelect,
  isComparing,
  onCompareChange,
}: WorkspaceTabsProps) {
  // Arrow keys move between the tabs, like in a native tab list
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const index = TABS.findIndex((t) => t.id === active);
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(index + step + TABS.length) % TABS.length];
    onSelect(next.id);
    document.getElementById(tabId(next.id))?.focus();
  }

  return (
    <div className="flex h-10 shrink-0 items-end gap-2 border-b border-mt-border bg-mt-sunken pl-2 pr-2">
      <div
        role="tablist"
        aria-label="Text views"
        onKeyDown={handleKeyDown}
        className="flex min-w-0 flex-1 gap-0.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              id={tabId(id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelId(id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelect(id)}
              className={`-mb-px inline-flex h-9 shrink-0 items-center gap-1.5 rounded-t-mt-md border border-b-0 px-3 text-sm font-medium ${
                isActive
                  ? "border-mt-border bg-mt-surface text-mt-text"
                  : "border-transparent text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {active === "translation" && (
        <button
          type="button"
          aria-pressed={isComparing}
          onClick={() => onCompareChange(!isComparing)}
          title="Show the transcription and the translation side by side"
          className={`mb-1.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-mt-md border px-2.5 text-xs font-medium ${
            isComparing
              ? "border-mt-accent-soft-strong bg-mt-accent-soft text-mt-accent-text"
              : "border-mt-border-strong bg-mt-raised text-mt-text hover:bg-mt-hover"
          }`}
        >
          <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
          Compare
        </button>
      )}
    </div>
  );
}
