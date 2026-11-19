import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { clearSession } from "@/app/login/actions";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19] text-slate-100">
      <Card className="max-w-md w-full border-[#1c263c] bg-[#121827] text-center shadow-xl">
        <CardHeader className="pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mb-3 shadow-xs">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-white tracking-tight">
            Access Unauthorized (403)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-[#8e9db2]">
          <p>
            Your authenticated account does not possess the requisite institutional role permissions to access this route.
          </p>
          <div className="p-3 bg-[#0b0f19] border border-[#1e293b] rounded-xl text-left font-mono text-[11px] text-rose-300">
            Authorization: Server Role Policy Enforcement Failed.
          </div>
          <p className="text-[11px] text-slate-400">
            Advisor and faculty workspaces require an authorized Faculty Advisor appointment verified by the Department Head.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Student Dashboard</span>
          </Link>
          <form action={clearSession} className="w-full sm:w-auto">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch Account</span>
            </button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
