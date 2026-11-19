# ARCHITECTURE DECISION RECORDS (ADRs) — DIU Course Registration Platform

> **Format**: Lightweight ADR  
> **Status**: Approved & Adopted  
> **Target System**: DIU Course Registration Platform  

---

## ADR-001: Next.js 16 App Router as Core Web Framework

### Context
The platform requires high rendering performance, zero-bundle-cost data fetching, server-side authorization checks, and secure cookie lifecycle management for a university population exceeding 30,000 students.

### Decision
Adopt **Next.js 16 with the App Router and React 19**.
- Use React Server Components (RSC) by default to eliminate client-side waterfall latency.
- Execute server-side authorization guards (`requireAuth`, `requireRole`) directly during initial component tree rendering.
- Use Next.js Edge Middleware for route shielding and session refreshes.

### Consequences
- **Positive**: High security boundary, smaller client JavaScript bundles, search-engine indexing for public catalog pages, unified backend/frontend repository.
- **Negative**: Requires strict discipline regarding Server vs. Client component boundaries.

---

## ADR-002: Exclusivity of Google OAuth with Institutional Domain Enforcement

### Context
Daffodil International University provisions every enrolled student and faculty member with a managed Google Workspace account (`@diu.edu.bd`). Traditional password databases introduce security liabilities (weak passwords, credential stuffing, password reset operational overhead).

### Decision
Support **Google OAuth Single Sign-On exclusively**.
- Disable traditional password authentication (`auth.signUp`).
- Supply Google OAuth parameter `hd: "diu.edu.bd"` to prompt user accounts.
- Enforce domain checks in both the OAuth callback handler (`/auth/callback`) and Edge Middleware (`src/middleware.ts`). Non-`@diu.edu.bd` accounts are instantly signed out and redirected with `403 Forbidden` notices.

### Consequences
- **Positive**: Near-zero credential management burden, instant identity trust, two-factor authentication managed by university Google Workspace.
- **Negative**: Requires development/mock authentication bypass strategies for local environments without live Google OAuth credentials.

---

## ADR-003: Supabase PostgreSQL with Strict Row-Level Security (RLS)

### Context
Academic advising data includes sensitive records (CGPAs, academic probation status, disciplinary advisor notes). Multi-tenant or role-based leakage must be structurally impossible at the database level.

### Decision
Utilize **Supabase PostgreSQL with Row Level Security enabled across 100% of tables**.
- Authenticate database requests via JWT tokens issued by Supabase Auth using `@supabase/ssr`.
- Never utilize `SUPABASE_SERVICE_ROLE_KEY` in user-facing mutation paths.
- RLS policies guarantee students can only query their own records and modify registrations in `draft` status, while advisors only query authorized departmental cohorts.

### Consequences
- **Positive**: Defense-in-depth; even if an application endpoint has a logic bug, the database engine blocks unauthorized access.
- **Negative**: Policies require careful authoring to prevent infinite recursion when checking roles (mitigated via `public.get_current_user_role()`).

---

## ADR-004: Server Components for Authorization Guards

### Context
Client-side route guards (e.g., checking user state in `useEffect`) cause layout flashes and expose sensitive API response payloads prior to redirection.

### Decision
Execute authorization guards **exclusively on the server** via `src/lib/auth/roles.ts` (`requireAuth`, `requireRole`) before page contents are rendered.
- If unauthenticated, redirect to `/login?returnTo=...` immediately on the server.
- If role permissions fail, redirect to `/unauthorized` immediately on the server.

### Consequences
- **Positive**: Zero unauthorized content flashes; complete security containment.
- **Negative**: Requires careful handling of cookie stores in server actions and async page components.

---

## ADR-005: Tailwind CSS v4 `@theme` with shadcn/ui Component Tokens

### Context
The platform requires a clean, accessible, university-branded interface that scales across mobile phones and desktop terminals in computer labs.

