import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MOCK_STUDENT_PROFILE, MOCK_ADVISEE_QUEUE } from "@/lib/mock/data";

export type PaymentStatus = "awaiting_verification" | "cleared" | "not_cleared";

export interface PaymentClearanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentDiuId: string;
  studentBatch: string;
  semesterId: string;
  status: PaymentStatus;
  referenceCode: string | null;
  notes: string | null;
  verifiedBy: string | null;
  verifiedByName?: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAuditRecord {
  id: string;
  clearanceId: string | null;
  studentId: string;
  semesterId: string;
  previousStatus: string | null;
  newStatus: string;
  actorId: string | null;
  actorName?: string;
  notes: string | null;
  createdAt: string;
}

// In-memory registry for development and mock session consistency
const inMemoryPaymentClearances: PaymentClearanceRecord[] = [
  {
    id: "pay-clr-001",
    studentId: MOCK_STUDENT_PROFILE.id, // Siyam
    studentName: MOCK_STUDENT_PROFILE.full_name,
    studentDiuId: MOCK_STUDENT_PROFILE.diu_id || "221-15-5678",
    studentBatch: MOCK_STUDENT_PROFILE.batch || "60",
    semesterId: "sem-spring-2027",
    status: "cleared",
    referenceCode: "DIU-AC-2027-4561",
    notes: "Verified minimum 50% semester registration advance via Bank Asia branch.",
    verifiedBy: "admin-finance-01",
    verifiedByName: "Accounts Officer (Finance & Accounts)",
    verifiedAt: "2027-02-10T11:30:00Z",
    createdAt: "2027-02-09T09:00:00Z",
    updatedAt: "2027-02-10T11:30:00Z",
  },
  {
    id: "pay-clr-002",
    studentId: "student-advisee-002", // Nusrat Jahan
    studentName: "Nusrat Jahan",
    studentDiuId: "221-15-5679",
    studentBatch: "60",
    semesterId: "sem-spring-2027",
    status: "cleared",
    referenceCode: "DIU-AC-2027-4572",
    notes: "Full term payment verified.",
    verifiedBy: "admin-finance-01",
    verifiedByName: "Accounts Officer (Finance & Accounts)",
    verifiedAt: "2027-02-10T12:00:00Z",
    createdAt: "2027-02-09T10:00:00Z",
    updatedAt: "2027-02-10T12:00:00Z",
  },
  {
    id: "pay-clr-003",
    studentId: "student-advisee-003", // Tanvir Hasan
    studentName: "Tanvir Hasan",
    studentDiuId: "221-15-5680",
    studentBatch: "60",
    semesterId: "sem-spring-2027",
    status: "not_cleared",
    referenceCode: null,
    notes: "Accounts tuition hold: Outstanding previous semester fees pending clearance.",
    verifiedBy: "admin-finance-01",
    verifiedByName: "Accounts Officer (Finance & Accounts)",
    verifiedAt: "2027-02-11T09:15:00Z",
    createdAt: "2027-02-09T10:30:00Z",
    updatedAt: "2027-02-11T09:15:00Z",
  },
  {
    id: "pay-clr-004",
    studentId: "student-advisee-004", // Mehedi Hasan
    studentName: "Mehedi Hasan",
    studentDiuId: "221-15-5681",
    studentBatch: "60",
    semesterId: "sem-spring-2027",
    status: "awaiting_verification",
    referenceCode: "DIU-AC-2027-9912",
    notes: "Slip uploaded via portal; awaiting accounts verification.",
    verifiedBy: null,
    verifiedAt: null,
    createdAt: "2027-02-12T08:00:00Z",
    updatedAt: "2027-02-12T08:00:00Z",
  },
];

const inMemoryPaymentAudit: PaymentAuditRecord[] = [
  {
    id: "audit-pay-001",
    clearanceId: "pay-clr-001",
    studentId: MOCK_STUDENT_PROFILE.id,
    semesterId: "sem-spring-2027",
    previousStatus: "awaiting_verification",
    newStatus: "cleared",
    actorId: "admin-finance-01",
    actorName: "Accounts Officer (Finance & Accounts)",
    notes: "Verified minimum 50% semester advance.",
    createdAt: "2027-02-10T11:30:00Z",
  },
  {
    id: "audit-pay-002",
    clearanceId: "pay-clr-003",
    studentId: "student-advisee-003",
    semesterId: "sem-spring-2027",
    previousStatus: "awaiting_verification",
    newStatus: "not_cleared",
    actorId: "admin-finance-01",
    actorName: "Accounts Officer (Finance & Accounts)",
    notes: "Accounts tuition hold placed due to prior dues.",
    createdAt: "2027-02-11T09:15:00Z",
  },
];

/**
 * Retrieves payment clearance status for a student in a semester.
 */
