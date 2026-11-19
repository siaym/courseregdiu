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

## 3. Typography & Monospace Formatting

- **Font Family**: Geist Sans (Prose & Interface) & Geist Mono (Codes, IDs, Timetables).
- **Headings**:
  - Page Title: `text-xl font-semibold tracking-tight text-white`
  - Section Title: `text-sm font-semibold text-white`
  - Table Header: `text-[11px] font-mono text-slate-400 font-medium`
- **Monospace Elements (Zero Ambiguity)**:
  - DIU Student ID: `font-mono text-xs font-bold text-emerald-400`
  - Course Codes: `font-mono text-xs font-bold text-emerald-400`
  - Timetable Slots: `font-mono text-[11px] text-slate-400`
  - Payment Vouchers: `font-mono text-[11px] text-slate-200`

---

## 4. Component Interaction Quality (The Two Core Experiences)

### A. Course Registration Workspace (`/courses`) — Linear Quality Benchmark
- High-density course list with direct expandable sections.
- Inline seat availability counters (`32/40 enrolled`, `8 seats open`).
- Real-time client-side schedule collision detection with precise conflict explanation.
- Sticky right-rail registration slip inspector with live credit meter (`12.0 / 15.0 Cr`).
- One-click confirmation modal with 4-point verification checklist.

### B. Advisor Review Studio (`/advisor/review/[id]`) — Stripe Quality Benchmark
- Single high-density student academic standing bar (CGPA, completed credits, proposed load, accounts clearance).
- Advisee queue paging (`← Prev [J]` and `Next [K] →` keyboard shortcuts) enabling sequential review of entire cohorts without returning to the queue.
- Tabular advising slip audit with in-place section reassignment dropdowns displaying live seat capacity.
- Immediate tuition clearance hold warnings.
- Atomic determination dialogs with mandatory remarks for revision requests.
