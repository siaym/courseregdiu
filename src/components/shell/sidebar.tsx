"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  FileText,
  User,
  Users,
  Clock,
  Headphones,
  ShieldCheck,
  Layers,
  Mail,
} from "lucide-react";
import { DiuLogo } from "@/components/brand/diu-logo";
import type { UserRole } from "@/types/database";

export interface SidebarProps {
  role?: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdvisorRoute = pathname.startsWith("/advisor");

  const studentLinks: NavItem[] = [
    { title: "Home", href: "/dashboard", icon: Home },
    { title: "Courses", href: "/courses", icon: BookOpen },
    { title: "Application", href: "/student/tracking", icon: FileText },
    { title: "Profile", href: "/student/profile", icon: User },
  ];

  const advisorLinks: NavItem[] = [
    { title: "Dashboard", href: "/advisor", icon: Home },
    { title: "Application Center", href: "/advisor/queue", icon: FileText },
    { title: "My Assigned Students", href: "/advisor/students", icon: Users },
    { title: "Review History", href: "/advisor/history", icon: Clock },
    { title: "Profile", href: "/advisor/profile", icon: User },
  ];

  const adminLinks: NavItem[] = [
    { title: "Dashboard", href: "/admin", icon: Home },
    { title: "Batch Courses", href: "/admin/curriculum", icon: Layers },
    { title: "Payment Clearances", href: "/admin/payments", icon: ShieldCheck },
    { title: "Email Auth", href: "/admin/emails", icon: Mail },
    { title: "Advisor Portal", href: "/advisor", icon: Users },
  ];

  const links = isAdminRoute || role === "admin"
    ? adminLinks
    : isAdvisorRoute
    ? advisorLinks
    : studentLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-60 border-r border-[#1c263c] bg-[#090d16] flex flex-col justify-between p-5 transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top: Logo & Navigation */}
        <div className="space-y-8">
          {/* DIU Brand Logo */}
          <Link href={isAdvisorRoute ? "/advisor" : "/dashboard"} className="block" onClick={onClose}>
            <DiuLogo className="h-9 w-9" />
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Portal Navigation">
            {links.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/advisor" && pathname === "/advisor/dashboard") ||
                (item.href === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-xl transition-colors",
                    isActive
                      ? "bg-[#172136] text-white shadow-xs"
                      : "text-[#8e9db2] hover:text-white hover:bg-[#121827]"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-[#8e9db2]")} />
                  <span className="flex-1">{item.title}</span>
                  {item.badge !== undefined && (
                    <span className="h-5 w-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Need Help Support Contact */}
        <div className="pt-4 border-t border-[#1c263c]/60">
          <div className="flex items-center gap-3 text-xs text-[#8e9db2]">
            <Headphones className="h-5 w-5 shrink-0 text-[#8e9db2]" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-[#8e9db2]">Need help?</span>
              <span className="text-[11px] font-medium text-slate-200">
                {isAdvisorRoute ? "Contact support" : "Contact your advisor"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
