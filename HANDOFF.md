# HANDOFF — Admin Panel, Advisor Roster Importer & Assignment Management

> **From**: Lead Software Architect & Full-Stack Engineer  
> **To**: Repository Owner / Database Administrator  
> **Repository**: `courseregdiu` (`https://github.com/siaym/courseregdiu`)  
> **Handover Date**: November 2026  
> **Pending Manual Action**: Apply `supabase/migrations/20261125000000_admin_panel_foundation.sql` to remote Supabase (`gbobcwnumspimegiqzom`) after review. Remote database was NOT modified automatically.

---

## 1. Handover Summary

The **Remote Supabase Cloud Migration, Schema Verification, Dynamic Email Authentication & Production Hardening** cycle has been completed with full automated test coverage (63/63 tests passing across 7 test suites) and zero build warnings:

0. **Remote Supabase Cloud Migration & Live Verification (`gbobcwnumspimegiqzom`)**:
   - **Target Project**: Supabase project `gbobcwnumspimegiqzom` deployed in AWS Singapore (`aws-1-ap-southeast-1.pooler.supabase.com:5432`).
   - **Applied Migrations**: All 11 migrations pushed and synchronized to date:
     1. `20261118000000_phase0_init.sql`
     2. `20261119000000_student_onboarding.sql`
     3. `20261119110000_security_remediation_p0.sql`
     4. `20261119123000_authorized_email_identities.sql`
     5. `20261119140000_p0_security_and_identity_remediation.sql`
     6. `20261119220000_student_registration_workflow.sql`
     7. `20261119230000_diu_section_capacity_rules.sql`
     8. `20261120000000_batch_semester_courses.sql`
     9. `20261120010000_payment_clearance.sql`
     10. `20261123180000_system_settings.sql`
     11. `20261123230000_fix_rls_grants_and_seed_data.sql`
   - **PostgreSQL RLS Infinite Recursion Elimination**: Resolved the recursive policy evaluation on `public.profiles` by declaring `get_current_profile_id()`, `get_current_user_role()`, `get_current_user_department()`, and `is_assigned_advisor_or_advisee()` with `SECURITY DEFINER SET search_path = public SET row_security = off`.
   - **Schema Privilege Grants**: Granted `anon`, `authenticated`, and `service_role` appropriate schema and table permissions so PostgREST allows table queries through to RLS policies without returning `42501 permission denied`.
   - **PostgREST Relationship Disambiguation (`PGRST201`)**: Explicitly specified `profile:profiles!authorized_emails_profile_id_fkey(*)` in `src/lib/auth/email-authorization.ts` to disambiguate multiple foreign keys to `profiles`.
   - **Seeded Academic Master Data**:
     - Departments: CSE, SWE, EEE, BBA, ENG.
     - Active Semester: Spring 2027 (`a0000000-0000-0000-0000-000000000001`).
     - Master Courses: 14 DIU subjects with credit distributions and prerequisite codes.
     - Cohort Batch Configurations: Batch 69, Batch 60, Batch 59 course assignments.
     - Section Offerings: Section 69_D, 69_K (Theory, 50 seats cap), Section 69_D1, 69_D2 (Lab, 25 seats cap), Section 60_A, 60_A1, 60_A2.
     - System Settings: `email_auth_enabled` (true), `demo_bypass_enabled` (true).
   - **15-Table Status Check**: All 15 database tables verified directly via `@supabase/supabase-js` returning status `OK`.

