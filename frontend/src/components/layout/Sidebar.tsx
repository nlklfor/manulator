"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, LayoutGrid, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useProfile } from "@/features/profile/ProfileProvider";
import { getInitials, getShownName } from "@/features/profile/profileDisplay";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

// Placeholder data until manuscripts and the logged-in user come from the backend (JUST A MOCKUP)
const PLACEHOLDER_MANUSCRIPTS = [
  { name: "Psalter · Cod. 22", color: "#9A2B1C", pages: 7 },
  { name: "Book of Hours · MS 7", color: "#3C5A94", pages: 1 },
  { name: "Charter, 1287", color: "#8A6A2E", pages: 2 },
];

// Placeholder data until the logged-in user come from the backend (JUST A MOCKUP)

// Shared look of one row in the sidebar
const ROW = "flex h-9 w-full items-center gap-2.5 rounded-mt-md px-2.5 text-sm font-medium";
// Rows that do not lead anywhere yet
const ROW_INACTIVE = `${ROW} cursor-not-allowed text-mt-text-muted`;
// The row of the page that is open right now
const ROW_CURRENT = `${ROW} bg-mt-accent-soft text-mt-accent-text`;
// A link to a page that is not open right now
const ROW_LINK = `${ROW} text-mt-text-muted hover:bg-mt-hover hover:text-mt-text`;

export function Sidebar() {
  // The address of the open page, used to highlight the matching link
  const pathname = usePathname();
  const onLibrary = pathname === "/";
  const onProfile = pathname === "/profile";

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-screen w-60 flex-none flex-col gap-6 border-r border-mt-border bg-mt-surface px-3 py-4"
    >
      {/* Manulator logo */}
      <Link href="/" aria-label="manulator home" className="flex h-10 items-center gap-2.5 px-1.5">
        <span
          aria-hidden="true"
          className="flex size-7 flex-none items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-mt-border-strong font-mono text-[8px] uppercase text-mt-text-subtle"
        >
          logo
        </span>
        <span className="text-[17px] font-semibold text-mt-text">manulator</span>
      </Link>

      {/* Main links: Search is not built yet */}
      <div className="flex flex-col gap-0.5">
        <Link
          href="/"
          aria-current={onLibrary ? "page" : undefined}
          className={onLibrary ? ROW_CURRENT : ROW_LINK}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          Library
        </Link>
        <button type="button" disabled className={ROW_INACTIVE}>
          <Search className="size-4" aria-hidden="true" />
          Search
        </button>
      </div>

      {/* Manuscripts */}
      <div className="flex flex-col gap-0.5">
        <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-mt-text-subtle">
          Manuscripts
        </span>
        {PLACEHOLDER_MANUSCRIPTS.map((manuscript) => (
          <button key={manuscript.name} type="button" disabled className={ROW_INACTIVE}>
            <span
              aria-hidden="true"
              className="size-2.5 flex-none rounded-[3px]"
              style={{ backgroundColor: manuscript.color }}
            />
            <span className="truncate">{manuscript.name}</span>
            <span className="ml-auto font-mono text-xs text-mt-text-subtle">
              {manuscript.pages}
            </span>
          </button>
        ))}
      </div>

      {/* Empty space that pushes the last group to the bottom */}
      <div className="grow" />

      <div className="flex flex-col gap-0.5">
        <button type="button" disabled className={ROW_INACTIVE}>
          <ChartNoAxesColumn className="size-4" aria-hidden="true" />
          Models &amp; evaluation
          <span className="ml-auto rounded-full bg-mt-neutral-bg px-2 py-0.5 text-[11px] text-mt-neutral-fg">
            Later
          </span>
        </button>

        {/* User: opens the profile page */}
        <div className="mt-1.5 border-t border-mt-border">
          <ProfileMenu onProfileMenu={onProfile} />
        </div>
      </div>
    </nav>
  );
}
