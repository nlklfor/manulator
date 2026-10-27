"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChartNoAxesColumn, LayoutGrid, Search } from "lucide-react";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { LogoMark } from "@/components/ui/LogoMark";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { getFolders, parseFolder } from "@/features/upload-manuscript/constants/folders";

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
  const onLibraryPage = pathname === "/";
  const onSearch = pathname === "/search";
  const onProfile = pathname === "/profile";

  // Folders = document types of the user's manuscripts, with their number of pages.
  // The open folder is in the address (/?type=Charter), so a reload or the back button keeps it.
  const { libraryEntries } = useLibrary();
  const folders = getFolders(libraryEntries);
  const openFolder = parseFolder(useSearchParams().get("type"));
  // "Library" is the "All" row: it shows every manuscript
  const onLibrary = onLibraryPage && !openFolder;

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-screen w-60 flex-none flex-col gap-6 border-r border-mt-border bg-mt-surface px-3 py-4"
    >
      {/* Manulator logo */}
      <Link href="/" aria-label="manulator home" className="flex h-10 items-center gap-2.5 px-1.5">
        <LogoMark className="size-7" />
        <span className="text-[17px] font-semibold text-mt-text">manulator</span>
      </Link>

      {/* Main links */}
      <div className="flex flex-col gap-0.5">
        <Link
          href="/"
          aria-current={onLibrary ? "page" : undefined}
          className={onLibrary ? ROW_CURRENT : ROW_LINK}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          Library
          {libraryEntries.length > 0 && (
            <span className="ml-auto font-mono text-xs text-mt-text-subtle">
              {libraryEntries.length}
            </span>
          )}
        </Link>
        {/* Search page: full-text search through transcriptions */}
        <Link
          href="/search"
          aria-current={onSearch ? "page" : undefined}
          className={onSearch ? ROW_CURRENT : ROW_LINK}
        >
          <Search className="size-4" aria-hidden="true" />
          Search
        </Link>
      </div>

      {/* Folders: one per document type that has manuscripts */}
      <div className="flex flex-col gap-0.5">
        <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-mt-text-subtle">
          Document types
        </span>
        {folders.length === 0 && (
          <span className="px-2.5 text-sm text-mt-text-subtle">No manuscripts yet</span>
        )}
        {folders.map((folder) => {
          const isOpen = onLibraryPage && openFolder === folder.name;
          return (
            <Link
              key={folder.name}
              href={`/?type=${encodeURIComponent(folder.name)}`}
              aria-current={isOpen ? "page" : undefined}
              className={isOpen ? ROW_CURRENT : ROW_LINK}
            >
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-[3px]"
                style={{ backgroundColor: folder.color }}
              />
              <span className="truncate">{folder.name}</span>
              <span className="ml-auto font-mono text-xs text-mt-text-subtle">{folder.count}</span>
            </Link>
          );
        })}
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