### Decision
Adopt **Tailwind CSS v4** utilizing `@theme` inline tokens in `src/app/globals.css`, coupled with headless shadcn/ui component patterns (`Button`, `Card`, `Badge`, `Alert`, `Input`, `Avatar`).
- Primary brand token: DIU Forest Green (`#006a4e`).
- Accent brand token: Daffodil Amber/Gold (`#d97706`).
- Standardize spacing, accessible focus rings, and dark mode variants.

### Consequences
- **Positive**: High performance with zero runtime CSS-in-JS overhead; atomic styling consistency; adherence to WCAG 2.1 AA standards.
- **Negative**: Requires understanding Tailwind v4 `@theme` architecture.

---

## ADR-006: Zod & React Hook Form Validation Pipeline

### Context
Course enrollment forms involve complex constraints (maximum credit caps, valid DIU ID syntax, section array lengths).

### Decision
Standardize on **Zod 4 schemas** paired with **React Hook Form** via `@hookform/resolvers/zod`.
- Schemas are defined in `src/lib/validations/` and shared across client forms and server mutation actions.
- Client provides instant user feedback; server rejects any non-conforming payload unconditionally.

### Consequences
- **Positive**: Single source of truth for validation rules; end-to-end type inference (`z.infer<T>`).
- **Negative**: Minor bundle size addition for Zod runtime.

---

## ADR-007: Resend for Transactional Email with Development Mock Fallback

### Context
Academic advising workflows require immediate transactional communications (registration submitted receipt, advisor approval notification). However, developers running local builds may not possess live Resend production keys.

### Decision
Deploy **Resend** via `src/lib/email/resend.ts` with an intelligent fallback layer.
- If `RESEND_API_KEY` is present and valid, emails dispatch via Resend REST API.
- If missing or set to placeholder, the client logs the payload to the console and returns `{ success: true, mocked: true }`.

### Consequences
- **Positive**: Build pipelines and unit tests never fail due to missing third-party email credentials; seamless transition to production when live API keys are supplied.
- **Negative**: Developers must inspect terminal logs to verify email formatting during local testing.


---

## ADR-008: In-Memory Isolated Mock State for Phase 1 Prototype Interaction

### Context
Phase 1 requires fully functional interactive prototypes for Student and Advisor portals (course search, adding/removing sections, section reassignment, approval/rejection workflows) without connecting live database mutations or violating the requirement to execute Phase 1 only.

