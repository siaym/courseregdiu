# COMPONENT CATALOG — DIU Course Registration Platform

> **Milestone**: Phase 1.5 Simplification, UX & Performance Complete  
> **Framework**: Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript (Strict)  
> **Design Theme**: Unified Institutional Dark Theme (Slate-950 Canvas, Slate-900 Surfaces)  

---

## 1. UI Primitives (`src/components/ui/`)

| Component | File | Key Props / Variants | Description |
| :--- | :--- | :--- | :--- |
| `Button` | [`button.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/button.tsx) | `variant`: `default` (`#008764`), `secondary`, `outline`, `destructive`, `ghost`, `link`; `size`: `sm`, `default`, `lg`, `icon`; `isLoading`, `asChild` | Standard DIU brand buttons with Radix Slot support and loading spinner. |
| `Badge` | [`badge.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/badge.tsx) | `variant`: `default`, `secondary`, `outline`, `destructive`, `success`, `warning`, `info`, `diu` | University status and metadata badges with dark-slate borders. |
| `StatusBadge` | [`status-badge.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/status-badge.tsx) | `status`: `draft`, `pending_advisor`, `approved`, `rejected`, `dropped`; `showIcon`: `boolean` | Specialized registration lifecycle badge with synchronized icons and labels. |
| `Card` | [`card.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/card.tsx) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Elevated container surfaces formatted with `bg-slate-900 border-slate-800 text-slate-100`. |
| `Dialog` | [`dialog.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/dialog.tsx) | `open`: `boolean`, `onClose`: `() => void`, `maxWidth`: `sm`, `md`, `lg`, `xl`, `2xl` | Accessible modal dialog with keyboard ESC dismissal, focus management, and dark slate surface. |
| `Progress` | [`progress.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/progress.tsx) | `value`: `number`, `max`: `number`, `variant`: `default`, `diu`, `success`, `warning`, `destructive`; `size`: `sm`, `default`, `lg` | Animated progress bar used for credit limit meters and degree requirements. |
| `EmptyState` | [`empty-state.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/empty-state.tsx) | `icon`: `ElementType`, `title`: `string`, `description`: `string`, `action`: `ReactNode` | Standard empty and zero-state component for empty carts and search results. |
| `Table` | [`table.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/table.tsx) | `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` | Semantic dark data table with subtle border dividers and hover effects. |
| `Tabs` | [`tabs.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/tabs.tsx) | `defaultValue`, `value`, `onValueChange`, `TabsList`, `TabsTrigger`, `TabsContent` | Accessible tabbed view switcher for layout toggling. |
| `Input` | [`input.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/input.tsx) | Native input props, `type`, `className` | Form text and search input with emerald focus ring. |
| `Select` | [`select.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/select.tsx) | Native select props, `children`, `className` | Dropdown select with custom chevron indicator and dark background. |
| `Textarea` | [`textarea.tsx`](file:///f:/antigravity/courseregdiu/src/components/ui/textarea.tsx) | Native textarea props, `rows`, `className` | Multi-line textarea for advising remarks and rationale. |

---

## 2. Authentication & Onboarding Components

| Component | File | Key Capabilities |
| :--- | :--- | :--- |
| `OnboardingForm` | [`onboarding-form.tsx`](file:///f:/antigravity/courseregdiu/src/components/auth/onboarding-form.tsx) | First-time student onboarding form. Full Name confirmation, DIU Student ID syntax validation, Batch selection, duplicate check, and prototype persistence. |
| `GoogleSignInButton` | [`google-sign-in-button.tsx`](file:///f:/antigravity/courseregdiu/src/components/auth/google-sign-in-button.tsx) | Institutional Google OAuth button with domain restriction (`hd: diu.edu.bd`). |

---

## 3. Student Portal Components (4 Core Destinations)

| Component | File | Key Capabilities |
| :--- | :--- | :--- |
| `StudentHomeView` | [`student-home-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/student-home-view.tsx) | **Core Destination 1 (Home)**: High-focus, zero-clutter dashboard prioritizing active semester (`Spring 2026`), window countdown (`4 Days Remaining`), single prominent next action button, current application state (`REG-2026-SP-7819`), assigned advisor contact card, and accounts clearance notifications. Unnecessary GPA, degree progress, and queue position counters removed. |
| `UnifiedCoursesWorkspace` | [`unified-courses-workspace.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/unified-courses-workspace.tsx) | **Core Destination 2 (Courses)**: Single-screen registration workspace. 150ms debounced search, regular vs retake/backlog course filtering, level filter, direct section selection with live seat availability counters, persistent sticky registration summary with credit meter (`12.0/15.0 Cr`), and one-click Review & Submit modal. |
| `RegistrationTrackingView` | [`registration-tracking-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/registration-tracking-view.tsx) | **Core Destination 3 (Application)**: 4-step advising application status stepper (Draft, Submitted, Faculty Audit, Enrolled), assigned advisor details, and submitted sections list. Simulated queue position removed. |
| `StudentProfileView` | [`student-profile-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/student/student-profile-view.tsx) | **Core Destination 4 (Profile)**: Digital student ID card, department/batch verification, degree progression requirements breakdown (78/148 Cr), and advisor consultation details. |

---

## 4. Faculty Academic Advisor Portal Components

| Component | File | Key Capabilities |
| :--- | :--- | :--- |
| `AdvisorDashboardView` | [`advisor-dashboard-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-dashboard-view.tsx) | **Unified Advising Workspace**: Directly embeds the searchable, filterable queue table with 150ms debounced search, status filter (`Pending Review Only` default), risk filter (Probation, Prereq Deficiencies, Tuition Holds), and compact KPI ribbon (Pending: 3, Total: 48, Approved: 12, Probation: 1). |
| `AdvisorReviewView` | [`advisor-review-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-review-view.tsx) | **One-Student-at-a-Time Review Studio**: Direct advisee paging (`← Prev Student` and `Next Student →`), tuition clearance audit (`DIU-AC-2026-8812`), in-place section reassignment with live seat capacity counts, and atomic approval/revision dialogs. |
| `AdvisorProfileView` | [`advisor-profile-view.tsx`](file:///f:/antigravity/courseregdiu/src/components/advisor/advisor-profile-view.tsx) | Faculty credentials, employee ID, room location, consultation routine hours, and office contacts. |
