# DESIGN SYSTEM & DESIGN QUALITY MANDATE — DIU Course Registration Platform

> **Institution**: Daffodil International University (DIU)  
> **Milestone**: Phase 1.5 Design Quality Mandate & Simplification Complete  
> **Quality Benchmarks**: Linear (Interaction Quality) • Stripe (Information Clarity) • Notion (Usability)  
> **Theme Model**: Unified Institutional Dark Theme (Slate-950 Base, Slate-900 Elevated Surfaces)  
> **Tailwind Version**: Tailwind CSS v4  

---

## 1. Design Quality Mandate

This application is engineered as a mature, production-grade university information system built by a senior product design team. It strictly avoids generic AI-generated dashboard tropes.

### Core Design Philosophy
1. **Purposeful Layout**: Every element directly serves an authentic student or faculty registration task. No elements exist merely to fill whitespace.
2. **Natural Information Hierarchy**: Primary registration status and urgent calls-to-action command immediate attention; supporting reference metadata stays quiet.
3. **Consistent Spacing & Alignment**: Rigid spacing scale (`gap-2`, `gap-3`, `gap-4`, `p-3`, `p-4`, `p-5`) across all 20 routes. No arbitrary card sizes.
4. **Realistic Typography**: High-contrast, carefully weighted Geist Sans and Geist Mono typography with strict hierarchy.
5. **Restrained Color**: Neutral slate surfaces (`#090d16` canvas, `#0f172a` cards, `#1e293b` borders), with DIU Forest Green (`#008764`) reserved exclusively for primary actions and verified states.
6. **Functional Interactions**: Meaningful hover, focus, keyboard navigation (`[J]`/`[K]` advisee shortcuts), active, disabled, and loading states.
7. **Strict Avoidance of AI-Generated Design Patterns**:
   - ❌ Generic multi-card dashboard templates
   - ❌ Random gradient backgrounds and gradient fills
   - ❌ Excessive glassmorphism and blur blobs
   - ❌ Unnecessary icons beside every single heading
   - ❌ Huge welcome hero banners
   - ❌ Repeated rounded cards containing identical layouts
   - ❌ Fictional statistics and unverified academic queue estimates
   - ❌ Meaningless loading spinners and non-functional buttons

---

## 2. Brand Tokens & Color Palette

| Token | Hex / Value | Usage & Meaning |
| :--- | :--- | :--- |
| **Canvas Base** (`--background`) | `#0b0f19` | Deep space navy canvas for both Student and Advisor portals. Zero glare, high contrast. |
| **Card / Container Surface** (`--card`) | `#121827` | Refined dark blue-slate for all cards, forms, tables, and dialogs. |
| **Subtle Perimeter Border** (`--border`) | `#1c263c` | Restrained 1px border for cards, table dividers, inputs, and section boundaries. |
| **Active Nav / Highlight Pill** | `#172136` | Active navigation destination pill with white icon and text (`rounded-xl`). |
| **Muted Metadata Text** | `#8e9db2` | Subtitles, helper text, table column headers, and inactive navigation links. |
| **Primary White Action** | `#ffffff` | High-emphasis contrast button (`Continue Registration →`) with dark `#0b0f19` text. |
| **Accent Action Blue** | `#2563eb` | Tactical functional buttons (e.g. `Refresh` button, active page indicator). |
| **Status Badge: Paid / Completed** | `#062822` / `#10b981` | Dark emerald container with `#064e3b` border and emerald green text. |
| **Status Badge: Pending Review** | `#2b200b` / `#f59e0b` | Dark amber container with `#78350f` border and amber text. |
| **Status Badge: Under Review** | `#0c223d` / `#38bdf8` | Dark sky blue container with `#0369a1` border and sky blue text. |
| **Status Badge: Unpaid / Hold** | `#2e1014` / `#ef4444` | Dark rose container with `#881337` border and rose red text. |


---

## 3. Typography Scale & Readability Standards

