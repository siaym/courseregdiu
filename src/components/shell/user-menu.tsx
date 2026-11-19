"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/google";
import { LogOut } from "lucide-react";
import type { UserRole } from "@/types/database";
import { MOCK_STUDENT_PROFILE, MOCK_ADVISOR_PROFILE } from "@/lib/mock/data";

export interface UserMenuProps {
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

export function UserMenu({ user, profile }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const isAdvisorRoute = pathname?.startsWith("/advisor");

  const effectiveProfile = profile || (isAdvisorRoute ? {
    full_name: MOCK_ADVISOR_PROFILE.full_name,
    role: "advisor" as UserRole,
    diu_id: MOCK_ADVISOR_PROFILE.diu_id,
    department_code: MOCK_ADVISOR_PROFILE.department_code,
  } : {
    full_name: MOCK_STUDENT_PROFILE.full_name,
    role: "student" as UserRole,
    diu_id: MOCK_STUDENT_PROFILE.diu_id,
    department_code: MOCK_STUDENT_PROFILE.department_code,
  });

  const fullName =
    effectiveProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "DIU Member";

  const email = user?.email || (isAdvisorRoute ? MOCK_ADVISOR_PROFILE.email : MOCK_STUDENT_PROFILE.email);
  const role = effectiveProfile?.role || "student";
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end text-right">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {fullName}
          </span>
          <Badge variant="diu" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5">
            {role.replace("_", " ")}
          </Badge>
          {!user && (
            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-semibold px-1 py-0.5 rounded border border-amber-500/20">
              MOCK
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {email}
        </span>
      </div>

      <Avatar
        src={avatarUrl}
        alt={fullName}
        fallbackText={fullName}
        className="h-9 w-9 border-2 border-emerald-600/30"
      />

      {user && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          disabled={isSigningOut}
          title="Sign Out"
          aria-label="Sign Out"
          className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
