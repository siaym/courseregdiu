# HANDOFF — Phase 1.5 to Phase 2 Engineering Transition

> **From**: Lead Software Architect & Founding Engineer  
> **To**: Incoming Engineering Agent / Phase 2 Full-Stack Team  
> **Repository**: `courseregdiu`  
> **Handover Date**: November 2026  
> **Milestone Status**: Phase 1.5 Reference Mockup Alignment & Simplification Complete (100%) | Ready for Phase 2 Implementation Sprint  

---

## 1. Handover Summary

The **Phase 1.5 Simplification & Reference Mockup Alignment** cycle has been completed. The visual interface now matches the user's uploaded reference mockups (`media_1795032747646_e982f32d.jpg` and `media_1795032748485_aeda674a.jpg`) with exact precision across both Student and Advisor portals:

1. **Student Portal Dashboard (Image 1 Alignment)**:
   - Implemented in [`StudentHomeView`](file:///f:/antigravity/courseregdiu/src/components/student/student-home-view.tsx).
   - Surfaces active semester (`Spring 2027`), registration window (`Apr 14 – Apr 20, 2027`), **Course Registration** hero card with open book icon, `● Registration Open` emerald pill, and pure white `Continue Registration →` button.
   - Dual middle cards for `Registration Status` (yellow warning circle `(!)` with bold `Not Submitted`) and `Your Advisor` (`Dr. Rahman Ahmed`, Dept. of CSE, with `Contact` button).
   - Bottom `Important Information` banner with `View Details →` dialog.

2. **Advisor Portal Dashboard (Image 2 Alignment)**:
   - Implemented in [`AdvisorDashboardView`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-dashboard-view.tsx).
   - Top greeting: `Welcome, Dr. Rahman Ahmed` with subtitle.
   - 4 Stat Cards in a row: `245 Assigned Students` (Blue), `12 Pending Applications` (Slate), `8 Under Review` (Green with emerald left border accent), and `210 Completed` (Purple with purple left border accent).
   - Main `Student Applications` table card with `Spring 2027` dropdown, search filter, `All Status`, `All Batches`, `All Payment` selectors, and blue `#2563eb` `Refresh` button.
   - Table displaying the 4 mock advisee records (`Atikur Rahman`, `Mithila Binte Hasan`, `Sayedur Rahman`, `Nusrat Ahmed`) with authentic student IDs (`211-15-456` through `211-15-459`), batch `61`, payment pills (`Paid` / `Unpaid`), and action buttons (`Review →` / `View →`).
   - Results count `Showing 1-4 of 4 results` and pagination controls (`< [1] >`).

3. **Unified Navigation & Brand Shell**:
   - Fixed dark sidebar in [`Sidebar`](file:///f:/antigravity/courseregdiu/src/components/shell/sidebar.tsx) with authentic DIU emblem crest [`DiuLogo`](file:///f:/antigravity/courseregdiu/src/components/brand/diu-logo.tsx), active destination pills (`#172136`), red badge `12` on Advisor Applications, and bottom support contact.
   - Top header with ambient topographic contour lines [`ContourBackground`](file:///f:/antigravity/courseregdiu/src/components/brand/contour-background.tsx), portal indicator tag, role switcher, notification bell with red dot, and user avatar.

4. **Performance & Build Verification**:
   - `npm run lint` -> **0 problems, 0 errors, 0 warnings**.
   - `npm run build` -> **Compiled successfully, exit code 0 (20/20 routes)**.
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
| `/_not-found` | Built-in Next.js | Server Page | 404 page styled with dark theme. |

---

## 4. Phase 2 Implementation Roadmap

The incoming engineering team should execute **Phase 2: Database Connectivity & Live Advising Cart Transactions**:

### Milestone 2.1: Supabase Database Seeding (`supabase/seed.sql`)
1. Migrate the mock curriculum from `src/lib/mock/data.ts` into a permanent `supabase/seed.sql` migration script.
2. Insert departments (`CSE`, `SWE`, `EEE`, `BBA`), active semester (`Spring 2026`), courses, prerequisite records, and class sections.
3. Verify that all foreign keys, unique constraints, and check constraints defined in `supabase/migrations/20261118000000_phase0_init.sql` and `supabase/migrations/20261119000000_student_onboarding.sql` are satisfied.

### Milestone 2.2: First-Time Onboarding Server Action & Session Binding
1. Create `completeOnboardingAction(formData)` in `src/lib/actions/onboarding.ts`:
   - Validates inputs using `studentOnboardingSchema` in `src/lib/validations/onboarding.ts`.
   - Checks for duplicate DIU Student ID in `public.profiles`.
   - Updates `public.profiles` with `name`, `diu_id`, `batch`, `department_id`, and sets `onboarding_completed = true`.
   - Revalidates session and redirects to `/dashboard`.
2. Ensure `requireOnboarded()` in `src/lib/auth/roles.ts` reads live Supabase profile state.

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

## 5. Immediate Sprint Checklist for Next Agent

- [ ] Read all 10 mandatory documents listed in Section 2.
- [ ] Run `npm run lint` and `npm run build` to confirm clean starting state (both must exit 0).
- [ ] Verify database schema with `supabase/migrations/20261119000000_student_onboarding.sql`.
- [ ] Create `supabase/seed.sql` populating official DIU course catalog for Spring 2026.
- [ ] Implement `completeOnboardingAction` in `src/lib/actions/onboarding.ts`.
- [ ] Implement cart and advisor Server Actions with strict Zod validation.
- [ ] Do not invent DIU records or policies; keep all academic rules aligned with official DIU guidelines.
- [ ] Update `IMPLEMENTATION_STATUS.md` and `HANDOFF.md` upon completion of Phase 2 milestones.