- **Font Family**: Inter or Geist Sans for prose and interface; Geist Mono for IDs, codes, vouchers, and credit metrics.
- **Scale (Zero Unreadable Tiny Text)**:
  - Page Titles: `text-2xl sm:text-3xl font-bold tracking-tight text-white`
  - Section Headings: `text-base sm:text-lg font-bold text-white tracking-tight`
  - Body Text / Student Names: `text-sm font-semibold text-white`
  - Table Column Headers: `text-xs font-semibold uppercase tracking-wider text-slate-400`
  - Secondary Metadata / Batches / Departments: `text-xs font-medium text-slate-300`
  - Helper & Supporting Details: `text-xs text-slate-400` (Strictly avoided `10px` or `11px` unreadable text)
- **Monospace Elements (Zero Ambiguity)**:
  - DIU Student ID: `font-mono text-xs font-bold text-emerald-400`
  - Course Codes: `font-mono text-xs font-bold text-emerald-400`
  - Section Indicators: `font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#121827] border border-[#1c263c]`
  - Payment Vouchers: `font-mono text-xs text-slate-200`
- **Readability & Contrast**:
  - Full contrast maintained at 100% browser zoom without horizontal overflow.
  - High-contrast text colors (`text-white`, `text-slate-200`, `text-slate-300`, `text-slate-400`) ensuring WCAG AA conformance.

---

## 4. Content Design & Terminology Standards

To maintain institutional consistency across faculty advising workflows, UI text strictly follows this terminology matrix:

| Canonical Term | Usage Scope | Strictly Prohibited Variations |
| :--- | :--- | :--- |
| **Application Center** | The segmented advising queue (`/advisor/queue`) | "Advising Applications", "Queue", "Submissions" |
| **Pending** | Applications submitted by assigned students awaiting faculty review | "To Do", "Unapproved" |
| **In Progress** | Applications actively under faculty review (`isUnderReview: true`) | "Ongoing", "Processing" |
| **Approved** | Finalized registrations authorized by the faculty advisor | "Completed" (reserved for degree audits), "Done" |
| **Not Applied** | Assigned advisees who have not submitted for the active semester | "Unapplied", "Missing Students" |
| **My Assigned Students** | Roster of students assigned to the advisor (`/advisor/students`) | "Advisee Roster", "Students List" |
| **Review Application** | Primary faculty action on pending registrations | "View", "Check", "Inspect" |
| **Review History** | Permanent audit log of signed determinations (`/advisor/history`) | "Advising History", "Decision History" |
| **Student Information** | Advisee profile, standing, and contact info in review | "Student Profile", "Metadata" |
| **Section Information** | Cohort progression (`69_K → 69_D`) in review | "Cohort", "Routine Sections" |
| **Course Selection** | Course offerings audit table in review | "Advising Slip", "Cart" |
| **Advisor Decision** | Faculty determination remarks and approval/revision actions | "Determination", "Review Actions" |

---

## 5. Component Interaction Quality (The Core Experiences)

### A. Course Registration Workspace (`/courses`) — Linear Quality Benchmark
- High-density course list with direct expandable sections.
- Inline seat availability counters (`50` seats for theory, `25` seats for lab).
- Real-time client-side schedule collision detection with precise conflict explanation.
- Sticky right-rail registration slip inspector with live credit meter (`10.5 / 15.0 Cr`).
- One-click confirmation modal with 4-point verification checklist.

### B. Advisor Review Studio (`/advisor/review/[id]`) — Stripe Quality Benchmark
- Strict 5-part institutional information hierarchy:
  1. **Student Information**: Academic standing, CGPA, completed credits, institutional email, authorized personal email exception badge.
  2. **Section Information**: Clear cohort progression (`69_K → 69_D`) with DIU cohort context.
  3. **Course Selection**: High-density table with course code, title, credits, classification (`General` vs `Retake`), prerequisite verification, and in-place section reassignment with live seat availability.
  4. **Payment Information**: Tuition accounts clearance audit (`DIU-AC-2027-4561`) and hold status.
  5. **Advisor Decision**: Faculty remarks textarea, revision rationale selector, and atomic confirmation dialogs.
- Advisee queue paging (`← Prev [J]` and `Next [K] →` keyboard shortcuts) enabling sequential review of entire cohorts without returning to the queue.
