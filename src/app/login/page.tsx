import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config/demo";
import { isDemoBypassEnabled, isEmailAuthEnabled } from "@/lib/settings/system-settings";
import { LoginPageView, type LoginPageProps } from "@/components/auth/login-view";

export { LoginPageView as PreservedLoginPage } from "@/components/auth/login-view";

/**
 * Universal Login Page.
 *
 * Provides:
 * 1. Google OAuth (@diu.edu.bd) Single Sign-On.
 * 2. Runtime-controlled Email Authentication (OTP / Password) - toggleable via Admin Panel.
 * 3. Faculty presentation demo mode bypass in development (also toggleable via Admin Panel or ?auth=true).
 */
export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const params = searchParams ? await searchParams : {};
  const isDemo = isDemoMode();
  const demoBypassActive = await isDemoBypassEnabled();

  // If in demo presentation mode and bypass is active, and no explicit auth screen is requested:
  if (isDemo && demoBypassActive && !params.auth && !params.view) {
    redirect("/dashboard");
  }

  const emailAuthEnabled = await isEmailAuthEnabled();

  return <LoginPageView searchParams={params} emailAuthEnabled={emailAuthEnabled} />;
}
