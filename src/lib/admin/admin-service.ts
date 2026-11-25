import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type SemesterRow = Database["public"]["Tables"]["semesters"]["Row"];
export type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
export type AdvisorProfileRow = Database["public"]["Tables"]["advisor_profiles"]["Row"];
export type BatchRow = Database["public"]["Tables"]["batches"]["Row"];
export type AdminAuditLogRow = Database["public"]["Tables"]["admin_audit_logs"]["Row"];
export type RosterImportRow = Database["public"]["Tables"]["advisor_roster_imports"]["Row"];

export interface AdminOverviewData {
  available: boolean;
  errorMessage?: string;
  semesters: SemesterRow[];
  selectedSemester: SemesterRow | null;
  activeSemester: SemesterRow | null;
  metrics: {
    totalStudents: number | null;
    totalActiveAdvisors: number | null;
    totalAssignments: number | null;
    unassignedStudents: number | null;
    conflictingAssignments: number | null;
    pendingApplications: number | null;
    approvedApplications: number | null;
    rejectedApplications: number | null;
    paymentBreakdown: {
      cleared: number;
      awaiting: number;
      notCleared: number;
    } | null;
  };
  recentImports: RosterImportRow[];
  recentAuditLogs: AdminAuditLogRow[];
}

export interface AdvisorDirectoryItem extends AdvisorProfileRow {
  authLinked: boolean;
  assignedStudentCount: number;
  assignedBatches: string[];
  assignedSemesterIds: string[];
}

export interface BatchDirectoryItem extends BatchRow {
  studentCount: number;
  assignedStudentCount: number;
  advisorCount: number;
  eligibleSemesterNames: string[];
}

export function formatSemesterLabel(sem: Pick<SemesterRow, "name" | "code" | "season" | "year">): string {
  if (sem.name) return sem.name;
  const seasonLabel = sem.season.charAt(0).toUpperCase() + sem.season.slice(1);
  return `${seasonLabel} ${sem.year}`;
}

/**
 * Fetches live operational overview metrics from Supabase for the Admin Dashboard.
 * Never fabricates fallback counts; returns unavailable state on DB failure.
 */
