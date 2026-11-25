import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { UserRole } from "@/types/database";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_FIRST_TIME_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
  MOCK_ADMIN_PROFILE,
  MOCK_AUTHORIZED_EMAILS,
  type ProfileRow,
  type AuthorizedEmailRow,
} from "@/lib/mock/data";

export interface EmailAuthorizationResult {
  authorized: boolean;
  profileId?: string;
  role?: UserRole;
  emailType?: AuthorizedEmailRow["email_type"];
  isActive?: boolean;
  reason?: string;
  profile?: ProfileRow;
}

/**
 * Normalizes email address for secure, case-insensitive comparison.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Verifies whether an email belongs to the official Daffodil International University domain.
 */
export function isDIUEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd";
  return normalized.endsWith(`@${domain.toLowerCase()}`);
}

/**
 * Authoritatively resolves an email identity against the multi-email authorization model:
 * 1. Normalized lookup against public.authorized_emails (and dev mock registry).
 * 2. If explicitly registered and active -> Authorized as associated profile.
 * 3. If explicitly registered but is_active = false -> Deactivated / Access Revoked.
 * 4. If not explicitly registered:
 *    - If @diu.edu.bd -> Default Student eligibility (students only; domain NEVER grants advisor or admin).
 *    - If personal email (e.g. @gmail.com) -> Unauthorized personal email.
 */
export async function resolveEmailAuthorization(
  rawEmail: string | null | undefined
): Promise<EmailAuthorizationResult> {
  const normEmail = normalizeEmail(rawEmail);
  if (!normEmail) {
    return { authorized: false, reason: "EMPTY_EMAIL" };
  }

  const isProduction = process.env.NODE_ENV === "production";
  const supabaseConfigured = isSupabaseConfigured();

  // 1. Authoritative PostgreSQL Database Verification
  if (supabaseConfigured || isProduction) {
    try {
      const supabase = await getSupabaseServerClient();
      const queryResult = (await supabase
        .from("authorized_emails")
        .select("*, profile:profiles!authorized_emails_profile_id_fkey(*)")
        .eq("email", normEmail)
        .maybeSingle()) as {
          data: (AuthorizedEmailRow & { profile: ProfileRow | null }) | null;
          error: unknown;
        };
      const authRecord = queryResult.data;
      const error = queryResult.error;

      // CRITICAL SECURITY DIRECTIVE (P0): In production, database query errors must FAIL CLOSED immediately
      if (error) {
        if (isProduction) {
          console.error("[EmailAuthorization] Production database error during lookup:", error);
          return { authorized: false, reason: "DATABASE_UNAVAILABLE" };
        }
        // In non-production local dev, fall through to dev mock registry if remote table is not yet migrated
      } else if (authRecord) {
        const profile = authRecord.profile;
        if (!authRecord.is_active) {
          return {
            authorized: false,
            profileId: authRecord.profile_id,
            role: profile?.role,
            emailType: authRecord.email_type,
            isActive: false,
            reason: "DEACTIVATED",
          };
        }

        return {
          authorized: true,
          profileId: authRecord.profile_id,
          role: profile?.role,
          emailType: authRecord.email_type,
          isActive: true,
          profile: profile || undefined,
        };
      } else {
        // Database lookup succeeded cleanly with no record
        if (isDIUEmail(normEmail)) {
          if (!isProduction) {
            const mockAuth = MOCK_AUTHORIZED_EMAILS.find(
              (item) => normalizeEmail(item.email) === normEmail
            );
            if (mockAuth) {
              return {
                authorized: true,
                profileId: mockAuth.profile_id,
                role: "student",
                emailType: "primary_diu",
                isActive: true,
              };
            }
          }

          return {
            authorized: true,
            role: "student",
            emailType: "primary_diu",
            isActive: true,
          };
        }

        if (isProduction) {
          return {
            authorized: false,
            reason: "UNREGISTERED_PERSONAL_EMAIL",
          };
        }
      }
    } catch (err) {
      if (isProduction) {
        console.error("[EmailAuthorization] Production database connection exception:", err);
        return { authorized: false, reason: "DATABASE_UNAVAILABLE" };
      }
      // In non-production local dev, fall through to dev mock registry
    }
  }

  // 2. Check dev mock authorized emails registry (strictly in offline local development/tests)
  if (!isProduction) {
    const mockAuth = MOCK_AUTHORIZED_EMAILS.find(
      (item) => normalizeEmail(item.email) === normEmail
    );

    if (mockAuth) {
      // Find matching profile in mock records
      let mockProfile: ProfileRow | undefined;
      if (mockAuth.profile_id === MOCK_STUDENT_PROFILE.id || mockAuth.profile_id === "prof-student-01") {
        mockProfile = MOCK_STUDENT_PROFILE;
      } else if (mockAuth.profile_id === MOCK_ADVISOR_PROFILE.id) {
        mockProfile = MOCK_ADVISOR_PROFILE;
      } else if (mockAuth.profile_id === MOCK_ADMIN_PROFILE.id) {
        mockProfile = MOCK_ADMIN_PROFILE;
      } else if (mockAuth.profile_id === MOCK_FIRST_TIME_STUDENT_PROFILE.id) {
        mockProfile = MOCK_FIRST_TIME_STUDENT_PROFILE;
      }

      if (!mockAuth.is_active) {
        return {
          authorized: false,
          profileId: mockAuth.profile_id,
          role: mockProfile?.role,
          emailType: mockAuth.email_type,
          isActive: false,
          reason: "DEACTIVATED",
        };
      }

      return {
        authorized: true,
        profileId: mockAuth.profile_id,
        role: mockProfile?.role,
        emailType: mockAuth.email_type,
        isActive: true,
        profile: mockProfile,
      };
    }
  }

  // 3. Fallback for default student eligibility (@diu.edu.bd)
  if (isDIUEmail(normEmail)) {
    // Students only: Institutional domain grants student eligibility by default.
    // IT DOES NOT AND MUST NEVER GRANT ADVISOR OR ADMIN ACCESS.
    return {
      authorized: true,
      role: "student",
      emailType: "primary_diu",
      isActive: true,
    };
  }

  // 4. Unregistered personal email (e.g. unknown @gmail.com) -> Rejected
  return {
    authorized: false,
    reason: "UNREGISTERED_PERSONAL_EMAIL",
  };
}

/**
 * Registers an authorized email record into the active runtime mock registry (for tests and dev mode).
 */
export function registerMockAuthorizedEmail(record: AuthorizedEmailRow) {
  const norm = normalizeEmail(record.email);
  const existingIdx = MOCK_AUTHORIZED_EMAILS.findIndex((r) => normalizeEmail(r.email) === norm);
  if (existingIdx !== -1) {
    MOCK_AUTHORIZED_EMAILS[existingIdx] = { ...record, email: norm };
  } else {
    MOCK_AUTHORIZED_EMAILS.push({ ...record, email: norm });
  }
}

/**
 * Revokes (removes) an authorized email from the active runtime mock registry.
 */
export function revokeMockAuthorizedEmail(email: string) {
  const norm = normalizeEmail(email);
  const idx = MOCK_AUTHORIZED_EMAILS.findIndex((r) => normalizeEmail(r.email) === norm);
  if (idx !== -1) {
    MOCK_AUTHORIZED_EMAILS.splice(idx, 1);
  }
}
