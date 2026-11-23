import Link from "next/link";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Sparkles,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { isEmailAuthEnabled } from "@/lib/settings/system-settings";
import { setDevSession } from "@/app/login/actions";

export interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    returnTo?: string;
    auth?: string;
    view?: string;
  }> | {
    error?: string;
    returnTo?: string;
    auth?: string;
    view?: string;
  };
  emailAuthEnabled?: boolean;
}

/**
 * Universal Login Page Component supporting Google OAuth (@diu.edu.bd)
 * and runtime-controlled Email Authentication (OTP / Password).
 */
export async function LoginPageView({ searchParams, emailAuthEnabled: propEmailAuth }: LoginPageProps = {}) {
  const params = searchParams ? await searchParams : {};
  const error = params.error;
  const returnTo = params.returnTo || "/dashboard";

  // If already authenticated, redirect away from login
  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentProfile(user);
    if (profile?.role === "advisor" || profile?.role === "department_head" || profile?.role === "admin") {
      redirect("/advisor");
    }
    redirect(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
  }

  const isDevMode = process.env.NODE_ENV !== "production";
  const emailAuthActive = propEmailAuth !== undefined ? propEmailAuth : await isEmailAuthEnabled();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#0b0f19] text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#008764] text-white shadow-md mb-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            DIU Course Registration
          </h1>
          <p className="text-xs text-[#8e9db2] max-w-xs mx-auto">
            Daffodil International University Academic Information System
          </p>
        </div>

        {/* Error Feedback */}
        {(error === "invalid_domain" || error === "unauthorized_email") && (
          <Alert variant="destructive" className="border-rose-800 bg-rose-950/40 text-rose-200">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">
              {error === "unauthorized_email" ? "Personal Google Account Not Authorized" : "Institutional Access Restricted"}
            </AlertTitle>
            <AlertDescription className="text-xs text-rose-300">
              {error === "unauthorized_email"
                ? "This personal Google email has not been authorized by an Administrator. All scholars must use their @diu.edu.bd account unless an official exception has been registered by the Registrar."
                : "Only verified institutional accounts (@diu.edu.bd) or Admin-authorized personal email exceptions may authenticate."}
            </AlertDescription>
          </Alert>
        )}

        {(error === "email_revoked" || error === "advisor_deactivated") && (
          <Alert variant="destructive" className="border-amber-800 bg-amber-950/40 text-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertTitle className="text-xs font-semibold">Account Authorization Revoked</AlertTitle>
            <AlertDescription className="text-xs text-amber-300">
              The authorization for this email identity has been deactivated or revoked by an Administrator. Access is immediately suspended.
            </AlertDescription>
          </Alert>
        )}

        {error === "oauth_failed" && (
          <Alert variant="destructive" className="border-rose-800 bg-rose-950/40 text-rose-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Authentication Cancelled</AlertTitle>
            <AlertDescription className="text-xs text-rose-300">
              The authentication handshake was cancelled or encountered an error. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Institutional Login Card */}
        <Card className="border-[#1c263c] bg-[#121827] shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">
                Institutional Sign In
              </CardTitle>
              {emailAuthActive && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-semibold">
                  Google + Email Auth Active
                </span>
              )}
            </div>
            <CardDescription className="text-xs text-[#8e9db2]">
              Authenticate using your university Google account or authorized DIU email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Option: Google OAuth */}
            <GoogleSignInButton redirectTo={returnTo} />

            {/* Email Authentication Section (Admin Controlled) */}
            {emailAuthActive ? (
              <div className="space-y-3 pt-2">
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#1c263c]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-[#121827] px-2 text-[#8e9db2] font-semibold tracking-wider">
                      Or sign in with email
                    </span>
                  </div>
                </div>

                <EmailSignInForm redirectTo={returnTo} />
              </div>
            ) : (
              <div className="pt-2 text-center text-[11px] text-[#8e9db2] border-t border-[#1c263c]/60">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Institutional Google SSO (@diu.edu.bd) exclusively active.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controlled Development Authentication Testing Panel (Dev Only) */}
        {isDevMode && (
          <Card className="border-slate-800 bg-[#0f172a] shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Development Server Authentication Testing</span>
              </div>
              <CardDescription className="text-xs text-[#8e9db2]">
                Test server-side role resolution and onboarding guards locally:
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2.5">
              {/* Test as Onboarded Student (DIU Email) */}
              <form action={setDevSession.bind(null, "student")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#1c263c] bg-[#162035] hover:bg-[#1c2742] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-400" />
                    <span>Test as Student - DIU Email (siyam.cse@diu.edu.bd)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </form>

              {/* Test as Student with Authorized Alternative Personal Email */}
              <form action={setDevSession.bind(null, "student_alt")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-400" />
                    <span>Test as Student - Authorized Personal Email (siyam.personal@gmail.com)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                </button>
              </form>

              {/* Test as New Student (Incomplete Onboarding) */}
              <form action={setDevSession.bind(null, "student_new")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-amber-800/60 bg-amber-950/20 hover:bg-amber-950/40 text-amber-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-amber-400" />
                    <span>Test as First-Time Student (Enforces Onboarding)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                </button>
              </form>

              {/* Test as Faculty Advisor (DIU Email) */}
              <form action={setDevSession.bind(null, "advisor")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#1c263c] bg-[#162035] hover:bg-[#1c2742] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-400" />
                    <span>Test as Faculty Advisor (Dr. Rahman Ahmed)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </form>

              {/* Test as Faculty Advisor (Authorized Personal Email) */}
              <form action={setDevSession.bind(null, "advisor_personal")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-800/60 bg-blue-950/20 hover:bg-blue-950/40 text-blue-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-400" />
                    <span>Test as Advisor - Authorized Personal Email (dr.rahman.ahmed@gmail.com)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                </button>
              </form>

              {/* Test as Admin */}
              <form action={setDevSession.bind(null, "admin")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-800/60 bg-purple-950/20 hover:bg-purple-950/40 text-purple-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-purple-400" />
                    <span>Test as Administrator (Admin Email Console)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
                </button>
              </form>

              {/* Test Deactivated Advisor */}
              <form action={setDevSession.bind(null, "advisor_deactivated")}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <span>Test Deactivated Advisor (Access Revoked)</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-rose-400" />
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#8e9db2] space-y-2">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors hover:underline">
              Terms of Service
            </Link>
          </div>
          <div>Daffodil Smart City, Birulia, Savar, Dhaka-1216</div>
          <div>Division of Information Technology & Academic Records</div>
        </div>
      </div>
    </div>
  );
}

// Preserve backwards compatibility
export const PreservedLoginPage = LoginPageView;