export async function getAdminOverviewData(requestedSemesterId?: string): Promise<AdminOverviewData> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: semesters, error: semError } = await supabase
      .from("semesters")
      .select("*")
      .order("year", { ascending: false })
      .order("created_at", { ascending: false });

    if (semError) {
      return {
        available: false,
        errorMessage: `Unable to load semesters: ${semError.message}`,
        semesters: [],
        selectedSemester: null,
        activeSemester: null,
        metrics: {
          totalStudents: null,
          totalActiveAdvisors: null,
          totalAssignments: null,
          unassignedStudents: null,
          conflictingAssignments: null,
          pendingApplications: null,
          approvedApplications: null,
          rejectedApplications: null,
          paymentBreakdown: null,
        },
        recentImports: [],
        recentAuditLogs: [],
      };
    }

    const semesterList = (semesters || []) as SemesterRow[];
    const activeSemester = semesterList.find((s) => s.is_active) || null;
    const selectedSemester =
      (requestedSemesterId ? semesterList.find((s) => s.id === requestedSemesterId) : null) ||
      activeSemester ||
      semesterList[0] ||
      null;

    const semesterId = selectedSemester?.id;

    // Fetch core counts in parallel
    const [
      studentsRes,
      advisorsRes,
      assignmentsRes,
      registrationsRes,
      paymentsRes,
      importsRes,
      auditRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: false }).eq("role", "student"),
      supabase.from("advisor_profiles").select("id, is_active"),
      semesterId
        ? supabase
            .from("advisor_assignments")
            .select("id, student_id, advisor_id, advisor_profile_id, is_active")
            .eq("semester_id", semesterId)
        : Promise.resolve({ data: [], error: null }),
      semesterId
        ? supabase.from("registrations").select("id, status").eq("semester_id", semesterId)
        : Promise.resolve({ data: [], error: null }),
      semesterId
        ? supabase.from("payment_clearances").select("id, status").eq("semester_id", semesterId)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("advisor_roster_imports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const totalStudents = studentsRes.error ? null : (studentsRes.data?.length ?? 0);
    const activeAdvisors = advisorsRes.error
      ? null
      : ((advisorsRes.data || []) as { id: string; is_active: boolean }[]).filter((a) => a.is_active).length;

    const assignmentRows = (assignmentsRes.data || []) as {
      id: string;
      student_id: string;
      is_active: boolean;
    }[];
    const activeAssignments = assignmentsRes.error ? [] : assignmentRows.filter((a) => a.is_active);
    const totalAssignments = assignmentsRes.error ? null : activeAssignments.length;

    const assignedStudentSet = new Set(activeAssignments.map((a) => a.student_id));
    const studentIds = ((studentsRes.data || []) as { id: string }[]).map((s) => s.id);
    const unassignedStudents =
      studentsRes.error || assignmentsRes.error
        ? null
        : studentIds.filter((id) => !assignedStudentSet.has(id)).length;

    // Detect duplicate active assignments per student in the selected semester
    const countsByStudent = new Map<string, number>();
    for (const a of activeAssignments) {
      countsByStudent.set(a.student_id, (countsByStudent.get(a.student_id) || 0) + 1);
    }
    const conflictingAssignments = assignmentsRes.error
      ? null
      : Array.from(countsByStudent.values()).filter((c) => c > 1).length;

    const regRows = (registrationsRes.data || []) as { id: string; status: string }[];
    const pendingApplications = registrationsRes.error
      ? null
      : regRows.filter((r) => r.status === "pending_advisor").length;
    const approvedApplications = registrationsRes.error
      ? null
      : regRows.filter((r) => r.status === "approved").length;
    const rejectedApplications = registrationsRes.error
      ? null
      : regRows.filter((r) => r.status === "rejected").length;

    const paymentRows = (paymentsRes.data || []) as { id: string; status: string }[];
    const paymentBreakdown = paymentsRes.error
      ? null
      : {
          cleared: paymentRows.filter((p) => p.status === "cleared").length,
          awaiting: paymentRows.filter((p) => p.status === "awaiting_verification").length,
          notCleared: paymentRows.filter((p) => p.status === "not_cleared").length,
        };

    return {
      available: true,
      semesters: semesterList,
      selectedSemester,
      activeSemester,
      metrics: {
        totalStudents,
        totalActiveAdvisors: activeAdvisors,
        totalAssignments,
        unassignedStudents,
        conflictingAssignments,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        paymentBreakdown,
      },
      recentImports: (importsRes.error ? [] : importsRes.data || []) as RosterImportRow[],
      recentAuditLogs: (auditRes.error ? [] : auditRes.data || []) as AdminAuditLogRow[],
    };
  } catch (err: unknown) {
    return {
      available: false,
      errorMessage: err instanceof Error ? err.message : "Database connection unavailable.",
      semesters: [],
      selectedSemester: null,
      activeSemester: null,
      metrics: {
        totalStudents: null,
        totalActiveAdvisors: null,
        totalAssignments: null,
        unassignedStudents: null,
        conflictingAssignments: null,
        pendingApplications: null,
        approvedApplications: null,
        rejectedApplications: null,
        paymentBreakdown: null,
      },
      recentImports: [],
      recentAuditLogs: [],
    };
  }
}

/**
 * Fetches all advisor directory profiles with auth-link status and assignment aggregates.
 */
export async function getAdvisorDirectoryData(): Promise<{
  available: boolean;
  errorMessage?: string;
  advisors: AdvisorDirectoryItem[];
  departments: DepartmentRow[];
  semesters: SemesterRow[];
}> {
  try {
    const supabase = await getSupabaseServerClient();

    const [advisorsRes, assignmentsRes, studentsRes, departmentsRes, semestersRes] = await Promise.all([
      supabase.from("advisor_profiles").select("*").order("full_name", { ascending: true }),
      supabase
        .from("advisor_assignments")
        .select("id, advisor_id, advisor_profile_id, student_id, semester_id, is_active")
        .eq("is_active", true),
      supabase.from("profiles").select("id, batch").eq("role", "student"),
      supabase.from("departments").select("*").order("code", { ascending: true }),
      supabase.from("semesters").select("*").order("year", { ascending: false }),
    ]);

    if (advisorsRes.error) {
      return {
        available: false,
        errorMessage: `Unable to load advisor directory: ${advisorsRes.error.message}`,
        advisors: [],
        departments: [],
        semesters: [],
      };
    }

    const studentBatchMap = new Map<string, string>();
    for (const s of (studentsRes.data || []) as { id: string; batch: string | null }[]) {
      if (s.batch) studentBatchMap.set(s.id, s.batch);
    }

    const assignments = (assignmentsRes.data || []) as {
      id: string;
      advisor_id: string | null;
      advisor_profile_id: string | null;
      student_id: string;
      semester_id: string;
    }[];

    const advisors: AdvisorDirectoryItem[] = ((advisorsRes.data || []) as AdvisorProfileRow[]).map((adv) => {
      const matching = assignments.filter(
        (a) => a.advisor_profile_id === adv.id || (adv.profile_id && a.advisor_id === adv.profile_id)
      );
      const batchSet = new Set<string>();
      const semSet = new Set<string>();
      for (const m of matching) {
        semSet.add(m.semester_id);
        const batch = studentBatchMap.get(m.student_id);
        if (batch) batchSet.add(batch);
      }

      return {
        ...adv,
        authLinked: Boolean(adv.profile_id),
        assignedStudentCount: matching.length,
        assignedBatches: Array.from(batchSet).sort(),
        assignedSemesterIds: Array.from(semSet),
      };
    });

    return {
      available: true,
      advisors,
      departments: (departmentsRes.data || []) as DepartmentRow[],
      semesters: (semestersRes.data || []) as SemesterRow[],
    };
  } catch (err: unknown) {
    return {
      available: false,
      errorMessage: err instanceof Error ? err.message : "Failed to load advisor directory.",
      advisors: [],
      departments: [],
      semesters: [],
    };
  }
}

