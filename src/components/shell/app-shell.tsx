"use client";

import * as React from "react";
import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { ContourBackground } from "@/components/brand/contour-background";
import type { UserRole } from "@/types/database";

export interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  } | null;
  profile?: {
    full_name?: string;
    role?: UserRole;
    diu_id?: string | null;
    department_code?: string | null;
  } | null;
}

export function AppShell({ children, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        role={profile?.role || "student"}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0 relative">
        {/* Subtle Contour Wave SVG Background (Matches Mockup) */}
        <ContourBackground />

        {/* Minimal Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
