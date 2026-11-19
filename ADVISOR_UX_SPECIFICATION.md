# ADVISOR UX SPECIFICATION — DIU Course Registration Platform

> **Milestone**: Phase 1.5 Simplification, UX & Performance Complete  
> **Target Audience**: Department Academic Advisors & Faculty at Daffodil International University  
> **Core Focus**: Pending Applications, Search & Filters, 1-by-1 Review Studio, Section Reassignment, Payment Declaration, Atomic Determination  

---

## 1. Unified Advisee Queue & Metrics Workspace (`/advisor`)

To prevent advisors from bouncing between disconnected dashboard and queue pages, the main Advisor route (`/advisor`) integrates the **KPI Metrics Ribbon** and the **Full Advisee Queue** into a single, high-efficiency screen:

### Compact Metrics Ribbon
- **Pending Review**: Primary high-priority count (amber badge) highlighting applications awaiting faculty action.
- **Total Advisees**: Assigned cohort count (CSE Batches 58, 59, 60).
- **Approved Today**: Real-time counter of officially authorized enrollments.
- **Probation Cohort**: Count of scholars on academic probation (CGPA < 2.00) subject to credit caps.

### Search, Filters & Debouncing
- **150ms Debounced Search**: Immediate search by Student ID (e.g. `221-15-4921`) or full name without re-rendering per keystroke.
- **Status Filter**: Default filter targets `Pending Review Only`, with options for `All`, `Approved`, and `Revision Requested`.
- **Risk Level Filter**:
  - `Academic Probation`: Flags students with CGPA < 2.00 (9.0–12.0 Cr cap).
  - `Missing Prerequisites`: Flags students missing required preparatory courses.
  - `Tuition Clearance Holds`: Flags students with unconfirmed accounts fee clearance.
- **Sort Options**: Newest submissions first, lowest CGPA first (high-risk priority), or highest CGPA first.

---

## 2. One-Student-at-a-Time Review Studio (`/advisor/review/[id]`)

Advisors can review and authorize an entire cohort sequentially without returning to the queue list.

### Advisee Paging Controls
- Pinned at the top of the review studio:
  - `← Prev Student` and `Next Student →` buttons.
  - Direct position indicator: `Reviewing Advisee X of Y (Spring 2026 Cohort)`.
  - Seamless navigation between advisees in the queue.

### Tuition Payment Declaration Visibility
- Prominently placed in the student academic standing banner:
  - **Accounts Cleared**: Displays green badge with accounts reference code (`DIU-AC-2026-8812`).
  - **Accounts Pending**: Displays high-contrast warning badge (`Tuition Clearance Pending (Accounts Hold)`).
  - Advisor is immediately alerted if an advisee has financial holds prior to final authorization.

### Requested vs Assigned Section Reassignment
- The advising slip audit table displays:
  - Course Code & Title.
  - Prerequisite Audit: `Prereqs Met` or `Missing [Code]`.
  - In-Place Section Reassignment Select: Lists all alternate sections for the course with real-time seat counts e.g.:
    `Sec A (38/40 seats) — Dr. Sheak Rashed Haider Noori`
    `Sec B (40/40 seats [FULL]) — Prof. K. Ahmed`
  - Immediate timetable slot details for the selected section.

### Atomic Determination Dialogs
1. **Approve Registration**:
   - Opens confirmation modal summarizing total credits and enrolled sections.
   - Atomically updates registration status to `approved`.
2. **Request Revisions**:
   - Opens revision dialog requiring faculty remarks.
   - Categorized reasons: Prerequisite Deficiency, Schedule Clash, Overloaded Section, Exceeds Credit Policy.
   - Updates status to `rejected` (revisions needed) with student notification prompt.

---

## 3. Removed Elements & Navigation Simplification
- **Removed Separate Dashboard vs Queue Navigation**: The Advisor Dashboard now directly embeds the queue table with debounced search, eliminating a redundant intermediate screen.
- **Removed Decorative Advising Policy Cards**: Replaced static guideline cards with active operational filters and inline warnings.
