import { redirect } from "next/navigation";

export { PreservedLoginPage } from "@/components/auth/login-view";

/**
 * DEMO MODE (Presentation to Faculty):
 * Login page is temporarily removed/bypassed so the demo opens directly
 * without requiring Google login or authentication screens.
 *
 * The original full Google OAuth & Dev Authentication panel is preserved in:
 * src/components/auth/login-view.tsx
 */
export default function LoginPage() {
  redirect("/dashboard");
}
