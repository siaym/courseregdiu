<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Multi-Agent Engineering Playbook & Operational Rules

> **CRITICAL DIRECTIVE FOR ALL AGENTS**:
> Before reading codebase files or writing any code, every engineer/agent **MUST** read the mandatory architectural documents listed below in the prescribed order. Failure to do so will result in architectural regression, policy violations, or broken security boundaries.

---

## 1. Mandatory Reading Order

Before initiating any task, sprint, or feature modification:
1. `AGENTS.md` (This file — Core rules & multi-agent conventions)
2. `docs/PROJECT_MASTER.md` (Product master blueprint, DIU academic context & phased roadmap)
3. `SYSTEM_ARCHITECTURE.md` (Next.js 16 App Router, SSR, Supabase client/server layers, Middleware, Auth & Resend pipelines)
4. `DATABASE_SCHEMA.md` (PostgreSQL schemas, foreign keys, RLS security policies, automated triggers)
5. `DESIGN_SYSTEM.md` (DIU brand identity tokens, Tailwind v4 theme, shadcn component standards)
6. `DECISIONS.md` (Architecture Decision Records — ADR-001 through ADR-006)
7. `IMPLEMENTATION_STATUS.md` (Current progress matrix — exactly what is done vs. stubbed)
8. `HANDOFF.md` (Latest sprint state, active handoff instructions, next milestones)

---

## 2. Core Engineering Commandments

1. **Zero Fabrication of DIU Records or Academic Policies**:
   - Never invent fictional course codes, faculty designations, prerequisites, or GPA calculation algorithms.
   - All academic structures must mirror official Daffodil International University (DIU) academic regulations (e.g., standard DIU student ID syntax `XXX-XX-XXXXX`, 4.00 grading scale, department codes CSE, SWE, EEE, BBA, etc.).
   - If an institutional rule is unconfirmed, flag it explicitly in `docs/PROJECT_MASTER.md` as `[PENDING DIU ACADEMIC COUNCIL VERIFICATION]` and consult official handbook sources.

2. **Exclusivity of Google OAuth (@diu.edu.bd)**:
   - DIU course registration is an enterprise institutional application. Password-based authentication (`auth.signUp` with email/password) is prohibited for primary users.
   - Authentication must route exclusively through Google OAuth with institutional domain hints (`hd: diu.edu.bd`) and server-side verification.
   - Reject personal `@gmail.com` or unauthorized email domains in middleware and callback routes.

3. **Row-Level Security (RLS) is Non-Negotiable**:
   - Never bypass PostgreSQL RLS policies by using `SUPABASE_SERVICE_ROLE_KEY` in client components or client-accessible routes.
   - Service role clients are strictly reserved for background worker scripts, administrative audit jobs, or server-side webhook handlers.
   - Every single table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` accompanied by explicit SELECT, INSERT, UPDATE, and DELETE policies.

4. **Never Claim Unfinished Work as Operational**:
   - Be brutally honest in `IMPLEMENTATION_STATUS.md`.
   - If a button, workflow, or dialog is a stub or placeholder, annotate it clearly with badges (e.g. `Phase 1 Target`, `Phase 2 Target`) and log it in status documentation.
   - Do not claim a phase or feature is complete unless all linting, typechecking, and build checks have succeeded cleanly.

5. **Strict Type Safety & Zod Validation**:
   - Maintain `strict: true` in `tsconfig.json`. Do not use `any` unless interacting with untyped legacy payload boundaries (and even then, prefer `unknown`).
   - Every mutation, server action, and external payload must validate through Zod schemas located in `src/lib/validations/`.

6. **Preserve Existing Work & Git Hygiene**:
   - Check existing files, helper utilities, and database migrations before introducing redundant modules.
   - Maintain clean modular separation: components in `src/components/`, server logic in `src/lib/`, types in `src/types/`.

7. **Verification Requirement**:
   - Before completing your turn, you must run:
     ```bash
     npm run lint
     npm run build
     ```
   - Both commands must exit with code `0`. Address all warnings and errors before declaring the task done.

---

## 3. Technology Stack & Conventions

| Layer | Standard | Rule |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Server components by default. Client components only when using interactivity (`"use client"`). |
| **Language** | TypeScript 5 (Strict) | Fully typed database schema in `src/types/database.ts`. No `any`. |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Theme defined in `@theme` in `src/app/globals.css`. Design tokens in `DESIGN_SYSTEM.md`. |
| **Database** | PostgreSQL (Supabase) | Strict RLS. Migrations saved sequentially in `supabase/migrations/`. |
| **Auth** | Supabase Auth (Google OAuth) | Institutional domain restriction (`@diu.edu.bd`). |
| **Forms** | React Hook Form + Zod | Schemas defined in `src/lib/validations/`. |
| **Email** | Resend API | Templates and dispatcher in `src/lib/email/resend.ts` with local fallback logger. |

---

## 4. Role Hierarchy

- `student`: Can view own profile, course catalog, enroll in sections during active registration window, submit advising drafts.
- `advisor`: Can view assigned advisees, review submitted registration applications, approve/reject with remarks.
- `department_head`: Can view departmental rosters, section capacities, and override prerequisite exceptions.
- `admin`: Full administrative access, semester creation, department configuration, audit log inspection.
