"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toggleEmailAuthAction, toggleDemoBypassAction } from "@/app/login/actions";

interface AdminAuthSettingsCardProps {
  initialEmailAuthEnabled: boolean;
  initialDemoBypassEnabled: boolean;
}

export function AdminAuthSettingsCard({
  initialEmailAuthEnabled,
  initialDemoBypassEnabled,
}: AdminAuthSettingsCardProps) {
  const [emailAuthEnabled, setEmailAuthEnabled] = React.useState(initialEmailAuthEnabled);
  const [demoBypassEnabled, setDemoBypassEnabled] = React.useState(initialDemoBypassEnabled);

  const [isUpdatingEmail, setIsUpdatingEmail] = React.useState(false);
  const [isUpdatingDemo, setIsUpdatingDemo] = React.useState(false);

  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleToggleEmail = async () => {
    setIsUpdatingEmail(true);
    setFeedback(null);
    try {
      const targetState = !emailAuthEnabled;
      const res = await toggleEmailAuthAction(targetState);
      if (res.success && res.data) {
        setEmailAuthEnabled(res.data.enabled);
        setFeedback({
          type: "success",
          message: res.data.enabled
            ? "Email authentication is now ACTIVE alongside Google OAuth."
            : "Email authentication has been DISABLED. Google SSO is now exclusively enforced.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update email authentication setting.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle setting.",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleToggleDemo = async () => {
    setIsUpdatingDemo(true);
    setFeedback(null);
    try {
      const targetState = !demoBypassEnabled;
      const res = await toggleDemoBypassAction(targetState);
      if (res.success && res.data) {
        setDemoBypassEnabled(res.data.enabled);
        setFeedback({
          type: "success",
          message: res.data.enabled
            ? "Faculty presentation demo bypass is now ACTIVE (login screen skipped in dev)."
            : "Faculty presentation demo bypass is DISABLED (login screen enforced).",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update demo bypass setting.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle setting.",
      });
    } finally {
      setIsUpdatingDemo(false);
    }
  };

  return (
    <Card className="border-[#1c263c] bg-[#121827] shadow-md">
      <CardHeader className="p-5 pb-3 border-b border-[#1c263c]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <CardTitle className="text-base font-bold text-white">
                Authentication & Sign-In Controls
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#8e9db2]">
              Configure institutional sign-in methods, toggle email authentication, and control development presentation modes.
            </CardDescription>
          </div>
          <Link
            href="/login?auth=true"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182338] hover:bg-[#1e2c47] border border-[#263552] text-xs font-medium text-slate-200 hover:text-white transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>Preview Login Screen</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {feedback && (
          <Alert
            variant={feedback.type === "error" ? "destructive" : "default"}
            className={
              feedback.type === "error"
                ? "border-rose-800 bg-rose-950/40 text-rose-200 py-2.5"
                : "border-emerald-800 bg-emerald-950/40 text-emerald-200 py-2.5"
            }
          >
            {feedback.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <AlertDescription className="text-xs font-medium">
              {feedback.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Setting 1: Email Authentication Toggle */}
          <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1c263c] flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Email Authentication
                  </span>
                </div>
                {emailAuthEnabled ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold">
                    ACTIVE (ON)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium">
                    DISABLED (OFF)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8e9db2] leading-relaxed">
                Allow students and faculty to sign in using their verified email (One-Time Passcode or Password) alongside institutional Google OAuth.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#1c263c]/60">
              <span className="text-[11px] text-slate-400">
                {emailAuthEnabled
                  ? "Google OAuth + Email Sign-In are both active"
                  : "Google OAuth (@diu.edu.bd) exclusively enforced"}
              </span>
              <Button
                size="sm"
                variant={emailAuthEnabled ? "destructive" : "default"}
                onClick={handleToggleEmail}
                disabled={isUpdatingEmail}
                className={
                  emailAuthEnabled
                    ? "bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs h-8 cursor-pointer"
                    : "bg-[#008764] hover:bg-[#007153] text-white text-xs h-8 cursor-pointer"
                }
              >
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Updating...</span>
                  </>
                ) : emailAuthEnabled ? (
                  <span>Turn Off Email Login</span>
                ) : (
                  <span>Turn On Email Login</span>
                )}
              </Button>
            </div>
          </div>

          {/* Setting 2: Faculty Presentation Demo Bypass Toggle */}
          <div className="p-4 rounded-xl bg-[#0e1422] border border-[#1c263c] flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">
                    Faculty Demo Mode Bypass
                  </span>
                </div>
                {demoBypassEnabled ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold">
                    BYPASS ACTIVE (DEV)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 font-medium">
                    LOGIN ENFORCED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8e9db2] leading-relaxed">
                Skip the login screen in local development for seamless presentations to faculty. Disabling enforces the real login screen.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#1c263c]/60">
              <span className="text-[11px] text-slate-400">
                {demoBypassEnabled
                  ? "Bypassing login screen for teacher demo"
                  : "Login screen is shown on /login"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleDemo}
                disabled={isUpdatingDemo}
                className="border-[#263552] bg-[#182338] hover:bg-[#1e2c47] text-slate-200 text-xs h-8 cursor-pointer"
              >
                {isUpdatingDemo ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Updating...</span>
                  </>
                ) : demoBypassEnabled ? (
                  <span>Enforce Login Screen</span>
                ) : (
                  <span>Enable Demo Bypass</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
