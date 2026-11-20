import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowLeft, BookOpen, ShieldCheck, AlertCircle, FileText, CheckCircle2, Mail, MapPin } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms of Service | DIU Course Registration System",
  description: "Official Terms of Service and Academic Regulations for Daffodil International University (DIU) Course Registration and Advising System.",
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/80 text-blue-400 text-xs font-mono font-medium">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Academic Regulations & Use Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-[#8e9db2] leading-relaxed">
            Daffodil International University (DIU) Course Registration & Academic Advising Management System
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Effective Date: November 20, 2026</span>
            <span>•</span>
            <span>Governing Body: DIU Academic Council</span>
            <span>•</span>
            <span className="text-emerald-400">Official Institutional Regulations</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="p-5 rounded-2xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Welcome to the Daffodil International University (&quot;DIU&quot;) Course Registration and Academic Advising Information System (&quot;the System&quot;). These Terms of Service (&quot;Terms&quot;) constitute a binding academic agreement between you and Daffodil International University.
          </p>
          <p>
            By accessing, authenticating with Google Workspace, submitting registration drafts, or conducting advising reviews on this application (accessible at{" "}
            <Link href="/" className="text-sky-400 underline hover:text-sky-300 font-mono">
              https://courseregdiu.asf.run/
            </Link>
            {" "}or any designated official university domain), you agree to comply with and be bound by these Terms and the official DIU Student Handbook.
          </p>
        </div>

        {/* Section 1: Authorized Access & Institutional Identity */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>1. Authorized User Accounts & Institutional Authentication</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Access to this system is restricted exclusively to authorized university stakeholders:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#8e9db2]">
              <li>
                <strong className="text-slate-200">Institutional Google Accounts:</strong> All primary student and advisor authentications must route via verified institutional Google Workspace domains (<code className="text-emerald-400 font-mono">@diu.edu.bd</code>). Personal Google accounts (<code className="text-slate-300 font-mono">@gmail.com</code>) are rejected at middleware boundaries unless specifically registered as an authorized administrative exception by the Registrar.
              </li>
              <li>
                <strong className="text-slate-200">Credential Responsibility:</strong> You are responsible for safeguarding your institutional Google credentials. You may not share, transfer, or allow any other individual to access your account.
              </li>
              <li>
                <strong className="text-slate-200">Role-Based Entitlements:</strong> Students may only view and submit their own course applications. Faculty advisors may only review applications of their officially assigned advisees. Department heads and administrators operate within strict departmental oversight boundaries.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Academic Regulations & Course Registration Policies */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span>2. Academic Council Registration Regulations</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>Every course registration application submitted through this system must adhere to DIU academic ordinances:</p>
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>A. Fixed Section Seat Capacities</span>
                </div>
                <p className="text-[#8e9db2]">
                  To maintain rigorous pedagogical standards, DIU Academic Council mandates fixed section capacities: <strong>50 seats maximum for Theory lecture courses</strong> and <strong>25 seats maximum for Laboratory practical courses</strong>. The system strictly prohibits automated over-enrollment.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>B. Prerequisite Enforcement</span>
                </div>
                <p className="text-[#8e9db2]">
                  Students may not enroll in advanced courses without successfully completing all designated prerequisite courses, unless a formal prerequisite waiver has been approved in writing by the Department Head.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>C. Credit Limits & Term Cap</span>
                </div>
                <p className="text-[#8e9db2]">
                  The standard undergraduate registration limit is 15.0 credit hours per regular semester. Overload registration is subject to advisor validation and institutional GPA standing thresholds.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>D. Mandatory Advisor Determination</span>
                </div>
                <p className="text-[#8e9db2]">
                  Submission of a course registration draft by a student does not constitute finalized enrollment. Enrollment is finalized only when your designated faculty advisor formally approves the application.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Tuition Clearance & Financial Regulations */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <span>3. Tuition Clearance & Financial Standing</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Registration clearance requires compliance with DIU financial guidelines. Students must complete semester tuition dues before the final registration deadline. While students may declare their payment status during Step 3 of registration submission, official enrollment confirmation remains contingent on Accounts Division clearance.
            </p>
          </div>
        </section>

        {/* Section 4: Prohibited Conduct & Penalties */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>4. Prohibited Conduct & Disciplinary Action</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>Users must not engage in any of the following unauthorized activities:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#8e9db2]">
              <li>Deploying automated scripts, bots, scrapers, or browser extensions to manipulate seat reservations or flood registration endpoints.</li>
              <li>Attempting to bypass PostgreSQL Row-Level Security (RLS) policies, impersonate another student or advisor, or escalate account privileges.</li>
              <li>Fabricating student IDs, academic grades, or prerequisite completion claims.</li>
              <li>Interfering with system availability or performing denial-of-service (DoS/DDoS) actions against university infrastructure.</li>
            </ul>
            <p className="text-rose-300 font-semibold pt-1">
              Violations are subject to disciplinary action by the DIU Proctorial Board, up to and including semester suspension or permanent expulsion from the University.
            </p>
          </div>
        </section>

        {/* Section 5: Availability & System Modifications */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>5. System Availability & Routine Scheduling</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              The University endeavors to maintain uninterrupted availability during active registration windows. However, scheduled maintenance, emergency security patches, or server routine adjustments may occur. Course offerings, instructor assignments, and room allocations remain subject to departmental scheduling adjustments.
            </p>
          </div>
        </section>

        {/* Section 6: Governing Law & Jurisdiction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>6. Governing Law & Institutional Jurisdiction</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              These Terms of Service are governed by and construed in accordance with the laws of Bangladesh and the statutory charter of Daffodil International University. Any academic dispute arising hereunder shall fall within the primary jurisdiction of the DIU Academic Council.
            </p>
          </div>
        </section>

        {/* Section 7: Inquiries */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            <span>7. Academic Inquiries & Support</span>
          </h2>
          <div className="p-5 rounded-xl bg-[#121827] border border-[#1c263c] space-y-2 text-xs text-[#8e9db2]">
            <p className="text-slate-200 font-semibold">Office of the Registrar</p>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>Email: <a href={`mailto:${SITE_CONFIG.registrarEmail}`} className="text-sky-400 hover:underline">{SITE_CONFIG.registrarEmail}</a></span>
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
            href="/privacy"
            className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
          >
            View Privacy Policy &rarr;
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
            <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="text-slate-300 font-semibold">Terms of Service</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
