import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | DIU Course Registration System",
  description: "Official Privacy Policy for Daffodil International University (DIU) Course Registration and Academic Advising System.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1c263c] bg-[#121827]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#008764] text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">DIU Course Registration</span>
              <span className="text-[10px] text-[#8e9db2] block">Daffodil International University</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs transition-colors shadow-xs"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8 flex-1">
        {/* Title Header */}
        <div className="space-y-3 pb-6 border-b border-[#1c263c]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-medium">
            <Shield className="h-3.5 w-3.5" />
            <span>Official University Document</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#8e9db2] leading-relaxed">
            Daffodil International University (DIU) Course Registration & Academic Advising Information System
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Effective Date: November 20, 2026</span>
            <span>•</span>
            <span>Version: 2.1 (Institutional)</span>
            <span>•</span>
            <span className="text-emerald-400">Strictly Non-Monetized Academic Utility</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="p-5 rounded-2xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Daffodil International University (&quot;DIU&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;the University&quot;) is committed to protecting the privacy, confidentiality, and integrity of personal and academic data entrusted to us by our students, faculty members, academic advisors, and administrative staff.
          </p>
          <p>
            This Privacy Policy governs the collection, processing, storage, and protection of information when you access or interact with the DIU Course Registration System (accessible at{" "}
            <Link href="/" className="text-sky-400 underline hover:text-sky-300 font-mono">
              https://courseregdiu.asf.run/
            </Link>
            {" "}or any designated official university domain).
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="h-4 w-4 text-sky-400" />
            <span>1. Information We Collect</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              To deliver official course registration and academic advising services, the application collects only necessary data under strict institutional authorization:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#8e9db2]">
              <li>
                <strong className="text-slate-200">Google OAuth Account Data:</strong> When you sign in using your official institutional Google Workspace account (<code className="text-emerald-400 font-mono">@diu.edu.bd</code>) or an authorized alternative email, we receive your verified email address, full name, Google unique user ID, and profile image URL for identity verification.
              </li>
              <li>
                <strong className="text-slate-200">Academic Records:</strong> Standard DIU Student ID (e.g. <code className="text-emerald-400 font-mono">211-15-456</code>), academic department (e.g. CSE, SWE, EEE, BBA), intake batch, cumulative grade point average (CGPA), credit progression history, and enrolled course records.
              </li>
              <li>
                <strong className="text-slate-200">Course & Section Preferences:</strong> Selected courses, course classifications (<code className="text-slate-300 font-mono">General</code> vs. <code className="text-slate-300 font-mono">Retake</code>), previously attended section cohorts, desired section preferences, and classroom schedule slot choices.
              </li>
              <li>
                <strong className="text-slate-200">Advising & Approval Actions:</strong> Advisor feedback notes, approval or rejection determinations, timestamped review audit logs, and section reassignment history.
              </li>
              <li>
                <strong className="text-slate-200">Tuition Payment Verification Status:</strong> Student-declared payment status and Accounts Division verification indicators (<code className="text-slate-300 font-mono">Cleared</code>, <code className="text-slate-300 font-mono">Not Cleared</code>). <em>We never request, process, or store financial instruments, credit card numbers, or banking PINs.</em>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: How We Use Your Information */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span>2. Purpose & Use of Collected Data</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>Your data is processed strictly for authentic university operational needs:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <strong className="text-white block font-semibold">Academic Course Allocation</strong>
                <p className="text-[#8e9db2]">Verifying prerequisite completion, calculating term credit caps (up to 15.0 Cr), and allocating seats within fixed cohort caps (50 for Theory, 25 for Lab).</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <strong className="text-white block font-semibold">Faculty Advising Workflow</strong>
                <p className="text-[#8e9db2]">Connecting students directly to their officially assigned faculty advisor for formal application review, remarks, and approval.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <strong className="text-white block font-semibold">Routine Synchronization</strong>
                <p className="text-[#8e9db2]">Ensuring class timetables, examination schedules, and laboratory allocations avoid time and room collisions.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <strong className="text-white block font-semibold">Official Academic Notifications</strong>
                <p className="text-[#8e9db2]">Dispatching registration receipts, advisor decisions, and academic deadline notices via verified email channels.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Google API User Data Policy Compliance & Zero Monetization */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            <span>3. Zero Commercial Monetization & Google API Compliance</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Strict University Non-Commercial Commitment:</span>
            </div>
            <p>
              We do <strong>NOT</strong> sell, rent, monetize, license, or disclose student or faculty personal data to any external advertising platforms, data brokers, or commercial marketers.
            </p>
            <p>
              The application&apos;s use of information received from Google APIs adheres strictly to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline hover:text-sky-300"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Google Workspace user data is accessed solely for authenticating your university identity and routing advising requests.
            </p>
          </div>
        </section>

        {/* Section 4: Data Security and Storage */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <span>4. Database-Level Security & Access Control</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>We implement comprehensive architectural security safeguards:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#8e9db2]">
              <li>
                <strong className="text-slate-200">PostgreSQL Row-Level Security (RLS):</strong> Every database table enforces cryptographic isolation policies. Students can only inspect their own records; faculty advisors can only inspect their officially assigned advisees.
              </li>
              <li>
                <strong className="text-slate-200">Transport & Rest Encryption:</strong> All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Database storage is encrypted at rest.
              </li>
              <li>
                <strong className="text-slate-200">Role-Based Access Control (RBAC):</strong> Administrative permissions (semester scheduling, curriculum configuration, financial verification) are restricted exclusively to designated university officers.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Data Retention & User Rights */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>5. Data Retention & Academic Rights</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Academic registration records are retained in compliance with Daffodil International University institutional archive regulations. Enrolled scholars have the right to inspect their registration records, review advisor remarks, and report discrepancies directly to the Department Head or Office of the Registrar.
            </p>
          </div>
        </section>

        {/* Section 6: Contact Information */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            <span>6. Institutional Contact & Data Controller</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              If you have inquiries regarding this Privacy Policy, your academic records, or account authorization, please contact the University administration:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[#8e9db2]">
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <MapPin className="h-4 w-4 text-slate-400 mb-1" />
                <strong className="text-slate-200 block">Campus Address</strong>
                <span>{SITE_CONFIG.campus}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <Mail className="h-4 w-4 text-slate-400 mb-1" />
                <strong className="text-slate-200 block">Email Support</strong>
                <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-sky-400 hover:underline block truncate">
                  {SITE_CONFIG.contactEmail}
                </a>
                <a href={`mailto:${SITE_CONFIG.registrarEmail}`} className="text-sky-400 hover:underline block truncate">
                  {SITE_CONFIG.registrarEmail}
                </a>
              </div>
              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <Phone className="h-4 w-4 text-slate-400 mb-1" />
                <strong className="text-slate-200 block">Helpline</strong>
                <span>{SITE_CONFIG.phone}</span>
                <span className="block text-[11px] text-slate-500">Sunday - Thursday (9 AM - 5 PM)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div className="pt-4 flex items-center justify-between border-t border-[#1c263c]">
          <Link
            href="/login"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Sign In</span>
          </Link>
          <Link
            href="/terms"
            className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
          >
            View Terms of Service &rarr;
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c263c] bg-[#080c14] py-6 text-center text-xs text-[#8e9db2]">
        <div className="max-w-5xl mx-auto px-4 space-y-1.5">
          <p>© {new Date().getFullYear()} Daffodil International University. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <Link href="/" className="hover:text-slate-300">Home</Link>
            <span>•</span>
            <Link href="/privacy" className="text-slate-300 font-semibold">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
