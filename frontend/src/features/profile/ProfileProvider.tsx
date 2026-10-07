"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Toast } from "@/components/ui/Toast";
import { consumeJustLoggedIn, getTokenClaims } from "@/lib/auth/session";
import { fetchProfile } from "./api/profile";
import type { Profile } from "./api/profile";
import { getShownName } from "./profileDisplay";

interface ProfileContextValue {
  profile: Profile | null; // null while loading or when nobody is logged in
  loading: boolean;
  setProfile: (profile: Profile) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let loaded: Profile | null = null;
      try {
        loaded = await fetchProfile();
      } catch {
        // If the profile cannot be loaded, fall back to the email in the token
        const user = getTokenClaims();
        loaded = user ? { ...user, display_name: null, avatar_url: null } : null;
      }
      if (cancelled) return;

      setProfile(loaded);
      setLoading(false);
      if (loaded && consumeJustLoggedIn()) {
        setWelcome(`Welcome, ${getShownName(loaded)}!`);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, setProfile }}>
      {children}
      {welcome && <Toast message={welcome} onClose={() => setWelcome(null)} />}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used inside <ProfileProvider>");
  }
  return value;
}