1. **Dynamic Email Authentication & Admin Toggle Controls**:
   - **Multi-Method Login Screen (`/login`)**: Integrated Email Authentication alongside institutional Google OAuth (`@diu.edu.bd`). Provides both 6-digit One-Time Passcode (OTP / Magic Link) and password sign-in tabs.
   - **Admin Portal Feature Controls (`/admin`)**: Interactive toggle card (`AdminAuthSettingsCard`) in the Administration Portal allowing administrators to turn Email Authentication **ON** or **OFF** at will with instantaneous server action propagation (`toggleEmailAuthAction`).
   - **Fail-Closed Policy Enforcement**: When Email Authentication is turned OFF, all server-side email authentication actions (`requestEmailOtpAction`, `verifyEmailOtpAction`, `signInWithEmailPasswordAction`) fail closed and reject attempts with descriptive feedback.
   - **Institutional Email Authorization Guarantee**: Every email login attempt authoritatively resolves through `resolveEmailAuthorization`, strictly verifying that only `@diu.edu.bd` accounts or Admin-authorized alternative personal emails are permitted. Deactivated accounts are rejected.
   - **Faculty Demo Mode Bypass Controls**: Admin toggle allowing developer / faculty presentation demo bypass to be enabled or disabled dynamically without changing code.
   - **Dedicated Regression Suite (`tests/email-auth-and-admin-toggle.test.mjs`)**: 12/12 automated test scenarios covering system settings inspection, admin toggles, fail-closed enforcement when disabled, authorized OTP dispatch, and production demo isolation. Total project test suite expanded to 63/63 passing tests.
   - **Dev Cookie Impersonation Elimination**: In `src/lib/auth/roles.ts` and `src/lib/supabase/middleware.ts`, when `process.env.NODE_ENV === "production"`, `diu_session_role` is strictly ignored. Only verified Supabase users (`supabase.auth.getUser()`) with database authorization profiles can access protected routes.
   - **Mock Authorization Fallback Removal**: In `src/lib/auth/email-authorization.ts`, database query failures and outages in production fail closed (`authorized: false, reason: "DATABASE_UNAVAILABLE"`) and never inspect development mock data.
   - **Fail-Closed Mutations**: Onboarding profile creation (`src/app/onboarding/actions.ts`), course registration submission (`src/app/courses/actions.ts`), and advisor reviews (`src/app/advisor/actions.ts`) reject submissions if database writes fail in production.
   - **Advisor Assignment Isolation**: Advisors can only review or modify sections for registrations assigned to them.
   - **Automated Regression Suite**: Created `tests/production-security-audit.test.mjs` verifying production guard behaviors across 7 core security tests. Total test suite expanded to 51/51 passing tests.

1. **Student Course Selection Workspace (`/courses`)**:
   - Removed "All Departments" and "All Academic Levels" dropdown filters.
   - Cohort batch gating: Students in Batch 69 see only Batch 69 courses for active semester `Spring 2027` (e.g. `CSE110`, `CSE111`, `MAT101`, `ENG101`, `PHY111`).
   - Single prominent debounced course search by code or title with instant keyboard reset.
   - Independent General / Retake classification per selected course (all initially defaulted to General).
   - Removed routine/room/faculty noise from the course selection list and sidebar cart.
   - Fixed seat capacity caps: 50 seats for theory courses, 25 seats for laboratory courses.
   - Server-side batch course validation in `submitStudentRegistration` rejecting unconfigured courses and duplicate submissions.

2. **Admin Batch Course Studio (`/admin/curriculum`)**:
   - Interactive semester and cohort batch selector (Batch 69, Batch 60, Batch 70, Batch 59).
   - Live roster of configured courses for each batch with credit load tracking.
   - Searchable master catalog to add courses with server action persistence.
   - One-click course removal from batch configuration.

3. **Authoritative Tuition Payment Clearance Workflow (`/admin/payments`)**:
   - Decoupled self-declared payment checks from official Admin verification.
   - 3 distinct statuses: `Awaiting Verification`, `Cleared`, `Not Cleared` (Financial Hold).
   - Admin Payment Clearance Center with search, status filtering tabs, update dialog with mandatory administrative audit notes.
   - Immutable audit log (`payment_clearance_audit`) tracking every status modification with actor ID, timestamp, and notes.
   - Real-time clearance badges across Student Dashboard, Courses Workspace, Tracking view, and Advisor Review Studio.

