import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MOCK_COURSES, type ExtendedCourse } from "@/lib/mock/data";

export interface BatchSemesterCourseRecord {
  id: string;
  semesterId: string;
  batch: string;
  courseId: string;
  course: ExtendedCourse;
  createdAt: string;
  createdBy: string | null;
}

// In-memory registry of batch course configurations for instant development/test execution
// Seeded with DIU real curriculum distributions
let inMemoryBatchCourses: Array<{
  id: string;
  semester_id: string;
  batch: string;
  course_id: string;
  created_at: string;
  created_by: string | null;
}> = [
  // Spring 2027 (Active Term: sem-spring-2027)
  // Batch 69: Level 1 Foundation
  { id: "bc-69-1", semester_id: "sem-spring-2027", batch: "69", course_id: "course-cse110", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-69-2", semester_id: "sem-spring-2027", batch: "69", course_id: "course-cse111", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-69-3", semester_id: "sem-spring-2027", batch: "69", course_id: "course-mat101", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-69-4", semester_id: "sem-spring-2027", batch: "69", course_id: "course-eng101", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-69-5", semester_id: "sem-spring-2027", batch: "69", course_id: "course-phy111", created_at: "2027-01-10T00:00:00Z", created_by: null },

  // Batch 60: Level 2/3 Intermediate
  { id: "bc-60-1", semester_id: "sem-spring-2027", batch: "60", course_id: "course-cse221", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-60-2", semester_id: "sem-spring-2027", batch: "60", course_id: "course-cse222", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-60-3", semester_id: "sem-spring-2027", batch: "60", course_id: "course-cse225", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-60-4", semester_id: "sem-spring-2027", batch: "60", course_id: "course-cse226", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-60-5", semester_id: "sem-spring-2027", batch: "60", course_id: "course-cse311", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-60-6", semester_id: "sem-spring-2027", batch: "60", course_id: "course-mat205", created_at: "2027-01-10T00:00:00Z", created_by: null },

  // Batch 70: New Intake
  { id: "bc-70-1", semester_id: "sem-spring-2027", batch: "70", course_id: "course-cse110", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-70-2", semester_id: "sem-spring-2027", batch: "70", course_id: "course-cse111", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-70-3", semester_id: "sem-spring-2027", batch: "70", course_id: "course-eng101", created_at: "2027-01-10T00:00:00Z", created_by: null },

  // Batch 59: Senior / Level 4
  { id: "bc-59-1", semester_id: "sem-spring-2027", batch: "59", course_id: "course-cse323", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-59-2", semester_id: "sem-spring-2027", batch: "59", course_id: "course-cse412", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-59-3", semester_id: "sem-spring-2027", batch: "59", course_id: "course-cse425", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-59-4", semester_id: "sem-spring-2027", batch: "59", course_id: "course-swe312", created_at: "2027-01-10T00:00:00Z", created_by: null },
  { id: "bc-59-5", semester_id: "sem-spring-2027", batch: "59", course_id: "course-cse499", created_at: "2027-01-10T00:00:00Z", created_by: null },
];

/**
 * Normalizes batch format (e.g. "69th Batch" -> "69", "Batch 69" -> "69", "69" -> "69")
 */
export function normalizeBatch(batchStr?: string | null): string {
  if (!batchStr) return "69";
  const matched = batchStr.match(/\d+/);
  return matched ? matched[0] : batchStr.trim();
}

/**
 * Retrieves courses configured for a specific batch and semester.
 */
export async function getBatchSemesterCourses(
  semesterId: string = "sem-spring-2027",
  rawBatch: string = "69"
): Promise<BatchSemesterCourseRecord[]> {
  const normBatch = normalizeBatch(rawBatch);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("batch_semester_courses")
        .select(`
          id,
          semester_id,
          batch,
          course_id,
          created_at,
          created_by,
          courses (*)
        `)
        .eq("semester_id", semesterId)
        .eq("batch", normBatch);

      if (!error && data && data.length > 0) {
        return (data as unknown as Array<{
          id: string;
          semester_id: string;
          batch: string;
          course_id: string;
          created_at: string;
          created_by: string | null;
          courses: (ExtendedCourse & { is_active?: boolean }) | null;
        }>)
          .filter((row) => row.courses && row.courses.is_active !== false)
          .map((row) => ({
            id: row.id,
            semesterId: row.semester_id,
            batch: row.batch,
            courseId: row.course_id,
            course: row.courses || MOCK_COURSES.find((c) => c.id === row.course_id) || MOCK_COURSES[0],
            createdAt: row.created_at,
            createdBy: row.created_by,
          }));
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  // In-memory fallback
  const matching = inMemoryBatchCourses.filter(
    (bc) => bc.semester_id === semesterId && bc.batch === normBatch
  );

  return matching.map((bc) => {
    const course = MOCK_COURSES.find((c) => c.id === bc.course_id) || MOCK_COURSES[0];
    return {
      id: bc.id,
      semesterId: bc.semester_id,
      batch: bc.batch,
      courseId: bc.course_id,
      course,
      createdAt: bc.created_at,
      createdBy: bc.created_by,
    };
  });
}

/**
 * Checks whether a course is strictly configured and eligible for a student's batch & semester.
 * If no batch-specific courses are configured yet for that cohort/semester, all active catalog courses are eligible.
 */
export async function isCourseEligibleForBatch(
  semesterId: string,
  rawBatch: string,
  courseIdOrCode: string
): Promise<boolean> {
  const courses = await getBatchSemesterCourses(semesterId, rawBatch);
  if (courses.length === 0) {
    return true;
  }
  return courses.some(
    (c) => c.courseId === courseIdOrCode || c.course.code.toLowerCase() === courseIdOrCode.toLowerCase()
  );
}

/**
 * Retrieves all active courses from the university curriculum catalog.
 */
export async function getAllActiveCatalogCourses(): Promise<ExtendedCourse[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as unknown as ExtendedCourse[];
      }
    } catch {
      // Fallback to seeded catalog
    }
  }
  return MOCK_COURSES.filter((c) => (c as { is_active?: boolean }).is_active !== false);
}

