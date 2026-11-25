import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  CalendarClock,
  GraduationCap,
  UserCheck,
  Building2,
} from "lucide-react";
import { DiuLogo } from "@/components/brand/diu-logo";
import { ContourBackground } from "@/components/brand/contour-background";

export interface LandingViewProps {
  isAuthenticated?: boolean;
  dashboardHref?: string;
}

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Institutional SSO",
    description:
      "Sign in exclusively with your verified @diu.edu.bd Google account or a Registrar-authorized email exception.",
    meta: "Google OAuth 2.0 • Canonical Profile",
  },
  {
    step: "02",
    title: "Prerequisite Verification",
    description:
      "Course eligibility is checked against completed academic history requiring a minimum passing grade of D (2.00).",
    meta: "4.00 Scale • Automated Audit",
  },
  {
    step: "03",
    title: "Collision-Free Scheduling",
    description:
      "Select theory (50 seats) and lab (25 seats) sections with instant weekly timetable overlap detection.",
    meta: "Live Seat Counters • Weekly Matrix",
  },
  {
    step: "04",
    title: "Faculty Advisor Approval",
    description:
      "Submit your advising slip to your assigned advisor's Application Center for review, remarks, and final sign-off.",
    meta: "Two-Tier Workflow • Audit Trail",
  },
] as const;

const ACADEMIC_POLICIES = [
  { label: "Academic Calendar", value: "Spring • Summer • Fall" },
  { label: "Normal Semester Load", value: "12.0 – 18.0 Credits" },
  { label: "Probationary Cap (CGPA < 2.00)", value: "9.0 – 12.0 Credits" },
  { label: "Graduating Senior Overload", value: "Up to 21.0 Credits (Dept. Head)" },
  { label: "Prerequisite Minimum Grade", value: "D (2.00)" },
  { label: "Student ID Format", value: "XXX-XX-XXXXX" },
] as const;

const PORTAL_ROLES = [
  {
    icon: GraduationCap,
    role: "Students",
    summary:
      "Browse eligible courses, resolve timetable conflicts, submit advising drafts, and track approval status.",
    badge: "@diu.edu.bd",
  },
  {
    icon: UserCheck,
    role: "Faculty Advisors",
    summary:
      "Review assigned advisee applications, verify payment clearance, adjust sections, and record advising remarks.",
    badge: "Application Center",
  },
  {
    icon: Building2,
    role: "Department Heads & Registrar",
    summary:
      "Oversee departmental cohorts, manage authorized email exceptions, and audit semester registration windows.",
    badge: "Governance",
  },
] as const;

const SLIP_PREVIEW_ROWS = [
  {
    code: "CSE311",
    title: "Database Management Systems",
    section: "69_D",
    credits: "3.0",
    status: "Prerequisite Met",
  },
  {
    code: "CSE312",
    title: "Database Management Systems Lab",
    section: "69_D",
    credits: "1.5",
    status: "22 / 25 Seats",
  },
  {
    code: "CSE321",
    title: "Computer Networks",
    section: "69_K",
    credits: "3.0",
    status: "No Collision",
  },
] as const;