export async function getStudentPaymentClearance(
  studentId: string,
  semesterId: string = "sem-spring-2027"
): Promise<PaymentClearanceRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("payment_clearances")
        .select(`
          id,
          student_id,
          semester_id,
          status,
          reference_code,
          notes,
          verified_by,
          verified_at,
          created_at,
          updated_at,
          profiles!student_id (full_name, diu_id, batch)
        `)
        .eq("student_id", studentId)
        .eq("semester_id", semesterId)
        .maybeSingle();

      if (!error && data) {
        const student = (data as unknown as { profiles: { full_name?: string; diu_id?: string; batch?: string } | null }).profiles;
        return {
          id: data.id,
          studentId: data.student_id,
          studentName: student?.full_name || "Enrolled Student",
          studentDiuId: student?.diu_id || "221-15-XXXXX",
          studentBatch: student?.batch || "60",
          semesterId: data.semester_id,
          status: data.status as PaymentStatus,
          referenceCode: data.reference_code,
          notes: data.notes,
          verifiedBy: data.verified_by,
          verifiedAt: data.verified_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fall through to in-memory
    }
  }

  // Fallback to in-memory store
  const match = inMemoryPaymentClearances.find(
    (p) => p.studentId === studentId && p.semesterId === semesterId
  );

  return match || null;
}

/**
 * Lists all student payment clearances for a semester (Admin Center).
 */
export async function listPaymentClearances(
  semesterId: string = "sem-spring-2027",
  statusFilter: string = "ALL",
  searchQuery: string = ""
): Promise<PaymentClearanceRecord[]> {
  let list = inMemoryPaymentClearances.filter((p) => p.semesterId === semesterId);

  if (statusFilter !== "ALL") {
    list = list.filter((p) => p.status === statusFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentDiuId.toLowerCase().includes(q) ||
        (p.referenceCode && p.referenceCode.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Updates a student's payment clearance status (Admin Only).
 */
export async function updatePaymentClearanceStatus(
  studentId: string,
  semesterId: string = "sem-spring-2027",
  status: PaymentStatus,
  notes: string = "",
  actorId: string = "admin-user-id"
): Promise<{ success: boolean; error?: string; record?: PaymentClearanceRecord }> {
  const existingIndex = inMemoryPaymentClearances.findIndex(
    (p) => p.studentId === studentId && p.semesterId === semesterId
  );

  const prevStatus = existingIndex >= 0 ? inMemoryPaymentClearances[existingIndex].status : null;
  const now = new Date().toISOString();

  let updatedRecord: PaymentClearanceRecord;

  if (existingIndex >= 0) {
    updatedRecord = {
      ...inMemoryPaymentClearances[existingIndex],
      status,
      notes: notes.trim() || inMemoryPaymentClearances[existingIndex].notes,
      verifiedBy: actorId,
      verifiedByName: "Accounts Officer (Finance & Accounts)",
      verifiedAt: status === "awaiting_verification" ? null : now,
      updatedAt: now,
    };
    inMemoryPaymentClearances[existingIndex] = updatedRecord;
  } else {
    // Look up student details from queue/mock
    const student =
      MOCK_ADVISEE_QUEUE.find((a) => a.student.id === studentId)?.student ||
      MOCK_STUDENT_PROFILE;

    updatedRecord = {
      id: `pay-clr-${Date.now()}`,
      studentId,
      studentName: student.full_name,
      studentDiuId: student.diu_id || "221-15-XXXXX",
      studentBatch: student.batch || "60",
      semesterId,
      status,
      referenceCode: `DIU-AC-2027-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: notes.trim() || "Payment status updated by Administrator.",
      verifiedBy: actorId,
      verifiedByName: "Accounts Officer (Finance & Accounts)",
      verifiedAt: status === "awaiting_verification" ? null : now,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryPaymentClearances.push(updatedRecord);
  }

  // Append audit trail
  inMemoryPaymentAudit.unshift({
    id: `audit-pay-${Date.now()}`,
    clearanceId: updatedRecord.id,
    studentId,
    semesterId,
    previousStatus: prevStatus,
    newStatus: status,
    actorId,
    actorName: "Accounts Officer (Finance & Accounts)",
    notes: notes.trim() || null,
    createdAt: now,
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from("payment_clearances").upsert(
        {
          student_id: studentId,
          semester_id: semesterId,
          status,
          notes: notes.trim() || null,
          verified_by: actorId,
          verified_at: status === "awaiting_verification" ? null : now,
          updated_at: now,
        },
        { onConflict: "student_id,semester_id" }
      );

      await supabase.from("payment_clearance_audit").insert({
        clearance_id: updatedRecord.id,
        student_id: studentId,
        semester_id: semesterId,
        previous_status: prevStatus,
        new_status: status,
        actor_id: actorId,
        notes: notes.trim() || null,
      });
    } catch {
      // In-memory already updated
    }
  }

  return { success: true, record: updatedRecord };
}

/**
 * Retrieves payment audit trail records.
 */
export async function getPaymentAuditTrail(
  studentId?: string,
  semesterId: string = "sem-spring-2027"
): Promise<PaymentAuditRecord[]> {
  let list = inMemoryPaymentAudit.filter((a) => a.semesterId === semesterId);
  if (studentId) {
    list = list.filter((a) => a.studentId === studentId);
  }
  return list;
}
