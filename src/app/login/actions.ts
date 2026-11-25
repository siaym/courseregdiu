"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdmin, getCurrentProfile } from "@/lib/auth/roles";
import { resolveEmailAuthorization, normalizeEmail } from "@/lib/auth/email-authorization";
import {
  isEmailAuthEnabled,
  setEmailAuthEnabled,
  setDemoBypassEnabled,
  getAllSystemSettings,
} from "@/lib/settings/system-settings";
import {
  requestOtpSchema,
  verifyOtpSchema,
  emailPasswordLoginSchema,
  type RequestOtpInput,
  type VerifyOtpInput,
  type EmailPasswordLoginInput,
} from "@/lib/validations/auth";
import { validateSafeRedirect } from "@/app/auth/callback/route";

export interface AuthActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  simulatedOtp?: string;
  isSimulated?: boolean;
  redirectTo?: string;
}

/**
 * Resolves the default landing redirect path based on user role and onboarding state.
 */
function resolveLandingPath(
  role: string | null | undefined,
  onboardingCompleted: boolean | undefined,
  requestedNext?: string
): string {
  const safeNext = validateSafeRedirect(requestedNext);

  if (role === "admin") {
    return safeNext === "/dashboard" ? "/admin" : safeNext;
  }
  if (role === "advisor" || role === "department_head") {
    return safeNext === "/dashboard" ? "/advisor" : safeNext;
  }
  if (role === "student" && !onboardingCompleted) {
    return "/onboarding";
  }
  return safeNext;
}

/**
 * Server action: Dispatches an Email One-Time Passcode (OTP) or Magic Link.
 *
 * Enforces:
 * 1. Email Login Admin Toggle Check (Must be enabled)
 * 2. Institutional/Authorized Email Resolution Check
 * 3. Deactivated Account Exclusion
 */
export async function requestEmailOtpAction(
  rawInput: RequestOtpInput
): Promise<AuthActionResult<{ email: string }>> {
  // 1. Validate Input Schema
  const parseResult = requestOtpSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: "Please enter a valid email address.",
    };
  }

  const email = normalizeEmail(parseResult.data.email);

  // 2. Authoritative Feature Flag Check: Is Email Login Allowed by Admin?
  const emailAuthActive = await isEmailAuthEnabled();
  if (!emailAuthActive) {
    return {
      success: false,
      error: "Email authentication is currently disabled by University Administration. Please use Google SSO (@diu.edu.bd).",
    };
  }

  // 3. Email Authorization Policy Check
  const authResult = await resolveEmailAuthorization(email);
  if (!authResult.authorized) {
    if (authResult.reason === "DEACTIVATED") {
      return {
        success: false,
        error: "This account authorization has been deactivated. Please contact DIU Administration.",
      };
    }
    return {
      success: false,
      error: "This email is not authorized for DIU registration. Please use your institutional @diu.edu.bd account or contact the Registrar.",
    };
  }

  // 4. Supabase Auth OTP Dispatch
  const isProd = process.env.NODE_ENV === "production";
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const redirectUrl = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (isProd) {
          return { success: false, error: `Authentication service error: ${error.message}` };
        }
        // In local development when SMTP is not configured, provide simulated OTP
        return {
          success: true,
          data: { email },
          simulatedOtp: "123456",
          isSimulated: true,
        };
      }

      return {
        success: true,
        data: { email },
      };
    } catch (err: unknown) {
      if (isProd) {
        const msg = err instanceof Error ? err.message : "Service unavailable";
        return { success: false, error: `Authentication service unavailable (${msg}).` };
      }
    }
  }

  // Local development / testing simulation fallback
  return {
    success: true,
    data: { email },
    simulatedOtp: "123456",
    isSimulated: true,
  };
}

/**
 * Server action: Verifies the 6-digit OTP code and establishes an authenticated session.
 */
