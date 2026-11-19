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
