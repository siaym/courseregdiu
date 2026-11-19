import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole, Database } from "@/types/database";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_FIRST_TIME_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
} from "@/lib/mock/data";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthSessionResult {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  profile: Profile;
}

/**
 * Validates whether an email belongs to the official Daffodil International University domain.
 */
export function isDIUEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd";
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

/**
 * Retrieves the currently authenticated user from Supabase or development session cookie.
 */
export async function getCurrentUser() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return user;
    }
  } catch {
    // Fall through to dev session check
  }

  // Check development server session cookie if running locally with placeholder credentials
  const cookieStore = await cookies();
  const devSession = cookieStore.get("diu_session_role")?.value;

  if (devSession) {
    if (devSession === "advisor") {
      return {
        id: MOCK_ADVISOR_PROFILE.id,
        email: MOCK_ADVISOR_PROFILE.email,
        user_metadata: {
          full_name: MOCK_ADVISOR_PROFILE.full_name,
          avatar_url: MOCK_ADVISOR_PROFILE.avatar_url || undefined,
        },
      };
    }

    if (devSession === "student_new") {
      return {
        id: MOCK_FIRST_TIME_STUDENT_PROFILE.id,
        email: MOCK_FIRST_TIME_STUDENT_PROFILE.email,
        user_metadata: {
          full_name: MOCK_FIRST_TIME_STUDENT_PROFILE.full_name,
        },
      };
    }

    if (devSession === "student") {
      return {
        id: MOCK_STUDENT_PROFILE.id,
        email: MOCK_STUDENT_PROFILE.email,
        user_metadata: {
          full_name: MOCK_STUDENT_PROFILE.full_name,
          avatar_url: MOCK_STUDENT_PROFILE.avatar_url || undefined,
        },
      };
    }
  }

  return null;
}

/**
 * Retrieves the user profile from Supabase profiles table, or development session.
 */
export async function getCurrentProfile(userParam?: { id: string } | null): Promise<Profile | null> {
  const user = userParam || (await getCurrentUser());
  if (!user) return null;

  try {
    const supabase = await getSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) return profile;
  } catch {
    // Fall through to dev profile
  }

  const cookieStore = await cookies();
  const devSession = cookieStore.get("diu_session_role")?.value;

  if (devSession === "advisor") {
    return MOCK_ADVISOR_PROFILE;
  }

  if (devSession === "student_new") {
    // Check if onboarding cookie exists
    const onboardedData = cookieStore.get("diu_onboarded_student_data")?.value;
    if (onboardedData) {
      try {
        const parsed = JSON.parse(onboardedData);
        return {
          ...MOCK_FIRST_TIME_STUDENT_PROFILE,
          full_name: parsed.fullName,
          diu_id: parsed.diuId,
          batch: parsed.batch,
          onboarding_completed: true,
        };
      } catch {}
    }
    return MOCK_FIRST_TIME_STUDENT_PROFILE;
  }

  if (devSession === "student") {
    return MOCK_STUDENT_PROFILE;
  }

  return null;
}

/**
 * Server-side Authentication Guard.
 * Strictly redirects unauthenticated requests to /login with returnTo parameter.
 */
export async function requireAuth(returnTo?: string): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${query}`);
  }

  const profile = await getCurrentProfile(user);
  return { user, profile };
}

/**
 * Server-side Role Authorization Guard.
 * Strictly verifies the authenticated profile's assigned role.
 * Redirects to /unauthorized if role is not permitted.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  returnTo?: string
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  const { user, profile } = await requireAuth(returnTo);

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return { user, profile };
}

/**
 * Server-side Student Onboarding Guard.
 * Strictly verifies that student accounts have completed profile onboarding.
 * Incomplete students are redirected to /onboarding.
 */
export async function requireOnboarded(returnTo?: string): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  const { user, profile } = await requireAuth(returnTo);

  if (!profile) {
    redirect("/onboarding");
  }

  if (profile.role === "student" && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return { user, profile };
}

/**
 * Convenience wrapper for faculty and administrative routes.
 */
export async function requireAdvisor(returnTo?: string): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  return await requireRole(["advisor", "department_head", "admin"], returnTo);
}
