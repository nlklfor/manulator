import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ProfileProvider } from "@/features/profile/ProfileProvider";
import { Providers } from "@/app/providers";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      {/* The library state lives inside the dashboard only: it is created when the user
          enters the dashboard (logged in) and discarded when they leave (e.g. on logout). */}
      <Providers>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Providers>
    </ProfileProvider>
  );
}
