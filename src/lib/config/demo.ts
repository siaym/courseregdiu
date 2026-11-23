/**
 * Faculty Demo Presentation Mode
 *
 * When DEMO_MODE is true:
 * - The login page is temporarily bypassed so faculty/reviewers can immediately explore
 *   the DIU Course Registration portal without entering credentials or Google OAuth.
 * - Default session role defaults to "student" (Atikur Rahman / Siyam).
 * - Full Google OAuth and authentication testing panels are preserved in
 *   `src/components/auth/login-view.tsx` for production reactivation.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