/**
 * Fetches batches with real student counts, advisor distribution, and eligible semesters.
 */
export async function getBatchDirectoryData(): Promise<{
  available: boolean;
  errorMessage?: string;
  batches: BatchDirectoryItem[];
  departments: DepartmentRow[];
}> {
  try {
    const supabase = await getSupabaseServerClient();

    const [batchesRes, studentsRes, assignmentsRes, bscRes, semestersRes, departmentsRes] = await Promise.all([
      supabase.from("batches").select("*").order("batch_label", { ascending: true }),
      supabase.from("profiles").select("id, batch, department_code").eq("role", "student"),
      supabase
        .from("advisor_assignments")
        .select("student_id, advisor_id, advisor_profile_id, is_active")
        .eq("is_active", true),
      supabase.from("batch_semester_courses").select("batch, semester_id"),
      supabase.from("semesters").select("*"),
      supabase.from("departments").select("*").order("code", { ascending: true }),
    ]);

    if (batchesRes.error) {
      return {
        available: false,
        errorMessage: `Unable to load batches: ${batchesRes.error.message}`,
        batches: [],
        departments: [],
      };
    }

    const semesterMap = new Map<string, SemesterRow>();
    for (const sem of (semestersRes.data || []) as SemesterRow[]) {
      semesterMap.set(sem.id, sem);
    }

    const students = (studentsRes.data || []) as {
      id: string;
      batch: string | null;
      department_code: string | null;
    }[];

    const assignments = (assignmentsRes.data || []) as {
      student_id: string;
      advisor_id: string | null;
      advisor_profile_id: string | null;
    }[];

    const assignmentByStudent = new Map<string, string>();
    for (const a of assignments) {
      const advisorKey = a.advisor_profile_id || a.advisor_id;
      if (advisorKey) assignmentByStudent.set(a.student_id, advisorKey);
    }

    const bscRows = (bscRes.data || []) as { batch: string; semester_id: string }[];

    const batches: BatchDirectoryItem[] = ((batchesRes.data || []) as BatchRow[]).map((b) => {
      const normLabel = b.batch_label.trim().toLowerCase();
      const normNum = b.batch_number?.trim().toLowerCase();

      const matchingStudents = students.filter((s) => {
        if (!s.batch) return false;
        const sb = s.batch.trim().toLowerCase();
        const matchesBatch = sb === normLabel || (normNum ? sb === normNum || sb.startsWith(`${normNum} `) : false);
        const matchesDept = !b.department_code || !s.department_code || b.department_code === s.department_code;
        return matchesBatch && matchesDept;
      });

      const advisorIds = new Set<string>();
      let assignedCount = 0;
      for (const st of matchingStudents) {
        const advKey = assignmentByStudent.get(st.id);
        if (advKey) {
          assignedCount++;
          advisorIds.add(advKey);
        }
      }

      const semNames = new Set<string>();
      for (const row of bscRows) {
        const rb = row.batch.trim().toLowerCase();
        if (rb === normLabel || (normNum && rb === normNum)) {
          const sem = semesterMap.get(row.semester_id);
          if (sem) semNames.add(formatSemesterLabel(sem));
        }
      }

      return {
        ...b,
        studentCount: matchingStudents.length,
        assignedStudentCount: assignedCount,
        advisorCount: advisorIds.size,
        eligibleSemesterNames: Array.from(semNames),
      };
    });

    return {
      available: true,
      batches,
      departments: (departmentsRes.data || []) as DepartmentRow[],
    };
  } catch (err: unknown) {
    return {
      available: false,
      errorMessage: err instanceof Error ? err.message : "Failed to load batch directory.",
      batches: [],
      departments: [],
    };
  }
}