4. **Dedicated University Administration Portal (`/admin`)**:
   - Live operational dashboard displaying batch curriculum stats, payment clearance metrics, and quick links to admin modules.
   - Clean enterprise dark layout with Swiss Modernism design tokens from `ui-ux-pro-max`.

5. **Advisor Review Studio Hierarchy Optimization & Robustness (`/advisor/review/[id]`)**:
   - Redesigned **1. Student Information** to prioritize DIU Student ID (prominent badge), student name, department & batch, followed directly by primary contact channels (institutional email, phone number, and verified alternative email).
   - Removed extraneous `Passed: Total Cr` and `Proposed: Max Cr` statistic boxes from the student header.
   - Promoted **Payment Information** to **Section 2** (immediately after Student Information), providing immediate visibility into tuition accounts clearance before reviewing cohort sections (`Section 3`), course selections (`Section 4`), and submitting determinations (`Section 5`).
   - Fixed undefined section runtime error by reconciling lab subgroup section IDs (`60_A1`, `69_D1`) in advisee queue data and adding defensive fallbacks across credit calculation and section reassignments.

6. **Student Academic Section Details Redesign & Live Seat Monitor (`/courses` Step 1)**:
   - **Laboratory Subgroup Option (`Lab D1` / `Lab D2`, Cap 25)**: Modeled DIU policy where 50-student theory cohorts (e.g. `69_D`) split into two 25-capacity lab subgroups (`Lab D1` and `Lab D2`). Provided interactive subgroup selection cards in Step 1 and 1-click toggles in Step 2 Course Selection.
   - **Elimination of Room Column**: Removed the unnecessary room column from the scheduled courses table, displaying Course, Type, Section / Lab Subgroup Option, Enrolled, and Available Seats.
   - Transformed Step 1 into a high-density, professional university administration routing interface.
   - Dual-card layout for **Previous Enrolled Section** and **Desired Section for Spring 2027** with batch cohort quick-select chips.
   - **Live Desired Section Seat Availability Display**: Positioned directly underneath the Desired Section input, dynamically calculating live seat metrics:
     - Theory Lecture Courses: Fixed 50 seats cap (DIU Council standard) with real-time enrolled, free seats, and occupancy progress meter.
     - Laboratory Courses: Fixed 25 seats cap with real-time enrolled, free seats, and occupancy progress meter.
     - Status badges (`Open for Enrollment`, `High Demand`, `Section Full`).
     - Collapsible course-by-course breakdown of batch-configured subjects offered under that section with room numbers and individual seat availability.
   - Institutional DIU Academic Council policy reminders (50/25 seat rules, routine clash prevention, and advisor sign-off).

7. **Google Cloud OAuth Consent Compliance & Public Legal Routes**:
   - Centralized dynamic domain resolution utility in `src/lib/config/site.ts` (`NEXT_PUBLIC_APP_URL` with deployment fallback).
   - Public **Privacy Policy** page at `/privacy` (`https://courseregdiu.asf.run/privacy`) adhering to the Google API User Data Policy, zero monetization commitments, RLS security disclosure, and DIU contact channels.
   - Public **Terms of Service** page at `/terms` (`https://courseregdiu.asf.run/terms`) containing DIU Academic Council regulations, fixed seat caps (50 theory / 25 lab), prerequisite rules, and advisor review authority.
   - Added Privacy Policy and Terms of Service links to the `/login` portal footer.

8. **44/44 Automated Test Suite Pass (`npm test`)**:
   - `tests/batch-course-and-payment.test.mjs` (11/11 batch course & payment clearance tests pass).
   - `tests/advisor-queue-verification.test.mjs` (9/9 three-category queue verification tests pass).
   - `tests/security-verification.test.mjs` (8/8 P0 security tests pass).
   - `tests/auth-policy-verification.test.mjs` (10/10 auth policy tests pass).
   - `tests/concurrency-and-privacy.test.mjs` (5/5 privacy, identity linking & capacity tests pass).

