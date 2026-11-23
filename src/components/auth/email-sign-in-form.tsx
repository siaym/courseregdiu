"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
  signInWithEmailPasswordAction,
} from "@/app/login/actions";

interface EmailSignInFormProps {
  redirectTo?: string;
}

export function EmailSignInForm({ redirectTo }: EmailSignInFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"otp" | "password">("otp");

  // OTP State
  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpStep, setOtpStep] = React.useState<"enter_email" | "enter_code">("enter_email");
  const [otpCode, setOtpCode] = React.useState("");
  const [simulatedCode, setSimulatedCode] = React.useState<string | null>(null);

  // Password State
  const [passwordEmail, setPasswordEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  // UI / Status State
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Countdown timer for OTP resend
  const [resendTimer, setResendTimer] = React.useState(0);
  React.useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpEmail.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestEmailOtpAction({ email: otpEmail.trim() });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to dispatch verification code.");
      } else {
        setOtpStep("enter_code");
        setResendTimer(60);
        if (res.simulatedOtp) {
          setSimulatedCode(res.simulatedOtp);
        }
        setSuccessMessage("A 6-digit verification passcode has been dispatched.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otpCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit passcode.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyEmailOtpAction(
        { email: otpEmail.trim(), token: otpCode.trim() },
        redirectTo
      );
      if (!res.success) {
        setErrorMessage(res.error || "Verification failed. Please try again.");
      } else if (res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Verification error.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Sign In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordEmail.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signInWithEmailPasswordAction(
        { email: passwordEmail.trim(), password },
        redirectTo
      );
      if (!res.success) {
        setErrorMessage(res.error || "Sign in failed. Check your credentials.");
      } else if (res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Sign in error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0b101b] border border-[#1c263c] text-xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab("otp");
            setErrorMessage(null);
          }}
          className={`py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "otp"
              ? "bg-[#182338] text-white shadow-xs font-semibold"
              : "text-[#8e9db2] hover:text-slate-200"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
          <span>Passcode (OTP)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("password");
            setErrorMessage(null);
          }}
          className={`py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "password"
              ? "bg-[#182338] text-white shadow-xs font-semibold"
              : "text-[#8e9db2] hover:text-slate-200"
          }`}
        >
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span>Password</span>
        </button>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <Alert variant="destructive" className="border-rose-800 bg-rose-950/40 text-rose-200 py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs text-rose-300">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Feedback */}
      {successMessage && !errorMessage && (
        <Alert className="border-emerald-800 bg-emerald-950/40 text-emerald-200 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-xs text-emerald-300">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab 1: OTP / Magic Passcode */}
      {activeTab === "otp" && (
        <>
          {otpStep === "enter_email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="otp-email" className="text-xs text-slate-300">
                  DIU or Authorized Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="student@diu.edu.bd"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 bg-[#0b101b] border-[#1c263c] text-xs text-white placeholder:text-slate-500 h-9 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#008764] hover:bg-[#007153] text-white text-xs font-semibold h-9 rounded-xl transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span>Sending Passcode...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Passcode</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="p-2.5 rounded-xl bg-[#0b101b] border border-[#1c263c] flex items-center justify-between text-xs">
                <div className="truncate text-slate-300">
                  Code sent to <span className="font-semibold text-white">{otpEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("enter_email");
                    setOtpCode("");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-emerald-400 hover:underline ml-2 whitespace-nowrap cursor-pointer"
                >
                  Change
                </button>
              </div>

              {simulatedCode && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Dev Passcode: <strong className="font-mono text-white text-sm">{simulatedCode}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(simulatedCode)}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="otp-code" className="text-xs text-slate-300">
                  6-Digit Verification Passcode
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  disabled={isLoading}
                  autoFocus
                  className="text-center font-mono tracking-widest text-base font-bold bg-[#0b101b] border-[#1c263c] text-white h-10 focus-visible:ring-emerald-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-[#008764] hover:bg-[#007153] text-white text-xs font-semibold h-9 rounded-xl transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Passcode & Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center pt-1">
                {resendTimer > 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Resend passcode in <strong className="text-slate-300">{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isLoading}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend verification passcode</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}

      {/* Tab 2: Password Sign In */}
      {activeTab === "password" && (
        <form onSubmit={handlePasswordSignIn} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-email" className="text-xs text-slate-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="pwd-email"
                type="email"
                placeholder="faculty@diu.edu.bd"
                value={passwordEmail}
                onChange={(e) => setPasswordEmail(e.target.value)}
                required
                disabled={isLoading}
                className="pl-9 bg-[#0b101b] border-[#1c263c] text-xs text-white placeholder:text-slate-500 h-9 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd-pass" className="text-xs text-slate-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="pwd-pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pl-9 bg-[#0b101b] border-[#1c263c] text-xs text-white placeholder:text-slate-500 h-9 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 rounded-xl transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In with Password</span>
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
