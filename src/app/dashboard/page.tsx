import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { StudentHomeView, type AssignedAdvisorSummary } from "@/components/student/student-home-view";
import { getStudentPaymentClearance } from "@/lib/payment/payment-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { RegistrationStatus } from "@/types/database";

export default async function DashboardPage() {
  const { user, profile } = await requireOnboarded("/dashboard");

  let activeSemesterId = "";
  let activeSemesterLabel = "No Active Semester";
  let registrationWindowLabel = "Schedule pending";
  let registrationStatus: RegistrationStatus | "not_submitted" = "not_submitted";
  let assignedAdvisor: AssignedAdvisorSummary | null = null;

  try {
    const supabase = await getSupabaseServerClient();

    const { data: activeSem } = await supabase
      .from("semesters")
      .select("id, name, season, year, registration_starts_at, registration_ends_at")
      .eq("is_active", true)
      .maybeSingle();

    if (activeSem) {
      const sem = activeSem as {
        id: string;
        name?: string | null;
        season: string;
        year: number;
        registration_starts_at: string | null;
        registration_ends_at: string | null;
      };
      activeSemesterId = sem.id;
      activeSemesterLabel =
        sem.name || `${sem.season.charAt(0).toUpperCase() + sem.season.slice(1)} ${sem.year}`;

      if (sem.registration_starts_at && sem.registration_ends_at) {
        const start = new Date(sem.registration_starts_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const end = new Date(sem.registration_ends_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        registrationWindowLabel = `${start} – ${end}`;
      }

      const [regRes, asgRes] = await Promise.all([
        supabase
          .from("registrations")
          .select("status")
          .eq("student_id", profile.id)
          .eq("semester_id", sem.id)
          .maybeSingle(),
        supabase
          .from("advisor_assignments")
          .select("advisor_id, advisor_profile_id")
          .eq("student_id", profile.id)
          .eq("semester_id", sem.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (regRes.data) {
        registrationStatus = (regRes.data as { status: RegistrationStatus }).status;
      }

      let asg = asgRes.data as { advisor_id: string | null; advisor_profile_id: string | null } | null;
      if (!asg && profile.diu_id) {
        try {
          const { data: matchedAdvProfileId } = await (
            supabase.rpc as unknown as (
              fn: string,
              args: Record<string, unknown>
            ) => Promise<{ data: string | null }>
          )("resolve_student_advisor_from_rules", { p_semester_id: sem.id });

          if (matchedAdvProfileId) {
            asg = { advisor_id: null, advisor_profile_id: matchedAdvProfileId };
          }
        } catch {
          // Ignore if RPC is not yet deployed
        }
      }

      if (asg?.advisor_profile_id) {
        const { data: advProf } = await supabase
          .from("advisor_profiles")
          .select("full_name, designation, email, phone, department_code, room_number, schedule")
          .eq("id", asg.advisor_profile_id)
          .maybeSingle();
        if (advProf) {
          const ap = advProf as {
            full_name: string;
            designation: string | null;
            email: string;
            phone: string | null;
            department_code: string | null;
            room_number: string | null;
            schedule: string | null;
          };
          assignedAdvisor = {
            fullName: ap.full_name,
            designation: ap.designation,
            email: ap.email,
            phone: ap.phone,
            departmentCode: ap.department_code,
            roomNumber: ap.room_number,
            schedule: ap.schedule,
          };
        }
      } else if (asg?.advisor_id) {
        const { data: advUser } = await supabase
          .from("profiles")
          .select("full_name, email, department_code")
          .eq("id", asg.advisor_id)
          .maybeSingle();
        if (advUser) {
          const au = advUser as { full_name: string; email: string; department_code: string | null };
          assignedAdvisor = {
            fullName: au.full_name,
            designation: null,
            email: au.email,
            phone: null,
            departmentCode: au.department_code,
            roomNumber: null,
            schedule: null,
          };
        }
      }
    }
  } catch {
    // Graceful degradation; never inject mock advisor or mock semester
  }

  const paymentClearance = activeSemesterId
    ? await getStudentPaymentClearance(profile.id, activeSemesterId)
    : null;

  return (
    <AppShell user={user} profile={profile}>
      <StudentHomeView
        profile={profile}
        paymentClearance={paymentClearance}
        assignedAdvisor={assignedAdvisor}
        activeSemesterLabel={activeSemesterLabel}
        registrationWindowLabel={registrationWindowLabel}
        registrationStatus={registrationStatus}
        isDev={process.env.NODE_ENV !== "production"}
      />
    </AppShell>
  );
}