export async function verifyEmailOtpAction(
  rawInput: VerifyOtpInput,
  returnTo?: string
): Promise<AuthActionResult<{ redirectTo: string }>> {
  // 1. Validate Input Schema
  const parseResult = verifyOtpSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: "Passcode must be exactly 6 digits.",
    };
  }

  const { email: rawEmail, token } = parseResult.data;
  const email = normalizeEmail(rawEmail);

  // 2. Feature Flag Check
  const emailAuthActive = await isEmailAuthEnabled();
  if (!emailAuthActive) {
    return {
      success: false,
      error: "Email authentication is currently disabled by University Administration. Please use Google SSO.",
    };
  }

  // 3. Email Authorization Check
  const authResult = await resolveEmailAuthorization(email);
  if (!authResult.authorized) {
    return {
      success: false,
      error: "This email identity is not authorized for portal access.",
    };
  }

  const isProd = process.env.NODE_ENV === "production";

  // 4. Live Supabase Auth Verification (Production or Configured Cloud)
  if (isSupabaseConfigured() && isProd) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error || !data.user) {
        return {
          success: false,
          error: "Invalid or expired passcode. Please request a new code.",
        };
      }

      // Resolve user profile for redirection
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", data.user.id)
        .maybeSingle();

      const landing = resolveLandingPath(
        profile?.role || authResult.role,
        profile?.onboarding_completed,
        returnTo
      );

      return {
        success: true,
        redirectTo: landing,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Service error";
      return { success: false, error: `Authentication error: ${msg}` };
    }
  }

  // 5. Development / Offline Test Verification
  // In dev/test, token "123456" is accepted for authorized accounts
  if (token !== "123456") {
    // If Supabase configured in dev, try real verification
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
        if (!error && data.user) {
          const profile = await getCurrentProfile(data.user);
          const landing = resolveLandingPath(
            profile?.role || authResult.role,
            profile?.onboarding_completed,
            returnTo
          );
          return { success: true, redirectTo: landing };
        }
      } catch {
        // Fall through
      }
    }
    return {
      success: false,
      error: "Invalid passcode. In development mode, use code 123456.",
    };
  }

  // Set dev session cookie to align with authorized role
  const devRole = authResult.role === "admin"
    ? "admin"
    : authResult.role === "advisor"
    ? (email.includes("gmail") ? "advisor_personal" : "advisor")
    : (email.includes("gmail") ? "student_alt" : "student");

  try {
    const cookieStore = await cookies();
    cookieStore.set("diu_session_role", devRole, {
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "lax",
    });
  } catch {
    // Outside request context (CLI/test environment)
  }

  const landing = resolveLandingPath(authResult.role, true, returnTo);
  return {
    success: true,
    redirectTo: landing,
  };
}

/**
 * Server action: Authenticates via Email + Password for accounts with password credentials.
 */
