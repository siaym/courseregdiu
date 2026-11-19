import Link from "next/link";
import { GraduationCap, ShieldAlert, AlertCircle, ArrowLeft, CheckCircle2, ArrowRight, UserCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error;
  const returnTo = params.returnTo || "/dashboard";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Enter Student Dashboard Directly
        </Link>

        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#006a4e] text-white shadow-md shadow-emerald-900/10 mb-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            DIU Student & Faculty Portal
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Daffodil International University Academic Course Registration System
          </p>
        </div>

        {/* Quick Prototype Access Callout */}
        <Card className="border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-1.5 text-[#006a4e] dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Phase 1 Prototype Demo Mode</span>
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
              Instant Access Without Login
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
              Explore the fully interactive Student and Advisor prototypes with DIU curriculum mock data:
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <Button asChild size="sm" className="w-full bg-[#006a4e] hover:bg-[#00553e] text-white text-xs font-semibold justify-between">
              <Link href="/dashboard">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Enter Student Portal (Tanvir Ahmed)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-xs font-semibold justify-between bg-white dark:bg-slate-900">
              <Link href="/advisor">
                <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <UserCheck className="h-4 w-4 text-[#006a4e]" />
                  Enter Advisor Portal (Dr. Allayear)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Error Alert Display */}
        {error === "invalid_domain" && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Institutional Account Required</AlertTitle>
            <AlertDescription>
              Access is strictly restricted to verified Daffodil International University accounts (<strong>@diu.edu.bd</strong>). Personal Gmail accounts are rejected by server-side authorization.
            </AlertDescription>
          </Alert>
        )}

        {error === "oauth_failed" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>
              Google OAuth authentication was cancelled or could not be completed. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Sign-In Card */}
        <Card className="border-slate-200 shadow-md dark:border-slate-800">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-lg">Institutional Single Sign-On</CardTitle>
            <CardDescription className="text-xs">
              Authenticate securely using your university-issued Google credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 p-3 text-xs space-y-1.5 text-emerald-900 dark:text-emerald-300">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Authorized Roles</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800 dark:text-emerald-400 pl-1">
                <li>Undergraduate & Graduate Students</li>
                <li>Department Academic Advisors</li>
                <li>Department Heads & Administrative Officers</li>
              </ul>
            </div>

            {/* Google OAuth Button Only */}
            <GoogleSignInButton redirectTo={returnTo} />
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[11px]">
              By signing in, you agree to comply with DIU Academic Integrity and Information Security Policies.
            </p>
            <div className="text-[10px] text-slate-400">
              Need technical assistance? Contact IT Support at <span className="font-mono">support@diu.edu.bd</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