/**
 * Adds a course to a batch & semester configuration (Admin Action).
 */
export async function addCourseToBatchConfig(
  semesterId: string,
  rawBatch: string,
  courseId: string,
  actorId: string | null = null
): Promise<{ success: boolean; error?: string; record?: BatchSemesterCourseRecord }> {
  const normBatch = normalizeBatch(rawBatch);

  // Validate course exists
  const targetCourse = MOCK_COURSES.find((c) => c.id === courseId || c.code === courseId);
  if (!targetCourse) {
    return { success: false, error: `Course identifier '${courseId}' was not found in curriculum.` };
  }

  // Prevent duplicate assignment
  const existing = inMemoryBatchCourses.some(
    (bc) => bc.semester_id === semesterId && bc.batch === normBatch && bc.course_id === targetCourse.id
  );
  if (existing) {
    return { success: false, error: `${targetCourse.code} is already configured for Batch ${normBatch} in this semester.` };
  }

  const newId = `bc-${normBatch}-${Date.now()}`;
  const newRow = {
    id: newId,
    semester_id: semesterId,
    batch: normBatch,
    course_id: targetCourse.id,
    created_at: new Date().toISOString(),
    created_by: actorId,
  };

  inMemoryBatchCourses.push(newRow);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from("batch_semester_courses").insert({
        semester_id: semesterId,
        batch: normBatch,
        course_id: targetCourse.id,
        created_by: actorId,
      });
    } catch {
      // Keep in-memory
    }
  }

  return {
    success: true,
    record: {
      id: newId,
      semesterId,
      batch: normBatch,
      courseId: targetCourse.id,
      course: targetCourse,
      createdAt: newRow.created_at,
      createdBy: actorId,
    },
  };
}

/**
 * Removes a course from a batch & semester configuration (Admin Action).
 */
export async function removeCourseFromBatchConfig(
  semesterId: string,
  rawBatch: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const normBatch = normalizeBatch(rawBatch);

  const prevLen = inMemoryBatchCourses.length;
  inMemoryBatchCourses = inMemoryBatchCourses.filter(
    (bc) => !(bc.semester_id === semesterId && bc.batch === normBatch && (bc.course_id === courseId || bc.id === courseId))
  );

  if (inMemoryBatchCourses.length === prevLen) {
    return { success: false, error: "Course assignment not found for this batch and semester." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase
        .from("batch_semester_courses")
        .delete()
        .eq("semester_id", semesterId)
        .eq("batch", normBatch)
        .eq("course_id", courseId);
    } catch {
      // Keep in-memory
    }
  }

  return { success: true };
}