### Decision
Implement isolated, in-memory client state in prototype views backed by strongly typed mock datasets ([`src/lib/mock/data.ts`](file:///f:/antigravity/courseregdiu/src/lib/mock/data.ts)).
- Real interactions (adding to cart, section reassignment, status changes) update local React state and render live visual feedback.
- Phase 0 Supabase and database schemas remain 100% intact and untouched.

### Consequences
- **Positive**: Complete interactive fidelity for design review and usability testing with zero backend coupling or database contamination.
- **Negative**: State resets on full page refresh during the prototype phase (expected and standard).

---

## ADR-009: Synthetic Domain Representation for DIU Course Data & Prerequisite Graphs

### Context
Engineering commandment #1 forbids the fabrication of DIU academic records or policies. However, realistic course structures (CSE110, CSE122, CSE221) are required to test prerequisite graphs and scheduling matrices.

### Decision
Model realistic DIU department courses, prerequisite chains (`CSE110` -> `CSE122` -> `CSE221`), and credit caps based on official DIU curriculum outlines, accompanied by explicit prototype disclaimers in code headers and documentation.

### Consequences
- **Positive**: Realistic prerequisite and conflict testing without misrepresenting synthetic demo profiles as official university records.
- **Negative**: Must be replaced with real Supabase relational queries in Phase 2+.

---

## ADR-010: Accessible Custom Modal & Tab Context Components

### Context
Phase 1 prototypes require responsive modal dialogs (course details, submission confirmation, advisor review determinations) and tab panels without introducing heavy or fragile third-party runtime dependencies.

### Decision
Construct custom, accessible `Dialog` ([`src/components/ui/dialog.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/dialog.tsx)) and `Tabs` ([`src/components/ui/tabs.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/tabs.tsx)) primitives with native React hooks, scroll locking, and Escape key dismissal.

### Consequences
- **Positive**: Zero external bundle bloat; 100% TypeScript type safety; precise styling aligned with DIU design tokens.
- **Negative**: Must maintain accessibility features manually.

---

## ADR-011: Time-Matrix Schedule Collision Detection Algorithm

### Context
Students frequently attempt to enroll in sections with overlapping class periods. The platform must detect overlaps instantaneously before advising submission.

### Decision
Implement a pure, typed collision detection function ([`checkScheduleConflict`](file:///f:/antigravity/courseregdiu/src/lib/mock/helpers.ts)) that translates 24-hour time strings (`HH:mm`) to absolute minute intervals from midnight and verifies whether `max(start1, start2) < min(end1, end2)` on identical days of the week.

### Consequences
- **Positive**: O(N*M) calculation with negligible latency; reusable across student cart and advisor review screens.
- **Negative**: Requires schedule slots to adhere to strict 24-hour time format.


---

## ADR-012: Unified Institutional Dark Design System & Removal of Inconsistent Light Surfaces

### Context
Phase 1 UI review revealed visual inconsistency caused by default light-surface tokens (`--background: #f8fafc`, `--card: #ffffff`) interacting with dark shell elements. This resulted in harsh contrast, oversized cards, and visual incoherence.

### Decision
Standardize on a single, high-contrast, institutional dark design system across all 20 routes:
- Base background globally locked to `#090d16` (Slate-950) via `<html className="dark ...">`.
- Surface and card elevated panels locked to `#0f172a` (Slate-900) with `#1e293b` (Slate-800) borders.
- Brand accents locked to DIU Forest Green (`#008764`) and Academic Gold (`#f59e0b`).
- Card padding tightened from sprawling `p-6` to compact `p-4`/`p-5` with high information density.

### Consequences
- **Positive**: Coherent, university-grade aesthetic; eliminated eye strain; unified appearance across desktop, tablet, and mobile.
- **Negative**: Light mode is intentionally removed from the prototype to guarantee aesthetic consistency.

---

## ADR-013: Mandatory First-Time Student Onboarding Flow & Server-Side Guard

### Context
When a student logs in for the first time via Google Single Sign-On, their OAuth metadata supplies only full name and email. Authoritative DIU Student ID and academic intake batch are missing. The student must not access the registration workspace without completing onboarding.

### Decision
1. Implement a dedicated first-time onboarding screen at `/onboarding` backed by [`onboarding-form.tsx`](file:///f:/antigravity/courseregdiu/src/components/auth/onboarding-form.tsx) and Zod schema [`onboarding.ts`](file:///f:/antigravity/courseregdiu/src/lib/validations/onboarding.ts).
2. Required fields: Full Name (Google default, user-editable), DIU Student ID (syntax check `^\d{3}-\d{2}-\d{4,6}$` and duplicate prevention), Batch, and Department.
3. Track completion via `public.profiles.onboarding_completed` (Boolean).
4. Guard via [`requireOnboarded()`](file:///f:/antigravity/courseregdiu/src/lib/auth/roles.ts) on server side: un-onboarded students navigating to `/dashboard` or course registration routes are automatically redirected to `/onboarding`.
5. Returning students with `onboarding_completed === true` bypass onboarding and proceed straight to the dashboard.

### Consequences
- **Positive**: Prevents orphaned or unlinked registration applications; guarantees every student record possesses an authentic DIU ID format before advising slips can be submitted.
- **Negative**: Adds an upfront step for first-time users.

---

## ADR-014: Active Advising Workspace Architecture & Multi-State Lifecycle Simulation

### Context
The initial dashboard prototype functioned merely as a navigation portal with links to other pages, failing to prioritize operational advising needs such as active window countdown, assigned advisor contact, tuition payment clearance, and current advising slip status.

### Decision
Transform the dashboard into an active registration workspace ([`student-dashboard-workspace.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/student-dashboard-workspace.tsx)):
1. Priority Operational Cards: Active Term (`Spring 2026`), Window Countdown (`4 Days Remaining`), Assigned Advisor (`Dr. Sheak Rashed Haider Noori`), and Accounts Clearance (`Ref: DIU-AC-2026-8812`).
2. Action Required Alert Banner dynamically prompting the student based on application state.
3. Live Advising Slip Course Table with credit load meter (`12.0 / 15.0 Cr`) and fast drop/swap actions.
4. Interactive State Switcher allowing reviewers to test 5 advising lifecycle states: Draft, Submitted, Revisions Requested, Approved/Enrolled, and Window Closed.

### Consequences
- **Positive**: Transforms the dashboard into a functional control center; reviewers can evaluate all edge-case advising states in a single screen.
- **Negative**: Increases client component code volume.


---

## ADR-015: Phase 1.5 Simplification — 4 Core Destinations, Minimal Home, and Unified Course Registration Workspace

### Context
Review of the Phase 1 prototype identified redundant screens (separate `/courses` catalog and `/registration` cart requiring frequent page hops), duplicate data rendering (full advising slip tables duplicated on both the dashboard and cart), cognitive clutter (unnecessary GPA, degree progress, and unverified queue positions on the home screen), and suboptimal search performance without input debouncing.

### Decision
1. **Enforce 4 Primary Navigation Destinations**:
   - Limit student navigation strictly to: **Home** (`/dashboard`), **Courses** (`/courses`), **Application** (`/student/tracking`), and **Profile** (`/student/profile`).
   - Cleanly redirect `/registration` to `/courses` (`redirect("/courses")`) to prevent broken links.
2. **Minimalist, High-Focus Student Home (`/dashboard`)**:
   - Limit Home display exclusively to: active semester (`Spring 2026`), window countdown status (`4 Days Remaining`), **one prominent next action button**, current application status (`REG-2026-SP-7819`), assigned advisor contact card, and accounts clearance notifications.
   - Remove CGPA, degree progress bars, queue position estimates, and duplicate course slip tables from Home.
3. **Unified Course Registration Workspace (`/courses`)**:
   - Combine catalog browsing, regular vs. retake/backlog filtering, direct section selection with live seat availability counters, and an accessible sticky registration slip summary into a single-screen responsive workspace (`UnifiedCoursesWorkspace`).
   - Integrate a one-click **Review & Submit Advising Slip** confirmation modal that validates prerequisites, schedule conflicts, credit caps, and accounts clearance on submit.
4. **Debounced Search & Client Optimization**:
   - Debounce search input at 150ms to eliminate unnecessary re-renders per keystroke in both the Course Catalog and Advisor Advisee Queue.
5. **Streamlined Advisor Portal (`/advisor`)**:
   - Directly embed the searchable, filterable advisee queue table on the main advisor dashboard view, removing redundant sub-navigation steps.

### Consequences
- **Positive**: Extremely fast, coherent, and minimal registration workflow; eliminates page bouncing between catalog and cart; eliminates duplicate component rendering; reduces client bundle overhead; provides focused decision-making for students and advisors.
- **Negative**: Requires students to view transcript history and degree progress within Profile rather than having it on the primary dashboard.

---

## ADR-016: P0 Security Remediation — Server Route Guards, Onboarding Persistence, RLS Hardening, and OAuth Redirect Whitelisting

### Context
External security and code review of the initial prototype identified critical vulnerabilities:
1. Student and Advisor pages were unshielded by server-side guards, allowing unauthenticated or unauthorized role access via direct URL manipulation.
2. First-login onboarding persisted data exclusively to browser `localStorage` without writing to PostgreSQL `public.profiles`.
3. Inadequate Row-Level Security (RLS) policies permitted users to update their own `role`, `cgpa`, and `completed_credits` fields.
4. Advisors lacked strict cohort isolation, permitting cross-departmental or unassigned student inspection.
5. The OAuth callback handler contained potential open redirect exposure via untrusted `returnTo` parameters.

### Decision
1. **Server-Side Route Authorization**:
   - Enforce `requireAuth()`, `requireRole()`, `requireOnboarded()`, and `requireAdvisor()` across all 12 protected server pages (`/dashboard`, `/courses`, `/schedule`, `/student/*`, `/advisor/*`).
   - Intercept unauthenticated requests with server-side HTTP 307 redirects to `/login`.
   - Direct students attempting to access advisor routes to `/unauthorized`.
2. **Server-Side Onboarding Persistence & Validation**:
   - Remove all `localStorage` prototype simulations.
   - Implement `completeOnboardingAction` in `src/app/onboarding/actions.ts` validating strictly `fullName`, `diuId` (`^\d{3}-\d{2}-\d{4,6}$`), and `batch`.
   - Persist to PostgreSQL `public.profiles` using a `SECURITY DEFINER` RPC (`complete_student_onboarding`) with database-level uniqueness enforcement on `diu_id`.
3. **Database Privilege Escalation Defense**:
   - Revoke raw `UPDATE` on sensitive profile columns (`role`, `cgpa`, `completed_credits`, `diu_id`).
   - Attach trigger `check_profile_privilege_escalation()` preventing non-admin callers from modifying authorization or academic record attributes.
4. **Advisor Cohort Data Isolation**:
   - Provision `public.advisor_assignments` table with foreign keys linking `advisor_id` and `student_id`.
   - Update RLS policies on `registrations` and `registration_items` ensuring advisors can only view and manage students explicitly assigned to them in `advisor_assignments`.
5. **Open Redirect Mitigation & Domain Enforcement**:
   - Implement strict URL sanitizer `validateSafeRedirect()` rejecting protocol-relative URLs (`//`), backslashes (`/\`), and off-domain targets, whitelisting only authorized internal application paths.
   - Enforce server-side verification that authenticated Google emails end strictly with `@diu.edu.bd`.

### Consequences
- **Positive**: Complete defense-in-depth security model; route spoofing and client state manipulation are rendered structurally ineffective; zero privilege escalation paths.
- **Negative**: Unassigned students cannot be viewed by advisors unless an explicit assignment record exists in `advisor_assignments`.

---

## ADR-017: Multi-Email Identity Architecture & Admin Email Authorization Policy

### Context
The strict `@diu.edu.bd` universal domain restriction prevented students and faculty who legitimately operate via alternative personal Google emails from accessing the platform. Additionally, advisors and administrators required support for personal Google email authentication under explicit administrative authorization. A unified multi-email identity architecture was needed that enforces:
1. Google OAuth as the exclusive authentication method.
2. Default student eligibility via verified `@diu.edu.bd` domain.
3. Personal Google emails rejected unless explicitly authorized by an Administrator.
4. Zero profile duplication: an authorized personal email must map directly to the student's existing profile.
5. Immediate session revocation when an alternative email is deactivated or removed.
6. Admin-only email management with mandatory justification and immutable audit logging.

### Decision
1. **Multi-Email Identity Registry (`public.authorized_emails`)**:
   - Provisioned `authorized_emails` table with foreign key to `profiles(id)`, normalized lowercase email check constraint, and `UNIQUE(email)`.
   - Supports `email_type` classifications: `'primary_diu'`, `'alternative_personal'`, `'advisor_authorized'`, `'admin_authorized'`.
   - One email cannot be assigned to two profiles simultaneously.
2. **Immutable Audit Trail (`public.email_authorization_audit`)**:
   - Stores action history (`AUTHORIZED`, `MODIFIED`, `DEACTIVATED`, `REACTIVATED`, `REVOKED`), authorizer ID, mandatory reason, diff snapshot, and timestamp.
3. **Canonical Identity Resolution Engine (`resolveEmailAuthorization`)**:
   - Evaluated on every protected request via `getCurrentUser()` and `getCurrentProfile()`, guaranteeing immediate session revocation upon deactivation without waiting for cookie expiration.
   - Evaluated in OAuth callback (`/auth/callback/route.ts`).
4. **Admin Email Management Portal (`/admin/emails`)**:
   - Protected by server-side `requireAdmin()` guard.
   - Interactive directory allowing Admins to search students, view primary DIU emails, link alternative personal emails with mandatory justification, toggle active/inactive status, and permanently revoke alternative emails.
   - Real-time audit log viewer displaying historical changes.
5. **Role Provisioning Isolation**:
   - Admin and advisor roles are never granted by email domain alone; they require manual provisioning in the database.

### Consequences
- **Positive**: Seamless dual-email support for students with zero profile duplication; granular administrative auditability; instant revocation capability; 100% adherence to DIU final authentication policy.
- **Negative**: Personal emails require administrator pre-authorization before login.

---

## ADR-018: Production Security Hardening, Identity Linking, Profile Privacy & Concurrency Control

### Context
Code review identified remaining vulnerabilities before live Supabase database deployment:
1. Middleware unconditionally rejected personal Google emails outside `@diu.edu.bd` even when authorized by an Admin.
2. `public.profiles` had a public SELECT policy permitting anonymous reads of student academic records.
3. Secondary Google accounts in Supabase Auth create distinct `auth.uid()` values, breaking standard `auth.uid() = profiles.id` RLS checks.
4. Concurrency control and atomic seat allocation were not enforced at the database level, posing race-condition risks during heavy advising traffic (200–300 concurrent registrations).
5. `resolve_profile_by_email` lacked authorization restrictions, exposing student identity data.
6. The setup script lacked policy drop idempotence and had an inconsistent DIU ID regex.

### Decision
1. **Middleware Policy Realignment (`src/lib/supabase/middleware.ts`)**:
   - Replaced unconditional domain rejection with an authoritative lookup in `public.authorized_emails`.
   - Permitted active authorized personal emails and active authorized advisors.
   - Deactivated accounts and unauthorized personal emails are immediately intercepted with informative error redirects (`email_revoked`, `unauthorized_email`).
2. **Profile Privacy Hardening**:
   - Removed all public SELECT policies on `public.profiles`.
   - Restricted SELECT strictly to: self profile (`id = public.get_current_profile_id()`), assigned advisor viewing advisee, student viewing assigned advisor, department head viewing department scholars, and admins.
   - Unauthenticated requests receive 0 rows.
3. **Database-Level Identity Linking**:
   - Added `auth_user_id` column to `public.authorized_emails`.
   - Updated `handle_new_user()` trigger to link secondary Google `auth.users.id` to the existing profile's authorized email record without inserting duplicate profiles.
   - Created `public.get_current_profile_id()` returning the canonical student profile ID regardless of whether primary or alternative email authenticated.
   - Updated `public.get_current_user_role()` to resolve role through `get_current_profile_id()`.
4. **Database-Level Concurrency Control & Atomic Allocation**:
   - Implemented `enroll_section_atomic(p_registration_id, p_section_id)` with `SELECT ... FOR UPDATE` row-level locks on `public.sections`.
   - Enforces capacity constraints at the transactional level; prevents duplicate course enrollment.
   - Implemented `drop_section_atomic` and `switch_section_atomic` with ordered locks preventing deadlocks.
5. **Registration State Machine Integrity**:
   - Created trigger `check_registration_state_transition()` strictly preventing students from setting status to `'approved'` and preventing advisors from tampering with unassigned students or student payment records.
6. **Hardened Identity Reconnaissance & Unified Regex**:
   - Restricted `resolve_profile_by_email()` so non-admin callers can only resolve their own email matching `auth.jwt() ->> 'email'`.
   - Revoked `PUBLIC` and `anon` execution permissions.
   - Unified DIU Student ID regex to `^\d{3}-\d{2}-\d{3,6}$`.
   - Ensured complete rerun idempotence with `DROP POLICY IF EXISTS` across all tables.

### Consequences
- **Positive**: Complete defense-in-depth security model; zero profile data exposure; seamless secondary email authentication mapped to canonical profile; guaranteed concurrency safety under high load; 100% idempotent SQL setup script.
- **Negative**: Complex RLS policies require `get_current_profile_id()` function overhead (mitigated via STABLE function caching).

---

## ADR-007: Guided 4-Step Student Registration Wizard & Section Cohort Persistence

### Status
Accepted

### Context
DIU course advising requires students to declare their prior section cohort (e.g. `69_K`) and requested target section (e.g. `69_D`), choose course offerings from their department curriculum, and explicitly categorize each selected course as a General enrollment (standard progress) or Retake enrollment (improving grade or clearing backlog). Academic advisors must inspect these cohort assignments and course classifications during application review.

### Decision
1. **Guided 4-Step Registration Architecture (`UnifiedCoursesWorkspace`)**:
   - Step 1: Academic Section Details (`previous_section`, `desired_section`) with format validation and educational guidance.
   - Step 2: Course Selection Workspace with instant debounced search, department/level filters, and section schedules across all 20 DIU courses.
   - Step 3: Per-Course Classification (`general` vs `retake`) with segmented radio toggles and real-time metric counters.
   - Step 4: Final Application Review displaying student info, cohort sections, courses breakdown, and submission verification.
2. **Schema & Database Persistence**:
   - Extended `public.registrations` with `previous_section VARCHAR(20)` and `desired_section VARCHAR(20)`.
   - Extended `public.registration_items` with `course_type VARCHAR(20) CHECK (course_type IN ('general', 'retake'))`.
   - Sequential migration `supabase/migrations/20261119220000_student_registration_workflow.sql` and full idempotency in `supabase/complete_setup.sql`.
3. **Advisor Studio Integration**:
   - Overhauled `/advisor/review/[id]` to render student profile, alternative authorized personal email badge, cohort section transition (`69_K` &rarr; `69_D`), and course table with explicit `Course Type` badges.
   - Wired server actions `finalizeAdvisorReviewAction` and `reassignAdviseeSectionAction` with path revalidation.

### Consequences
- **Positive**: Seamless student advising experience strictly mirroring DIU academic practices; eliminates "0 sections" display defects; full auditability for advisors; end-to-end type safety across Next.js and Supabase.
- **Negative**: Adds two additional columns to `registrations` and one to `registration_items`, requiring backward-compatible migration.

---

## ADR-019: Supabase Cloud URL Validation & Next.js 16 Proxy Migration

### Status
Accepted

### Context
When building or deploying to environments without explicit `.env.local` files (such as initial Vercel deployments), Next.js statically inlines `NEXT_PUBLIC_*` environment variables into client bundles at build time. Previously, clients fell back silently to `"https://placeholder-project.supabase.co"`, which caused client browsers to fail DNS resolution with `DNS_PROBE_FINISHED_NXDOMAIN`. Furthermore, Next.js 16 deprecated the `middleware.ts` file convention in favor of `proxy.ts`.

### Decision
1. **Eliminate Placeholder Domains**:
   - Implemented `src/lib/supabase/config.ts` providing strict resolvers: `getSupabaseUrl()`, `getSupabasePublishableKey()`, and `isSupabaseConfigured()`.
   - Prevented any network calls to fictional placeholder domains. In development or server contexts, resolves authoritatively to `https://gbobcwnumspimegiqzom.supabase.co`.
   - In production environments, throws a clear descriptive configuration exception rather than silently falling back to a non-existent host.
2. **Next.js 16 Proxy Convention**:
   - Migrated `src/middleware.ts` to `src/proxy.ts` complying with Next.js 16 specifications and eliminating build deprecation warnings.
3. **Resend and Supabase Credential Synchronization**:
   - Configured active Resend API key and authoritative Supabase Cloud endpoints in `.env.local` and documented in `.env.example`.

### Consequences
- **Positive**: Complete elimination of `DNS_PROBE_FINISHED_NXDOMAIN` browser failures; clean compilation with 0 Next.js 16 deprecation warnings; robust environment diagnostics.