export async function signInWithEmailPasswordAction(
  rawInput: EmailPasswordLoginInput,
  returnTo?: string
): Promise<AuthActionResult<{ redirectTo: string }>> {
  const parseResult = emailPasswordLoginSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: "Please provide a valid email and password.",
    };
  }

  const { email: rawEmail, password } = parseResult.data;
  const email = normalizeEmail(rawEmail);

  // 1. Feature Flag Check
  const emailAuthActive = await isEmailAuthEnabled();
  if (!emailAuthActive) {
    return {
      success: false,
      error: "Email authentication is currently disabled by University Administration. Please use Google SSO.",
    };
  }

  // 2. Supabase Auth Password Sign In (in production, authenticate first so RLS allows reading own authorized_emails row)
  const isProd = process.env.NODE_ENV === "production";
  if (isSupabaseConfigured() && isProd) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        const msg = error?.message || "Invalid email or password.";
        return {
          success: false,
          error: msg === "Invalid login credentials" ? "Invalid email or password." : msg,
        };
      }

      const authResult = await resolveEmailAuthorization(email);
      if (!authResult.authorized) {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            authResult.reason === "DEACTIVATED"
              ? "This account authorization has been deactivated. Please contact DIU Administration."
              : "This email identity is not authorized for portal access.",
        };
      }

      const targetProfileId = authResult.profileId || data.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", targetProfileId)
        .maybeSingle();

      const landing = resolveLandingPath(
        profile?.role || authResult.role,
        profile?.onboarding_completed,
        returnTo
      );

      return { success: true, redirectTo: landing };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Service error";
      return { success: false, error: `Authentication failed: ${msg}` };
    }
  }

  // 3. Dev / Test Email Authorization Check
  const authResult = await resolveEmailAuthorization(email);
  if (!authResult.authorized) {
    return {
      success: false,
      error: "This email identity is not authorized for portal access.",
    };
  }

  // 4. Dev Supabase Auth Password Sign In
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", data.user.id)
          .maybeSingle();

        const landing = resolveLandingPath(
          profile?.role || authResult.role,
          profile?.onboarding_completed,
          returnTo
        );

        return { success: true, redirectTo: landing };
      }
    } catch {
      // Fallback to dev session
    }
  }

  // 4. Dev / Test Password Fallback for Known Personas
  if (!isProd && password.length >= 6) {
    const devRole = authResult.role === "admin"
      ? "admin"
      : authResult.role === "advisor"
      ? (email.includes("gmail") ? "advisor_personal" : "advisor")
      : (email.includes("gmail") ? "student_alt" : "student");

    try {
      const cookieStore = await cookies();
      cookieStore.set("diu_session_role", devRole, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // Outside request context (CLI/test environment)
    }

    const landing = resolveLandingPath(authResult.role, true, returnTo);
    return {
      success: true,
      redirectTo: landing,
    };
  }

  return {
    success: false,
    error: "Invalid email or password.",
  };
}

/**
 * Admin action: Toggles Email-based authentication ON or OFF.
 * Strictly gated by requireAdmin().
 */
export async function toggleEmailAuthAction(
  enabled: boolean
): Promise<AuthActionResult<{ enabled: boolean }>> {
  const { profile } = await requireAdmin();

  const result = await setEmailAuthEnabled(enabled, profile.id);
  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to update email authentication setting.",
    };
  }

  try {
    revalidatePath("/admin");
    revalidatePath("/admin/emails");
    revalidatePath("/login");
  } catch {}

  return {
    success: true,
    data: { enabled: result.enabled },
  };
}

/**
 * Admin action: Toggles Faculty Demo Mode bypass ON or OFF in development.
 * Strictly gated by requireAdmin().
 */
export async function toggleDemoBypassAction(
  enabled: boolean
): Promise<AuthActionResult<{ enabled: boolean }>> {
  const { profile } = await requireAdmin();

  const result = await setDemoBypassEnabled(enabled, profile.id);
  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to update demo bypass setting.",
    };
  }

  try {
    revalidatePath("/admin");
    revalidatePath("/login");
    revalidatePath("/dashboard");
  } catch {}

  return {
    success: true,
    data: { enabled: result.enabled },
  };
}

/**
 * Retrieves the current system settings for admin views.
 */
export async function getSystemSettingsAction() {
  return await getAllSystemSettings();
}

/**
 * Development authentication helper to test real server-side role resolution
 * and onboarding enforcement without requiring external Google OAuth in local offline testing.
 * Disabled in production environments.
 */
export async function setDevSession(
  role: "student" | "student_alt" | "student_new" | "advisor" | "advisor_personal" | "advisor_deactivated" | "admin"
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development authentication is prohibited in production.");
  }

  const cookieStore = await cookies();
  cookieStore.set("diu_session_role", role, {
    httpOnly: true,
    secure: false,
    path: "/",
    sameSite: "lax",
  });

  if (role === "student_new") {
    cookieStore.delete("diu_onboarded_student_data");
    redirect("/onboarding");
  }

  if (role === "advisor" || role === "advisor_personal") {
    redirect("/advisor");
  }

  if (role === "advisor_deactivated") {
    redirect("/login?error=advisor_deactivated");
  }

  if (role === "admin") {
    redirect("/admin/emails");
  }

  redirect("/dashboard");
}

export async function clearSession() {
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {}

  const cookieStore = await cookies();
  cookieStore.delete("diu_session_role");
  cookieStore.delete("diu_onboarded_student_data");

  redirect("/login?auth=true");
}
