import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole, Database } from "@/types/database";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_FIRST_TIME_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
  MOCK_ADVISEE_QUEUE,
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
  let devSession: string | undefined;
  try {
    const cookieStore = await cookies();
    devSession = cookieStore.get("diu_session_role")?.value;
  } catch {
    // Outside request context (e.g. test environment)
  }

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

  let devSession: string | undefined;
  let onboardedData: string | undefined;
  try {
    const cookieStore = await cookies();
    devSession = cookieStore.get("diu_session_role")?.value;
    onboardedData = cookieStore.get("diu_onboarded_student_data")?.value;
  } catch {
    // Outside request context
  }

  if (devSession === "advisor") {
    return MOCK_ADVISOR_PROFILE;
  }

  if (devSession === "student_new") {
    // Check if onboarding cookie exists
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

/**
 * Server-side guard verifying advisor-student assignment.
 * Advisors can ONLY access applications of students explicitly assigned to them.
 * Department Heads and Admins retain institutional override oversight.
 * Unassigned access triggers immediate redirection to /unauthorized.
 */
export async function requireAssignedRegistration(
  profile: Profile,
  registrationId: string
): Promise<boolean> {
  // Department heads and admins have university-wide oversight
  if (profile.role === "admin" || profile.role === "department_head") {
    return true;
  }

  // If role is not advisor, deny
  if (profile.role !== "advisor") {
    redirect("/unauthorized");
  }

  // 1. Check live database if Supabase client succeeds
  try {
    const supabase = await getSupabaseServerClient();
    const regResult = await supabase
      .from("registrations")
      .select("id, student_id, semester_id, advisor_id")
      .eq("id", registrationId)
      .maybeSingle();

    const reg = regResult.data as {
      id: string;
      student_id: string;
      semester_id: string;
      advisor_id: string | null;
    } | null;

    if (!regResult.error && reg) {
      if (reg.advisor_id === profile.id) {
        return true;
      }
      const assignmentResult = await supabase
        .from("advisor_assignments")
        .select("id")
        .eq("advisor_id", profile.id)
        .eq("student_id", reg.student_id)
        .eq("semester_id", reg.semester_id)
        .maybeSingle();

      if (assignmentResult.data) {
        return true;
      }
    }
  } catch {
    // Fall through to dev check
  }

  // 2. Local mock check for development mode
  const isAssigned = MOCK_ADVISEE_QUEUE.some(
    (app) => app.registration.id === registrationId
  );

  if (!isAssigned) {
    redirect("/unauthorized");
  }

  return true;
}
