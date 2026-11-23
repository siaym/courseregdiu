"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Bell,
  GraduationCap,
  UserCheck,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { ACTIVE_MOCK_SEMESTER_LABEL } from "@/lib/mock/data";
import { clearSession } from "@/app/login/actions";

export interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({
  onToggleSidebar,
  isSidebarOpen,
}: HeaderProps) {
  const pathname = usePathname();
  const isAdvisor = pathname?.startsWith("/advisor");

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0b0f19]/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Left: Mobile hamburger + Portal Tag */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="inline-flex items-center justify-center p-2 rounded-xl text-[#8e9db2] hover:text-white hover:bg-[#121827] lg:hidden focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          {/* Student Tag vs Advisor Tag (Matching Mockups) */}
          {!isAdvisor ? (
            <div className="text-[11px] font-semibold tracking-widest text-[#8e9db2] uppercase">
              STUDENT PORTAL • {ACTIVE_MOCK_SEMESTER_LABEL}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131b2e] border border-[#1e293b] text-xs text-slate-300">
              <UserIcon className="h-3.5 w-3.5 text-blue-400" />
              <span className="font-medium">Advisor Portal • {ACTIVE_MOCK_SEMESTER_LABEL}</span>
            </div>
          )}
        </div>

        {/* Right side: Switcher + Notification Bell with red dot + Circle Avatar */}
        <div className="flex items-center gap-4">
          {/* Prototype Role Switcher */}
          <div className="flex items-center bg-[#121827] p-1 rounded-xl border border-[#1c263c] text-xs">
            <Link
              href="/dashboard"
              onClick={() => {
                document.cookie = "diu_session_role=student; path=/";
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                !isAdvisor
                  ? "bg-[#172136] text-white shadow-xs"
                  : "text-[#8e9db2] hover:text-white"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Student</span>
            </Link>
            <Link
              href="/advisor"
              onClick={() => {
                document.cookie = "diu_session_role=advisor; path=/";
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                isAdvisor
                  ? "bg-[#172136] text-white shadow-xs"
                  : "text-[#8e9db2] hover:text-white"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Advisor</span>
            </Link>
          </div>

          {/* Notification Bell with red dot (Matches Mockup) */}
          <button
            type="button"
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#121827] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0b0f19]" />
          </button>

          {/* User Circle Avatar (Matches Mockup: letter S or R) */}
          <div className="h-9 w-9 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-white font-semibold text-sm select-none shadow-xs">
            {!isAdvisor ? "S" : "R"}
          </div>

          {/* Secure Sign Out Button */}
          <form action={clearSession}>
            <button
              type="submit"
              className="p-2 rounded-xl text-[#8e9db2] hover:text-rose-400 hover:bg-[#121827] transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