export function LandingView({
  isAuthenticated = false,
  dashboardHref = "/dashboard",
}: LandingViewProps) {
  const primaryHref = isAuthenticated ? dashboardHref : "/login";
  const primaryLabel = isAuthenticated ? "Open Workspace" : "Sign In with @diu.edu.bd";

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 relative overflow-x-hidden">
      <ContourBackground />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#1c263c] bg-[#0b0f19]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
            <DiuLogo className="h-9 w-9" showText={true} />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-xs font-medium text-[#8e9db2]"
          >
            <a
              href="#workflow"
              className="hover:text-white transition-colors"
            >
              Registration Workflow
            </a>
            <a
              href="#policies"
              className="hover:text-white transition-colors"
            >
              Academic Rules
            </a>
            <a
              href="#portals"
              className="hover:text-white transition-colors"
            >
              Role Portals
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Faculty &amp; Admin
              </Link>
            )}
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[#008764] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#007053] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span>{primaryLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Editorial Institutional Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1c263c] bg-[#121827] px-3 py-1 text-xs font-medium text-slate-300">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span>Daffodil International University • Academic Portal</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                Structured course registration and faculty advising.
              </h1>

              <p className="text-sm sm:text-base text-[#8e9db2] max-w-xl leading-relaxed">
                Replace manual advising slips with real-time schedule conflict detection,
                automated prerequisite verification, and a unified review queue built
                for DIU students, advisors, and department leadership.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0b0f19] shadow-sm hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span>{primaryLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#workflow"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1c263c] bg-[#121827] px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-[#172136] hover:text-white transition-colors"
                >
                  <span>How Advising Works</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-[#1c263c] text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>@diu.edu.bd Google SSO</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Live Timetable Collision Check</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                  <span>PostgreSQL Row-Level Security</span>
                </span>
              </div>
            </div>

            {/* Right Column: Realistic Advising Slip Inspector Preview */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#1c263c] px-4 py-3 bg-[#0f1523]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Advising Slip Inspector
                    </span>
                    <span className="rounded border border-[#1c263c] bg-[#172136] px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                      Preview
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    7.5 / 18.0 Cr
                  </span>
                </div>

                <div className="divide-y divide-[#1c263c]">
                  {SLIP_PREVIEW_ROWS.map((row) => (
                    <div
                      key={row.code}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {row.code}
                          </span>
                          <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c] text-slate-300">
                            {row.section}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-medium text-slate-200">
                          {row.title}
                        </p>
                      </div>

                      <div className="shrink-0 text-right space-y-1">
                        <div className="font-mono text-xs text-slate-300">
                          {row.credits} Cr
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#064e3b] bg-[#062822] px-2 py-0.5 text-[11px] font-medium text-[#10b981]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{row.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-[#1c263c] bg-[#0f1523] px-4 py-3 text-xs">
                  <span className="text-slate-400">
                    Tuition Clearance:{" "}
                    <span className="font-mono text-slate-200">Verified</span>
                  </span>
                  <span className="rounded-md border border-[#78350f] bg-[#2b200b] px-2 py-0.5 font-medium text-[#f59e0b]">
                    Ready for Advisor
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Registration Workflow */}
        <section
          id="workflow"
          className="border-t border-[#1c263c] bg-[#0d121d]"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  End-to-End Flow
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                  From institutional sign-in to advisor approval
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#8e9db2] max-w-md">
                Every registration step enforces DIU academic regulations before
                your slip reaches the faculty Application Center.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#1c263c] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#1c263c] bg-[#121827]">
              {WORKFLOW_STEPS.map((item) => (
                <div key={item.step} className="p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      STEP {item.step}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#8e9db2]">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#1c263c] font-mono text-[11px] text-slate-400">
                    {item.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Academic Policies & Role Portals */}
        <section
          id="policies"
          className="border-t border-[#1c263c] mx-auto max-w-6xl px-4 sm:px-6 py-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Academic Rules Table */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  DIU Regulations
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                  Academic Policy Guardrails
                </h2>
              </div>

              <div className="rounded-xl border border-[#1c263c] bg-[#121827] divide-y divide-[#1c263c]">
                {ACADEMIC_POLICIES.map((policy) => (
                  <div
                    key={policy.label}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-xs"
                  >
                    <span className="text-[#8e9db2] font-medium">
                      {policy.label}
                    </span>
                    <span className="font-mono font-semibold text-white text-right">
                      {policy.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Portals */}
            <div id="portals" className="lg:col-span-7 space-y-4">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Role-Based Access
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                  Dedicated Workspaces by Academic Role
                </h2>
              </div>

              <div className="space-y-3">
                {PORTAL_ROLES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.role}
                      className="flex items-start justify-between gap-4 rounded-xl border border-[#1c263c] bg-[#121827] p-4 hover:border-[#2a3958] transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1c263c] bg-[#0b0f19] text-emerald-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">
                              {item.role}
                            </h3>
                            <span className="rounded border border-[#1c263c] bg-[#172136] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#8e9db2]">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c263c] bg-[#090d16]">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-8">
          <div className="space-y-1">
            <DiuLogo className="h-8 w-8" showText={true} />
            <p className="text-xs text-[#8e9db2] pt-1">
              Course Registration &amp; Academic Advising Portal — Daffodil International University
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[#8e9db2]">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
