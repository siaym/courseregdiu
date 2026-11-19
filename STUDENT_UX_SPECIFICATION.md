# STUDENT UX SPECIFICATION — DIU Course Registration Platform

> **Milestone**: Phase 1.5 Simplification, UX & Performance Complete  
> **Target Audience**: Undergraduate & Graduate Students at Daffodil International University  
> **Primary Navigation Destinations**: Home, Courses, Application, Profile (Strict 4-Destination Model)  

---

## 1. Primary Navigation Architecture (4 Core Destinations)

To eliminate cognitive overload, redundant screens, and unnecessary page hopping, the Student Portal strictly enforces **four primary navigation destinations**:

| Destination | Route | Core Function & Responsibility |
| :--- | :--- | :--- |
| **1. Home** | `/dashboard` | Operational registration status, registration window countdown, single prominent next action, current application state, assigned advisor contact, and institutional notifications. |
| **2. Courses** | `/courses` | Unified Course Registration Workspace: debounced search/filter, regular vs. retake courses, instant section selection with live seat availability, sticky registration slip summary, and review-and-submit workflow. |
| **3. Application** | `/student/tracking` | 4-step advising application status stepper, assigned reviewing faculty details, verified slip items, and timeline progress. |
| **4. Profile** | `/student/profile` | Official institutional student digital identity card, department/batch verification, degree progression requirements (78/148 Cr), and faculty advisor inquiry channel. |

*(Legacy or redundant sub-routes: `/registration` automatically redirects to the unified workspace at `/courses`; `/schedule` and `/student/history` remain functional sub-views accessible via Application/Profile without cluttering the primary navigation).*

---

## 2. Student Home Screen (`/dashboard`)

The Home view is a focused, minimal, zero-clutter registration status hub. It does not replicate course catalogs or transcript tables.

### Key Content Panels (Strict Invariants)
1. **Current Registration Semester & Window Status**:
   - Active semester: **Spring 2026**
   - Window status: **Active Registration Window** with live countdown (`4 Days Remaining to Finalize`) and start/end dates.
2. **One Prominent Next Action (Hero Focus)**:
   - Evaluates the student's current advising lifecycle state and provides exactly **one** primary call-to-action:
     - **Draft State**: *"Complete Your Course Selection"* -> Prominent action button: **"Open Courses Workspace →"** linking to `/courses`.
     - **Submitted State**: *"Advising Slip Under Faculty Review"* -> Action button: **"Track Application →"** linking to `/student/tracking`.
     - **Revisions Required**: *"Action Required: Revisions Requested"* -> Action button: **"Adjust Course Sections →"** linking to `/courses` with advisor feedback summary.
     - **Approved State**: *"Registration Finalized & Approved"* -> Action button: **"View Official Slip →"** linking to `/student/tracking`.
3. **Current Application Status**:
   - Status badge (`draft`, `pending_advisor`, `rejected`, `approved`) with official application reference number (`REG-2026-SP-7819`).
4. **Assigned Academic Advisor**:
   - Faculty name (`Dr. Sheak Rashed Haider Noori`), department, office room location (`Room 612, AB-04, Daffodil Smart City`), email, and routine consultation hours.
5. **Relevant Institutional Notifications**:
   - Tuition Accounts Clearance verified (`DIU-AC-2026-8812`).
   - Advising window deadline warning (closing timestamp).

### Removed Elements & Rationales
- **Removed CGPA Display**: CGPA belongs in academic history/profile; displaying it on the home registration screen created unnecessary anxiety and duplicate queries.
- **Removed Degree Progress Bar**: Moved exclusively to the Profile view where graduation requirements are comprehensively broken down.
- **Removed Queue Position Counter**: Fictional/unverified queue numbers (`#2 in CSE batch`) were removed to avoid misleading students.
- **Removed Full Advising Slip Table**: Course selection and section management are now unified in `/courses`, eliminating duplicate tables and stale state.

---

## 3. Unified Course Registration Workspace (`/courses`)

The course catalog and registration cart are unified into **one single-screen workspace** (`UnifiedCoursesWorkspace`). Students never need to navigate back and forth between separate catalog and cart pages.

### Core Capabilities
1. **Debounced Search & Multi-Criteria Filtering**:
   - 150ms debounced text input (code or title).
   - Filter by Enrollment Type: **All Offerings**, **Regular Curriculum Courses**, and **Optional Retake / Backlog** (with amber indicator badges).
   - Filter by Level: Level 1 (Freshman) through Level 4 (Senior).
   - Filter by Department: CSE, SWE, EEE, BBA, ENG.
   - Filter by Prerequisite Eligibility: All, Prerequisites Met, Prerequisites Missing, Already Passed.
2. **Inline Section Selection with Real-Time Capacity**:
   - Sections are displayed directly on course cards without requiring modal hops.
   - Shows instructor, schedule slot, room, confirmed enrollments, pending counts, and open seats.
   - One-click section selection, switching, or removal.
   - Real-time client-side timetable collision and credit limit verification.
3. **Sticky Accessible Registration Slip Summary**:
   - Desktop: Sticky side rail; Mobile: Bottom slide drawer.
   - Live credit limit progress meter (`12.0 / 15.0 Cr`) with DIU limit warnings.
   - Selected courses list with instant remove actions.
   - Accounts clearance confirmation indicator.
   - Primary Action: **Review & Submit Advising Slip**.
4. **Review & Submit Confirmation Modal**:
   - One-click modal verifying prerequisites, schedule conflicts, credit caps, and accounts clearance.
   - Atomic submission action with immediate feedback and reference generation (`REG-2026-SP-7819`).

---

## 4. Mandatory First-Time Student Onboarding Flow (`/onboarding`)

- Triggered immediately after first Google Single Sign-On (`@diu.edu.bd`).
- Required fields: Full Name (Google name pre-filled, editable), DIU Student ID (syntax check `^\d{3}-\d{2}-\d{4,6}$` with duplicate prevention), and Batch (e.g. `60th Batch`).
- Server-side guard `requireOnboarded()` in `src/lib/auth/roles.ts` protects `/dashboard`, `/courses`, and other student routes.
- Returning students with `onboarding_completed: true` bypass onboarding automatically.