9. **Performance & Build Verification**:
   - `npm run lint` -> **0 problems, 0 errors, 0 warnings**.
   - `npm run build` -> **Compiled successfully, exit code 0 (26/26 routes)**.
   - Live development server operational on `http://localhost:3000`.

---

## 2. Mandatory Reading Order Before Phase 2

Incoming agents **MUST** read the following architectural specifications in the prescribed order before touching any code:

1. [`AGENTS.md`](file:///f:/antigravity/courseregdiu/AGENTS.md) — Operational rules, multi-agent protocol, and core engineering commandments.
2. [`docs/PROJECT_MASTER.md`](file:///f:/antigravity/courseregdiu/docs/PROJECT_MASTER.md) — Product blueprint, DIU academic framework, grading scales, and phased roadmap.
3. [`SYSTEM_ARCHITECTURE.md`](file:///f:/antigravity/courseregdiu/SYSTEM_ARCHITECTURE.md) — Next.js 16 App Router, SSR, Supabase client/server layers, Middleware, Auth & Resend pipelines.
4. [`DATABASE_SCHEMA.md`](file:///f:/antigravity/courseregdiu/DATABASE_SCHEMA.md) — PostgreSQL schemas, foreign keys, RLS security policies, automated triggers.
5. [`DESIGN_SYSTEM.md`](file:///f:/antigravity/courseregdiu/DESIGN_SYSTEM.md) — DIU brand identity tokens, Tailwind v4 theme, color palette, dark mode tokens, and UI standards.
6. [`COMPONENT_CATALOG.md`](file:///f:/antigravity/courseregdiu/COMPONENT_CATALOG.md) — Comprehensive inventory of all UI primitives, shared shell components, onboarding form, and domain views.
7. [`STUDENT_UX_SPECIFICATION.md`](file:///f:/antigravity/courseregdiu/STUDENT_UX_SPECIFICATION.md) — 4 core destinations, onboarding flow, minimal home, unified course registration workspace.
8. [`ADVISOR_UX_SPECIFICATION.md`](file:///f:/antigravity/courseregdiu/ADVISOR_UX_SPECIFICATION.md) — Embedded advisee queue, 1-by-1 advisee paging, tuition hold auditing, section reassignment, and atomic determination.
9. [`DECISIONS.md`](file:///f:/antigravity/courseregdiu/DECISIONS.md) — Architecture Decision Records (ADR-001 through ADR-015).
10. [`IMPLEMENTATION_STATUS.md`](file:///f:/antigravity/courseregdiu/IMPLEMENTATION_STATUS.md) — Current progress matrix, route breakdown, and verification test logs.

---

## 3. Implemented Route Inventory (20 Routes)

| Route | Page File | Component View | Description |
| :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Server Page | Landing redirect to `/dashboard` or `/login`. |
| `/login` | `src/app/login/page.tsx` | Client Page | Institutional Google Single Sign-On page restricted to `@diu.edu.bd`. |
| `/onboarding` | `src/app/onboarding/page.tsx` | [`onboarding-form.tsx`](file:///f:/antigravity/courseregdiu/src/components/auth/onboarding-form.tsx) | First-time student onboarding screen collecting name confirmation, DIU student ID, and batch. |
| `/dashboard` | `src/app/dashboard/page.tsx` | [`student-home-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/student-home-view.tsx) | Minimal Student Home: Active semester, window countdown, 1 prominent next action, advisor contact, tuition clearance. |
| `/courses` | `src/app/courses/page.tsx` | [`unified-courses-workspace.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/unified-courses-workspace.tsx) | Unified Course Registration Workspace: Search/filter, regular vs. retake courses, inline section selection with live capacity, sticky cart summary (`12.0/15.0 Cr`), and Review & Submit modal. |
| `/registration` | `src/app/registration/page.tsx` | Server Redirect | Redirects to `/courses`. |
| `/student/tracking` | `src/app/student/tracking/page.tsx` | [`registration-tracking-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/registration-tracking-view.tsx) | 4-step advising status stepper, assigned advisor details, enrolled courses breakdown. |
| `/student/profile` | `src/app/student/profile/page.tsx` | [`student-profile-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/student-profile-view.tsx) | Digital student ID card, degree progress bars (78/148 Cr), department/batch verification, advisor info. |
| `/schedule` | `src/app/schedule/page.tsx` | [`weekly-schedule-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/weekly-schedule-view.tsx) | 6-day timetable matrix (Sat–Thu, 08:30–17:30) with color-coded slots and clash alerts. |
| `/student/history` | `src/app/student/history/page.tsx` | [`academic-history-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/academic-history-view.tsx) | Historical academic transcript with letter grades, SGPA, CGPA summary, and simulated PDF download. |
| `/advisor` | `src/app/advisor/page.tsx` | [`advisor-dashboard-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-dashboard-view.tsx) | Embedded Advisee Queue: KPI ribbon + queue table with 150ms debounced search, status and risk filters. |
| `/advisor/queue` | `src/app/advisor/queue/page.tsx` | [`advisor-dashboard-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-dashboard-view.tsx) | Advisee queue view. |
| `/advisor/review/[id]` | `src/app/advisor/review/[id]/page.tsx` | [`advisor-review-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-review-view.tsx) | Student registration review studio with 1-by-1 advisee paging, tuition clearance check, section reassignment, and atomic approval. |
| `/advisor/students` | `src/app/advisor/students/page.tsx` | [`advisee-roster-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisee-roster-view.tsx) | Advisee roster directory with CSV export. |
| `/advisor/history` | `src/app/advisor/history/page.tsx` | [`advising-history-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advising-history-view.tsx) | Audit log of past faculty determinations and remarks. |
| `/advisor/profile` | `src/app/advisor/profile/page.tsx` | [`advisor-profile-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-profile-view.tsx) | Faculty profile, room location, consultation routine hours, contact channels. |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Server Route | Exchanging OAuth authorization code for Supabase session. |
| `/unauthorized` | `src/app/unauthorized/page.tsx` | Server Page | Security rejection screen for non-`@diu.edu.bd` accounts. |
| `/admin` | `src/app/admin/page.tsx` | Server Redirect | Redirects to `/admin/emails`. |
| `/admin/emails` | `src/app/admin/emails/page.tsx` | [`admin-email-management-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/admin/admin-email-management-view.tsx) | Admin Email Management: Student dual-email directory, alternative personal email authorization, active/inactive toggle, revocation, and immutable audit trail. |
| `/_not-found` | Built-in Next.js | Server Page | 404 page styled with dark theme. |

---

## 4. Phase 2 Implementation Roadmap

The incoming engineering team should execute **Phase 2: Database Connectivity & Live Advising Cart Transactions**:

### Milestone 2.1: Supabase Database Seeding (`supabase/seed.sql`)
1. Migrate the curriculum from `src/lib/mock/data.ts` into a permanent `supabase/seed.sql` migration script.
2. Insert departments (`CSE`, `SWE`, `EEE`, `BBA`), active semester (`Spring 2027`), courses, prerequisite records, class sections, and initial advisor assignments.
3. Verify that all foreign keys, unique constraints, and check constraints defined across migrations (`20261118000000_phase0_init.sql`, `20261119000000_student_onboarding.sql`, and `20261119110000_security_remediation_p0.sql`) are satisfied.

### Milestone 2.2: First-Time Onboarding Server Action & Session Binding (COMPLETED in P0 Security Remediation)
1. Server action `completeOnboardingAction` created in `src/app/onboarding/actions.ts`:
   - Validates inputs strictly using Zod (`fullName`, `diuId` regex, `batch`).
   - Checks for duplicate DIU Student ID in `public.profiles`.
   - Executes `complete_student_onboarding()` RPC setting `onboarding_completed = true`.
2. Guard `requireOnboarded()` in `src/lib/auth/roles.ts` guards all student pages and redirects uncompleted profiles to `/onboarding`.

### Milestone 2.3: Server Actions & Zod Validations for Registration Cart
1. Create Server Actions in `src/lib/actions/registration.ts`:
   - `addToCartAction(studentId, sectionId)`
   - `removeFromCartAction(studentId, sectionId)`
   - `switchSectionAction(studentId, currentSectionId, newSectionId)`
   - `submitRegistrationApplicationAction(studentId, sectionIds)`
2. Ensure every Server Action validates inputs against Zod schemas in `src/lib/validations/registration.ts`.
3. Enforce the DIU credit limit and prerequisite rules inside Server Actions on the server side prior to inserting into `public.registration_applications` and `public.registration_items`.
4. Validate that tuition payment clearance is confirmed before allowing final submission.

### Milestone 2.4: Advisor Live Determination Transactions
1. Create Server Actions in `src/lib/actions/advisor.ts`:
   - `approveApplicationAction(applicationId, advisorId, remarks)`
   - `requestRevisionsAction(applicationId, advisorId, reason, remarks)`
   - `reassignSectionAction(applicationId, courseId, oldSectionId, newSectionId)`
2. Wrap approval mutations in a PostgreSQL transaction or atomic RPC to increment section `enrolled_count` and update application status simultaneously.
3. Record all actions in `public.audit_logs`.

### Milestone 2.5: Real Google OAuth Session Integration & RLS Policy Verification
1. Replace mock user profiles in page components with session resolution from `getSupabaseServerClient().auth.getUser()`.
2. Connect user profile metadata to `public.students` and `public.advisors`.
3. Verify that Row-Level Security (RLS) policies permit students to view only their own records and advisors to view only their assigned advisees.

### Milestone 2.6: Resend Transactional Email Notification Pipeline
1. Hook `sendAdvisingStatusUpdateEmail` (`src/lib/email/resend.ts`) to status transitions:
   - When student submits registration -> Email notification to assigned advisor.
   - When advisor approves registration -> Confirmation email to student with enrolled schedule.
   - When advisor requests revisions -> Email to student with advisor remarks and action checklist.

---

## 5. Security Remediation Status & Verification

The **Priority 0 Security Remediation** has been completed and verified with automated test suites (`tests/security-verification.test.mjs`):
1. **Unauthenticated Route Access**: Verified (HTTP 307 redirect to `/login`).
2. **Student Accessing Advisor Routes**: Verified (HTTP 307 redirect to `/unauthorized`).
3. **Student Attempting Role Escalation**: Verified (Privilege escalation blocked by Zod schemas and DB trigger `check_profile_privilege_escalation`).
4. **Advisor Accessing Unassigned Student**: Verified (`requireAssignedRegistration` blocks unassigned access with HTTP 307 redirect to `/unauthorized`).
5. **Incomplete Onboarding Bypass**: Verified (Redirects to `/onboarding`).
6. **Duplicate Student ID Submission**: Verified (Rejected at validation and database constraint levels).
7. **Unauthorized Application Updates**: Verified (State transitions enforced: students cannot self-approve; advisors cannot edit unsubmitted drafts).
8. **Invalid OAuth Redirect**: Verified (`validateSafeRedirect` sanitizes all open redirect vectors to `/dashboard`).

### Remaining Operational Risks & Requirements:
- **Remote Supabase Execution**: Migration `20261119110000_security_remediation_p0.sql` must be applied to the remote production Supabase instance via `supabase db push` or SQL Editor when live credentials are provided.
- **Google Cloud Console OAuth**: The production redirect URI (`https://<domain>/auth/callback`) must be added to the authorized redirect URIs in Google Cloud Console.

---

## 6. Immediate Next Task for Phase 2

- **Phase 2, Milestone 2.1**: Supabase Database Seeding (`supabase/seed.sql`)
  1. Author `supabase/seed.sql` populating official DIU course catalog for Spring 2027 (departments CSE, SWE, EEE, BBA).
  2. Populate class sections, prerequisites, and initial advisor assignments.
  3. Wire live Supabase queries to the Unified Courses Workspace and Advisee Queue.
