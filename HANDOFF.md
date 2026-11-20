# HANDOFF — Production Security & Identity Hardening to Phase 2 Transition

> **From**: Lead Software Architect & Founding Engineer  
> **To**: Incoming Engineering Agent / Phase 2 Full-Stack Team  
> **Repository**: `courseregdiu` (`https://github.com/siaym/courseregdiu`)  
> **Handover Date**: November 2026  
> **Milestone Status**: Phase 1.5 Complete (100%) | P0 Security Remediation Complete (100%) | Final Auth Policy Complete (100%) | P0 Security Hardening Complete (100%) | Advisor Portal UI/UX Overhaul & 3-Category Application Center Complete (100%) | Supabase Cloud URL Resolver Complete (100%) | **Batch Course Configuration, Payment Clearance & Global UI/UX Redesign Complete (100%)** | Ready for Remote Supabase Production Migration  

---

## 1. Handover Summary

The **Batch Course Configuration, Authoritative Payment Clearance & Global UI/UX Overhaul** cycle has been completed with full automated test coverage and zero build warnings:

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

5. **Advisor Review Studio Hierarchy Optimization (`/advisor/review/[id]`)**:
   - Redesigned **1. Student Information** to prioritize DIU Student ID (prominent badge), student name, department & batch, followed directly by primary contact channels (institutional email, phone number, and verified alternative email).
   - Removed extraneous `Passed: Total Cr` and `Proposed: Max Cr` statistic boxes from the student header.
   - Promoted **Payment Information** to **Section 2** (immediately after Student Information), providing immediate visibility into tuition accounts clearance before reviewing cohort sections (`Section 3`), course selections (`Section 4`), and submitting determinations (`Section 5`).

6. **43/43 Automated Test Suite Pass (`npm test`)**:
   - `tests/batch-course-and-payment.test.mjs` (11/11 batch course & payment clearance tests pass).
   - `tests/advisor-queue-verification.test.mjs` (9/9 three-category queue verification tests pass).
   - `tests/security-verification.test.mjs` (8/8 P0 security tests pass).
   - `tests/auth-policy-verification.test.mjs` (10/10 auth policy tests pass).
   - `tests/concurrency-and-privacy.test.mjs` (5/5 privacy, identity linking & capacity tests pass).

6. **Performance & Build Verification**:
   - `npm run lint` -> **0 problems, 0 errors, 0 warnings**.
   - `npm run build` -> **Compiled successfully, exit code 0 (24/24 routes)**.
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
