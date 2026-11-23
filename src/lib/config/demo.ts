/**
 * Faculty Demo Presentation Mode
 *
 * CRITICAL SECURITY DIRECTIVE (P0):
 * DEMO_MODE is STRICTLY FORBIDDEN and HARD-DISABLED in production.
 * In production environments (NODE_ENV === 'production'), DEMO_MODE is unconditionally false.
 *
 * When DEMO_MODE is true (local development only):
 * - The login page is temporarily bypassed so faculty/reviewers can explore
 *   the DIU Course Registration portal without entering credentials or Google OAuth.
 * - Full Google OAuth and authentication testing panels are preserved in
 *   `src/components/auth/login-view.tsx` for production reactivation.
 */
export function isDemoMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
  );
}

export const DEMO_MODE = isDemoMode();
