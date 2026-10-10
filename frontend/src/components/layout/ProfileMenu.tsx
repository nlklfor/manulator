"use client";

import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Toast } from "@/components/ui/Toast";
import { getInitials, getShownName } from "@/features/profile/profileDisplay";
import { useProfile } from "@/features/profile/ProfileProvider";
import { useLogout } from "@/features/auth/hooks/useLogout";

// Shared look of one entry in the menu; data-focus is set by Headless UI on hover and keyboard focus
const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-mt-md px-2.5 py-2 text-sm font-medium text-mt-text data-focus:bg-mt-hover";

export function ProfileMenu({ onProfileMenu }: { onProfileMenu: boolean }) {
  const { profile } = useProfile();
  const userName = profile ? getShownName(profile) : "";
  // use the useLogout hook to handle logout and show a toast message
  const { message, isLoggingOut, handleLogout, clearMessage } = useLogout();

  return (
    <>
      <Menu>
        <MenuButton
          className={`mt-1.5 flex w-full items-center gap-2.5 rounded-mt-md p-2.5 text-left focus:outline-none data-focus:ring-2 data-focus:ring-mt-accent ${
            onProfileMenu ? "bg-mt-accent-soft" : "hover:bg-mt-hover data-open:bg-mt-hover"
          }`}
        >
          <Avatar initials={profile ? getInitials(userName) : ""} imageUrl={profile?.avatar_url} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-mt-text">
              {profile ? userName : "Loading…"}
            </span>
            {/* Show the email below the name, unless the email already is the name */}
            {profile && userName !== profile.email && (
              <span className="truncate text-xs text-mt-text-subtle">{profile.email}</span>
            )}
          </span>
        </MenuButton>

        {/* Opens to the right of the sidebar, aligned with the bottom of the button */}
        <MenuItems
          anchor={{ to: "right end" }}
          transition
          className="z-50 w-52 rounded-mt-md border border-mt-border bg-mt-surface p-1 shadow-lg transition duration-100 ease-out focus:outline-none data-closed:-translate-x-1 data-closed:opacity-0"
        >
          <MenuItem>
            <Link
              href="/profile"
              aria-current={onProfileMenu ? "page" : undefined}
              className={MENU_ITEM}
            >
              <User className="size-4 text-mt-text-muted" aria-hidden="true" />
              Profile
            </Link>
          </MenuItem>
          <div className="my-1 border-t border-mt-border" role="none" />
          {/* Logout button */}
          <MenuItem>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              type="button"
              className={`${MENU_ITEM} disabled:cursor-wait disabled:opacity-60`}
            >
              <LogOut className="size-4 text-mt-text-muted" aria-hidden="true" />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>

      {/* Result of the last logout attempt */}
      {message && <Toast message={message} onClose={clearMessage} />}
    </>
  );
}
