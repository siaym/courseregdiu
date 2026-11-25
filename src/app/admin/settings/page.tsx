import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getAllSystemSettings } from "@/lib/settings/system-settings";
import { AdminAuthSettingsCard } from "@/components/admin/admin-auth-settings-card";
import { Settings, ShieldCheck } from "lucide-react";

export default async function AdminSettingsPage() {
  const { user, profile } = await requireAdmin("/admin/settings");
  const systemSettings = await getAllSystemSettings();

  return (
    <AppShell user={user} profile={profile}>
      <div className="space-y-6 text-slate-100 max-w-5xl mx-auto py-2">
        <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <Settings className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              System Settings &amp; Security Policy
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Runtime authentication flags and institutional domain enforcement controls.
          </p>
        </div>

        <AdminAuthSettingsCard
          initialEmailAuthEnabled={systemSettings.emailAuthEnabled}
          initialDemoBypassEnabled={systemSettings.demoBypassEnabled}
        />

        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Institutional Security Boundaries</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#8e9db2]">
            <div className="rounded-lg border border-[#1c263c] bg-[#0b0f19] p-3">
              <div className="text-white font-semibold">Allowed Institutional Domain</div>
              <div className="font-mono text-emerald-400 mt-1">
                @{process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd"}
              </div>
            </div>
            <div className="rounded-lg border border-[#1c263c] bg-[#0b0f19] p-3">
              <div className="text-white font-semibold">Row-Level Security (RLS)</div>
              <div className="font-mono text-emerald-400 mt-1">
                Enforced on all tables &amp; immutable audit logs
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
