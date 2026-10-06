import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";

// Every page inside the (dashboard) folder gets the sidebar on the left.
// Pages outside it, such as login and registration, do not.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
