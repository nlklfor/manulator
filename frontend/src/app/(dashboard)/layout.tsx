import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ProfileProvider } from "@/features/profile/ProfileProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ProfileProvider>
  );
}
