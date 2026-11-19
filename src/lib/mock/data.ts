/**
 * ========================================================================
 * PHASE 1 MOCK DATA — ISOLATED PROTOTYPE USE ONLY
 * ========================================================================
 * This module provides isolated demonstration data for UI prototyping.
 * All course codes, faculty names, and academic records are SYNTHETIC
 * representations conforming to DIU academic standards.
 * They do NOT represent real individual records from the live university database.
 * Real data integration will occur in Phase 2+ via Supabase queries.
 * ========================================================================
 */

import type {
  Database,
} from "@/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
export type SemesterRow = Database["public"]["Tables"]["semesters"]["Row"];
export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
export type RegistrationRow = Database["public"]["Tables"]["registrations"]["Row"];
export type RegistrationItemRow = Database["public"]["Tables"]["registration_items"]["Row"];
export type AuthorizedEmailRow = Database["public"]["Tables"]["authorized_emails"]["Row"];
export type EmailAuthorizationAuditRow = Database["public"]["Tables"]["email_authorization_audit"]["Row"];

export interface ExtendedCourse extends CourseRow {
  department_name?: string;
  category?: "Core" | "Major Elective" | "General Education" | "Basic Science";
  level?: 1 | 2 | 3 | 4;
  enrollment_type?: "regular" | "retake" | "backlog";
  retake_note?: string;
}

export interface ExtendedSection extends SectionRow {
  course_code?: string;
  course_title?: string;
  credits?: number;
}

export interface StudentRegistrationApplication {
  registration: RegistrationRow;
  student: ProfileRow;
  semester: SemesterRow;
  items: Array<{
    item: RegistrationItemRow;
    section: ExtendedSection;
    course: CourseRow;
  }>;
  totalCredits: number;
  totalCourses: number;
  hasScheduleConflict?: boolean;
  hasPrerequisiteConflict?: boolean;
  isProbation?: boolean;
  isUnderReview?: boolean;
  formattedApplicationDate?: string;
}

// ---------------------------------------------------------------------------
// 1. DEPARTMENTS
// ---------------------------------------------------------------------------
export const MOCK_DEPARTMENTS: DepartmentRow[] = [
  {
    id: "dept-cse-01",
    code: "CSE",
    name: "Computer Science and Engineering",
    faculty: "Faculty of Science and Information Technology (FSIT)",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "dept-swe-02",
    code: "SWE",
    name: "Software Engineering",
    faculty: "Faculty of Science and Information Technology (FSIT)",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "dept-eee-03",
    code: "EEE",
    name: "Electrical and Electronic Engineering",
    faculty: "Faculty of Engineering (FE)",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "dept-bba-04",
    code: "BBA",
    name: "Business Administration",
    faculty: "Faculty of Business and Entrepreneurship (FBE)",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "dept-eng-05",
    code: "ENG",
    name: "English",
    faculty: "Faculty of Humanities and Social Science (FHSS)",
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
export const ACTIVE_MOCK_SEMESTER_LABEL = "Spring 2027";
export const ACTIVE_MOCK_SEMESTER_CODE = "2027-1";
export const ACTIVE_MOCK_REGISTRATION_WINDOW = "Apr 14 – Apr 20, 2027";

// ---------------------------------------------------------------------------
// 2. SEMESTERS (Unified to Spring 2027 active registration)
// ---------------------------------------------------------------------------
export const MOCK_CURRENT_SEMESTER: SemesterRow = {
  id: "sem-spring-2027",
  year: 2027,
  season: "spring",
  is_active: true,
  registration_starts_at: "2027-04-14T00:00:00Z",
  registration_ends_at: "2027-04-20T23:59:59Z",
  created_at: "2027-02-01T00:00:00Z",
};

export const MOCK_PAST_SEMESTERS: SemesterRow[] = [
  {
    id: "sem-fall-2025",
    year: 2025,
    season: "fall",
    is_active: false,
    registration_starts_at: "2025-08-15T00:00:00Z",
    registration_ends_at: "2025-09-05T23:59:59Z",
    created_at: "2025-07-01T00:00:00Z",
  },
  {
    id: "sem-summer-2025",
    year: 2025,
    season: "summer",
    is_active: false,
    registration_starts_at: "2025-04-10T00:00:00Z",
    registration_ends_at: "2025-05-01T23:59:59Z",
    created_at: "2025-03-01T00:00:00Z",
  },
  {
    id: "sem-spring-2025",
    year: 2025,
    season: "spring",
    is_active: false,
    registration_starts_at: "2025-01-05T00:00:00Z",
    registration_ends_at: "2025-01-25T23:59:59Z",
    created_at: "2024-11-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// 3. COURSES (Authentic DIU Curriculum Structure)
// ---------------------------------------------------------------------------
export const MOCK_COURSES: ExtendedCourse[] = [
  // Level 1: Foundations
  {
    id: "course-cse110",
    code: "CSE110",
    title: "Structured Programming Language",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: [],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse110.pdf",
    category: "Core",
    level: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse111",
    code: "CSE111",
    title: "Structured Programming Language Lab",
    credits: 1.5,
    department_code: "CSE",
    prerequisite_codes: [],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse111.pdf",
    category: "Core",
    level: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-mat101",
    code: "MAT101",
    title: "Differential and Integral Calculus",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: [],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/mat101.pdf",
    category: "Basic Science",
    level: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-eng101",
    code: "ENG101",
    title: "Basic English Language Skills",
    credits: 3.0,
    department_code: "ENG",
    prerequisite_codes: [],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/eng101.pdf",
    category: "General Education",
    level: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-phy111",
    code: "PHY111",
    title: "Physics: Mechanics, Waves and Optics",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: [],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/phy111.pdf",
    category: "Basic Science",
    level: 1,
    created_at: "2026-01-01T00:00:00Z",
  },

  // Level 2: Core Fundamentals
  {
    id: "course-cse122",
    code: "CSE122",
    title: "Data Structures",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE110"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse122.pdf",
    category: "Core",
    level: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse123",
    code: "CSE123",
    title: "Data Structures Lab",
    credits: 1.5,
    department_code: "CSE",
    prerequisite_codes: ["CSE111"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse123.pdf",
    category: "Core",
    level: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse213",
    code: "CSE213",
    title: "Object-Oriented Programming (Java)",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE110"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse213.pdf",
    category: "Core",
    level: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-mat205",
    code: "MAT205",
    title: "Linear Algebra and Complex Variables",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["MAT101"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/mat205.pdf",
    category: "Basic Science",
    level: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse214",
    code: "CSE214",
    title: "Discrete Mathematics",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["MAT101"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse214.pdf",
    category: "Core",
    level: 2,
    created_at: "2026-01-01T00:00:00Z",
  },

  // Level 3: Advanced Core
  {
    id: "course-cse221",
    code: "CSE221",
    title: "Algorithms Design and Analysis",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE122", "CSE214"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse221.pdf",
    category: "Core",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse222",
    code: "CSE222",
    title: "Algorithms Design and Analysis Lab",
    credits: 1.5,
    department_code: "CSE",
    prerequisite_codes: ["CSE123"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse222.pdf",
    category: "Core",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse225",
    code: "CSE225",
    title: "Database Management Systems",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE122"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse225.pdf",
    category: "Core",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse226",
    code: "CSE226",
    title: "Database Management Systems Lab",
    credits: 1.5,
    department_code: "CSE",
    prerequisite_codes: ["CSE122"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse226.pdf",
    category: "Core",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse311",
    code: "CSE311",
    title: "Operating Systems",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE122"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse311.pdf",
    category: "Core",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },

  // Level 4: Senior Capstones & Electives
  {
    id: "course-cse323",
    code: "CSE323",
    title: "Computer Networks",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE221"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse323.pdf",
    category: "Core",
    level: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse412",
    code: "CSE412",
    title: "Artificial Intelligence and Machine Learning",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE221", "MAT205"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse412.pdf",
    category: "Major Elective",
    level: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse425",
    code: "CSE425",
    title: "Web and Mobile Application Development",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE213", "CSE225"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse425.pdf",
    category: "Major Elective",
    level: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-swe312",
    code: "SWE312",
    title: "Software Quality Assurance and Testing",
    credits: 3.0,
    department_code: "SWE",
    prerequisite_codes: ["CSE213"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/swe312.pdf",
    category: "Major Elective",
    level: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-cse499",
    code: "CSE499",
    title: "Senior Capstone Project / Thesis",
    credits: 3.0,
    department_code: "CSE",
    prerequisite_codes: ["CSE311", "CSE221"],
    syllabus_url: "https://faculty.diu.edu.bd/syllabus/cse499.pdf",
    category: "Core",
    level: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// 4. SECTIONS (Spring 2026 Offerings with DIU Slot System)
// ---------------------------------------------------------------------------
export const MOCK_SECTIONS: ExtendedSection[] = [
  // CSE221: Algorithms
  {
    id: "sec-cse221-a",
    course_id: "course-cse221",
    semester_id: "sem-spring-2026",
    section_name: "60_A",
    capacity: 40,
    enrolled_count: 36,
    room: "AB4-601",
    schedule: [
      { day: "Sunday", start_time: "08:30", end_time: "10:00", room: "AB4-601" },
      { day: "Tuesday", start_time: "08:30", end_time: "10:00", room: "AB4-601" },
    ],
    instructor_name: "Dr. Syed Akhter Hossain",
    course_code: "CSE221",
    course_title: "Algorithms Design and Analysis",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "sec-cse221-b",
    course_id: "course-cse221",
    semester_id: "sem-spring-2026",
    section_name: "60_B",
    capacity: 40,
    enrolled_count: 40, // FULL
    room: "AB4-602",
    schedule: [
      { day: "Sunday", start_time: "10:00", end_time: "11:30", room: "AB4-602" },
      { day: "Tuesday", start_time: "10:00", end_time: "11:30", room: "AB4-602" },
    ],
    instructor_name: "Prof. Dr. Sheak Rashed Haider Noori",
    course_code: "CSE221",
    course_title: "Algorithms Design and Analysis",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "sec-cse221-c",
    course_id: "course-cse221",
    semester_id: "sem-spring-2026",
    section_name: "60_C",
    capacity: 40,
    enrolled_count: 22,
    room: "AB4-603",
    schedule: [
      { day: "Monday", start_time: "11:30", end_time: "13:00", room: "AB4-603" },
      { day: "Wednesday", start_time: "11:30", end_time: "13:00", room: "AB4-603" },
    ],
    instructor_name: "Ms. Lamia Sultana",
    course_code: "CSE221",
    course_title: "Algorithms Design and Analysis",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE222: Algorithms Lab
  {
    id: "sec-cse222-a",
    course_id: "course-cse222",
    semester_id: "sem-spring-2026",
    section_name: "60_A_L",
    capacity: 35,
    enrolled_count: 31,
    room: "CS-Lab 3",
    schedule: [
      { day: "Thursday", start_time: "08:30", end_time: "11:30", room: "CS-Lab 3" },
    ],
    instructor_name: "Mr. Md. Shahriar Hossain",
    course_code: "CSE222",
    course_title: "Algorithms Design and Analysis Lab",
    credits: 1.5,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE225: Database Systems
  {
    id: "sec-cse225-a",
    course_id: "course-cse225",
    semester_id: "sem-spring-2026",
    section_name: "60_A",
    capacity: 40,
    enrolled_count: 38, // ALMOST FULL
    room: "AB4-501",
    schedule: [
      { day: "Sunday", start_time: "11:30", end_time: "13:00", room: "AB4-501" },
      { day: "Tuesday", start_time: "11:30", end_time: "13:00", room: "AB4-501" },
    ],
    instructor_name: "Dr. Firoz Mridha",
    course_code: "CSE225",
    course_title: "Database Management Systems",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "sec-cse225-b",
    course_id: "course-cse225",
    semester_id: "sem-spring-2026",
    section_name: "60_B",
    capacity: 40,
    enrolled_count: 18,
    room: "AB4-502",
    schedule: [
      { day: "Monday", start_time: "08:30", end_time: "10:00", room: "AB4-502" },
      { day: "Wednesday", start_time: "08:30", end_time: "10:00", room: "AB4-502" },
    ],
    instructor_name: "Mr. Tanvir Rahman",
    course_code: "CSE225",
    course_title: "Database Management Systems",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE226: Database Lab
  {
    id: "sec-cse226-a",
    course_id: "course-cse226",
    semester_id: "sem-spring-2026",
    section_name: "60_A_L",
    capacity: 35,
    enrolled_count: 29,
    room: "CS-Lab 5",
    schedule: [
      { day: "Monday", start_time: "14:30", end_time: "17:30", room: "CS-Lab 5" },
    ],
    instructor_name: "Mr. Tanvir Rahman",
    course_code: "CSE226",
    course_title: "Database Management Systems Lab",
    credits: 1.5,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE311: Operating Systems
  {
    id: "sec-cse311-a",
    course_id: "course-cse311",
    semester_id: "sem-spring-2026",
    section_name: "59_A",
    capacity: 40,
    enrolled_count: 35,
    room: "AB4-401",
    schedule: [
      { day: "Saturday", start_time: "10:00", end_time: "11:30", room: "AB4-401" },
      { day: "Wednesday", start_time: "10:00", end_time: "11:30", room: "AB4-401" },
    ],
    instructor_name: "Dr. Touhid Bhuiyan",
    course_code: "CSE311",
    course_title: "Operating Systems",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE412: AI & Machine Learning
  {
    id: "sec-cse412-a",
    course_id: "course-cse412",
    semester_id: "sem-spring-2026",
    section_name: "58_A",
    capacity: 35,
    enrolled_count: 34, // ALMOST FULL
    room: "AB3-301",
    schedule: [
      { day: "Saturday", start_time: "11:30", end_time: "13:00", room: "AB3-301" },
      { day: "Tuesday", start_time: "14:30", end_time: "16:00", room: "AB3-301" },
    ],
    instructor_name: "Dr. Md. Ismail Jabiullah",
    course_code: "CSE412",
    course_title: "Artificial Intelligence and Machine Learning",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },

  // CSE425: Web & Mobile App Dev
  {
    id: "sec-cse425-a",
    course_id: "course-cse425",
    semester_id: "sem-spring-2026",
    section_name: "58_A",
    capacity: 40,
    enrolled_count: 24,
    room: "AB4-503",
    schedule: [
      { day: "Sunday", start_time: "14:30", end_time: "16:00", room: "AB4-503" },
      { day: "Thursday", start_time: "11:30", end_time: "13:00", room: "AB4-503" },
    ],
    instructor_name: "Mr. Al-Amin Biswas",
    course_code: "CSE425",
    course_title: "Web and Mobile Application Development",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },

  // SWE312: Software QA
  {
    id: "sec-swe312-a",
    course_id: "course-swe312",
    semester_id: "sem-spring-2026",
    section_name: "59_A",
    capacity: 35,
    enrolled_count: 15,
    room: "AB3-202",
    schedule: [
      { day: "Monday", start_time: "10:00", end_time: "11:30", room: "AB3-202" },
      { day: "Wednesday", start_time: "14:30", end_time: "16:00", room: "AB3-202" },
    ],
    instructor_name: "Mr. Imran Hossain",
    course_code: "SWE312",
    course_title: "Software Quality Assurance and Testing",
    credits: 3.0,
    created_at: "2026-11-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// 5. PROFILES (Demo Student & Advisor)
// ---------------------------------------------------------------------------
export const MOCK_STUDENT_PROFILE: ProfileRow = {
  id: "student-siyam-01",
  diu_id: "221-15-12345",
  full_name: "Siyam Ahmed",
  email: "siyam.cse@diu.edu.bd",
  role: "student",
  department_code: "CSE",
  cgpa: 3.68,
  completed_credits: 78,
  phone: "+8801712345678",
  avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  onboarding_completed: true,
  batch: "60th Batch",
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2026-11-18T00:00:00Z",
};

export const MOCK_FIRST_TIME_STUDENT_PROFILE: ProfileRow = {
  id: "student-new-onboarding",
  diu_id: null,
  full_name: "Tanvir Ahmed Chowdhury",
  email: "tanvir.new@diu.edu.bd",
  role: "student",
  department_code: "CSE",
  cgpa: 0.0,
  completed_credits: 0,
  phone: null,
  avatar_url: null,
  onboarding_completed: false,
  batch: null,
  created_at: "2026-01-10T00:00:00Z",
  updated_at: "2026-01-10T00:00:00Z",
};

export const MOCK_ADVISOR_PROFILE: ProfileRow = {
  id: "advisor-prof-rahman",
  diu_id: "EMP-CSE-0042",
  full_name: "Dr. Rahman Ahmed",
  email: "rahman.cse@diu.edu.bd",
  role: "advisor",
  department_code: "CSE",
  cgpa: null,
  completed_credits: null,
  phone: "+8801812345678",
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  onboarding_completed: true,
  batch: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2027-04-14T00:00:00Z",
};

export const MOCK_ADMIN_PROFILE: ProfileRow = {
  id: "admin-registrar-01",
  diu_id: "EMP-REG-0001",
  full_name: "Registrar Operations Admin",
  email: "admin.registrar@diu.edu.bd",
  role: "admin",
  department_code: "CSE",
  cgpa: null,
  completed_credits: null,
  phone: "+8801700000001",
  avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  onboarding_completed: true,
  batch: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2027-04-14T00:00:00Z",
};

// ---------------------------------------------------------------------------
// 5.1 AUTHORIZED EMAIL IDENTITIES (Multi-Email Model & Exception Registry)
// ---------------------------------------------------------------------------
export const MOCK_AUTHORIZED_EMAILS: AuthorizedEmailRow[] = [
  {
    id: "auth-email-siyam-diu",
    profile_id: "student-siyam-01",
    email: "siyam.cse@diu.edu.bd",
    email_type: "primary_diu",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2024-01-15T00:00:00Z",
    reason: "Standard DIU institutional admission enrollment",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "auth-email-siyam-alt",
    profile_id: "student-siyam-01",
    email: "siyam.personal@gmail.com",
    email_type: "alternative_personal",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2026-11-19T08:00:00Z",
    reason: "Official DIU Workspace temporary lockout exception authorized by Dept Head",
    created_at: "2026-11-19T08:00:00Z",
    updated_at: "2026-11-19T08:00:00Z",
  },
  {
    id: "auth-email-atikur-diu",
    profile_id: "prof-student-01",
    email: "atikur.rahman@diu.edu.bd",
    email_type: "primary_diu",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2024-01-15T00:00:00Z",
    reason: "Standard DIU institutional admission enrollment",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "auth-email-atikur-alt",
    profile_id: "prof-student-01",
    email: "atikur.personal@gmail.com",
    email_type: "alternative_personal",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2026-11-19T09:30:00Z",
    reason: "Off-campus advising access waiver approved by Registrar",
    created_at: "2026-11-19T09:30:00Z",
    updated_at: "2026-11-19T09:30:00Z",
  },
  {
    id: "auth-email-advisor-diu",
    profile_id: "advisor-prof-rahman",
    email: "rahman.cse@diu.edu.bd",
    email_type: "advisor_authorized",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2020-01-01T00:00:00Z",
    reason: "Faculty academic appointment - CSE Department",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
  {
    id: "auth-email-advisor-alt",
    profile_id: "advisor-prof-rahman",
    email: "dr.rahman.ahmed@gmail.com",
    email_type: "advisor_authorized",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2026-11-19T09:00:00Z",
    reason: "Authorized faculty personal Google SSO exception",
    created_at: "2026-11-19T09:00:00Z",
    updated_at: "2026-11-19T09:00:00Z",
  },
  {
    id: "auth-email-advisor-deactivated",
    profile_id: "advisor-prof-rahman",
    email: "deactivated.advisor@gmail.com",
    email_type: "advisor_authorized",
    is_active: false,
    authorized_by: "admin-registrar-01",
    authorized_at: "2025-06-01T00:00:00Z",
    reason: "Sabbatical leave access suspension - Revoked by Admin",
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2026-11-19T10:00:00Z",
  },
  {
    id: "auth-email-admin-diu",
    profile_id: "admin-registrar-01",
    email: "admin.registrar@diu.edu.bd",
    email_type: "admin_authorized",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2020-01-01T00:00:00Z",
    reason: "Registrar enterprise administrator authorization",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
  {
    id: "auth-email-admin-alt",
    profile_id: "admin-registrar-01",
    email: "admin.personal@gmail.com",
    email_type: "admin_authorized",
    is_active: true,
    authorized_by: "admin-registrar-01",
    authorized_at: "2026-11-19T07:30:00Z",
    reason: "Emergency off-campus administrative console access",
    created_at: "2026-11-19T07:30:00Z",
    updated_at: "2026-11-19T07:30:00Z",
  },
];

export const MOCK_EMAIL_AUDIT_LOG: EmailAuthorizationAuditRow[] = [
  {
    id: "audit-auth-001",
    authorized_email_id: "auth-email-siyam-alt",
    profile_id: "student-siyam-01",
    email: "siyam.personal@gmail.com",
    action: "AUTHORIZED",
    actor_id: "admin-registrar-01",
    reason: "Official DIU Workspace temporary lockout exception authorized by Dept Head",
    metadata: { assignedRole: "student", diuId: "221-15-12345" },
    created_at: "2026-11-19T08:00:00Z",
  },
  {
    id: "audit-auth-002",
    authorized_email_id: "auth-email-advisor-alt",
    profile_id: "advisor-prof-rahman",
    email: "dr.rahman.ahmed@gmail.com",
    action: "AUTHORIZED",
    actor_id: "admin-registrar-01",
    reason: "Authorized faculty personal Google SSO exception",
    metadata: { assignedRole: "advisor", employeeId: "EMP-CSE-0042" },
    created_at: "2026-11-19T09:00:00Z",
  },
  {
    id: "audit-auth-003",
    authorized_email_id: "auth-email-advisor-deactivated",
    profile_id: "advisor-prof-rahman",
    email: "deactivated.advisor@gmail.com",
    action: "DEACTIVATED",
    actor_id: "admin-registrar-01",
    reason: "Sabbatical leave access suspension - Revoked by Admin",
    metadata: { assignedRole: "advisor", previousState: "active" },
    created_at: "2026-11-19T10:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// 6. COMPLETED COURSES RECORD (For Prerequisite Checking)
// ---------------------------------------------------------------------------
export const MOCK_STUDENT_COMPLETED_COURSES: Array<{
  code: string;
  title: string;
  credits: number;
  grade: string;
  gradePoint: number;
  semesterName: string;
}> = [
  { code: "CSE110", title: "Structured Programming Language", credits: 3.0, grade: "A+", gradePoint: 4.0, semesterName: "Spring 2024" },
  { code: "CSE111", title: "Structured Programming Language Lab", credits: 1.5, grade: "A+", gradePoint: 4.0, semesterName: "Spring 2024" },
  { code: "MAT101", title: "Differential and Integral Calculus", credits: 3.0, grade: "A", gradePoint: 3.75, semesterName: "Spring 2024" },
  { code: "ENG101", title: "Basic English Language Skills", credits: 3.0, grade: "A-", gradePoint: 3.5, semesterName: "Spring 2024" },
  { code: "PHY111", title: "Physics: Mechanics, Waves & Optics", credits: 3.0, grade: "B+", gradePoint: 3.25, semesterName: "Summer 2024" },
  { code: "CSE122", title: "Data Structures", credits: 3.0, grade: "A", gradePoint: 3.75, semesterName: "Summer 2024" },
  { code: "CSE123", title: "Data Structures Lab", credits: 1.5, grade: "A+", gradePoint: 4.0, semesterName: "Summer 2024" },
  { code: "MAT205", title: "Linear Algebra & Complex Variables", credits: 3.0, grade: "B", gradePoint: 3.0, semesterName: "Fall 2024" },
  { code: "CSE213", title: "Object-Oriented Programming (Java)", credits: 3.0, grade: "A+", gradePoint: 4.0, semesterName: "Fall 2024" },
  { code: "CSE214", title: "Discrete Mathematics", credits: 3.0, grade: "A-", gradePoint: 3.5, semesterName: "Fall 2024" },
];

export const MOCK_COMPLETED_COURSE_CODES = MOCK_STUDENT_COMPLETED_COURSES.map((c) => c.code);

// ---------------------------------------------------------------------------
// 7. CURRENT STUDENT REGISTRATION (Draft / In-Progress Cart)
// ---------------------------------------------------------------------------
export const MOCK_STUDENT_ACTIVE_REGISTRATION: RegistrationRow = {
  id: "reg-spring2026-siyam",
  student_id: MOCK_STUDENT_PROFILE.id,
  semester_id: MOCK_CURRENT_SEMESTER.id,
  status: "draft",
  submitted_at: null,
  advisor_id: MOCK_ADVISOR_PROFILE.id,
  reviewed_at: null,
  advisor_notes: null,
  payment_cleared: true,
  payment_reference: "DIU-AC-2026-8812",
  created_at: "2026-01-08T10:30:00Z",
  updated_at: "2026-01-08T14:15:00Z",
};

export const MOCK_STUDENT_CART_SECTIONS: ExtendedSection[] = [
  MOCK_SECTIONS.find((s) => s.id === "sec-cse221-a")!, // CSE221 60_A (3.0 cr)
  MOCK_SECTIONS.find((s) => s.id === "sec-cse222-a")!, // CSE222 60_A_L (1.5 cr)
  MOCK_SECTIONS.find((s) => s.id === "sec-cse225-a")!, // CSE225 60_A (3.0 cr)
  MOCK_SECTIONS.find((s) => s.id === "sec-cse226-a")!, // CSE226 60_A_L (1.5 cr)
  MOCK_SECTIONS.find((s) => s.id === "sec-cse311-a")!, // CSE311 59_A (3.0 cr)
];

// ---------------------------------------------------------------------------
// 8. ADVISOR QUEUE: ADVISEE APPLICATIONS (For Advisor Portal)
// ---------------------------------------------------------------------------
export const MOCK_ADVISEE_QUEUE: StudentRegistrationApplication[] = [
  // 1. Atikur Rahman - Paid, Pending Review
  {
    registration: {
      id: "reg-app-001",
      student_id: "student-atikur-01",
      semester_id: "sem-spring-2027",
      status: "pending_advisor",
      submitted_at: "2027-04-14T14:30:00Z",
      advisor_id: MOCK_ADVISOR_PROFILE.id,
      reviewed_at: null,
      advisor_notes: null,
      payment_cleared: true,
      payment_reference: "DIU-AC-2027-4561",
      created_at: "2027-04-14T10:00:00Z",
      updated_at: "2027-04-14T14:30:00Z",
    },
    student: {
      id: "student-atikur-01",
      diu_id: "211-15-456",
      full_name: "Atikur Rahman",
      email: "atikur.211@diu.edu.bd",
      role: "student",
      department_code: "CSE",
      cgpa: 3.65,
      completed_credits: 84,
      phone: "+8801712345678",
      avatar_url: null,
      onboarding_completed: true,
      batch: "61",
      created_at: "2024-01-15T00:00:00Z",
      updated_at: "2027-04-14T00:00:00Z",
    },
    semester: MOCK_CURRENT_SEMESTER,
    formattedApplicationDate: "Apr 14, 2027 • 2:30 PM",
    isUnderReview: false,
    items: [
      {
        item: { id: "item-101", registration_id: "reg-app-001", section_id: "sec-cse221-a", status: "enrolled", created_at: "2027-04-14T14:30:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse221-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE221")!,
      },
      {
        item: { id: "item-102", registration_id: "reg-app-001", section_id: "sec-cse222-a", status: "enrolled", created_at: "2027-04-14T14:30:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse222-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE222")!,
      },
      {
        item: { id: "item-103", registration_id: "reg-app-001", section_id: "sec-cse225-a", status: "enrolled", created_at: "2027-04-14T14:30:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse225-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE225")!,
      },
      {
        item: { id: "item-104", registration_id: "reg-app-001", section_id: "sec-cse311-a", status: "enrolled", created_at: "2027-04-14T14:30:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse311-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE311")!,
      },
    ],
    totalCredits: 10.5,
    totalCourses: 4,
    hasScheduleConflict: false,
    hasPrerequisiteConflict: false,
    isProbation: false,
  },

  // 2. Mithila Binte Hasan - Paid, Under Review
  {
    registration: {
      id: "reg-app-002",
      student_id: "student-mithila-02",
      semester_id: "sem-spring-2027",
      status: "pending_advisor",
      submitted_at: "2027-04-14T13:20:00Z",
      advisor_id: MOCK_ADVISOR_PROFILE.id,
      reviewed_at: null,
      advisor_notes: null,
      payment_cleared: true,
      payment_reference: "DIU-AC-2027-4572",
      created_at: "2027-04-14T09:00:00Z",
      updated_at: "2027-04-14T13:20:00Z",
    },
    student: {
      id: "student-mithila-02",
      diu_id: "211-15-457",
      full_name: "Mithila Binte Hasan",
      email: "mithila.211@diu.edu.bd",
      role: "student",
      department_code: "CSE",
      cgpa: 3.82,
      completed_credits: 90,
      phone: "+8801711223344",
      avatar_url: null,
      onboarding_completed: true,
      batch: "61",
      created_at: "2024-01-15T00:00:00Z",
      updated_at: "2027-04-14T00:00:00Z",
    },
    semester: MOCK_CURRENT_SEMESTER,
    formattedApplicationDate: "Apr 14, 2027 • 1:20 PM",
    isUnderReview: true,
    items: [
      {
        item: { id: "item-201", registration_id: "reg-app-002", section_id: "sec-cse225-b", status: "enrolled", created_at: "2027-04-14T13:20:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse225-b")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE225")!,
      },
      {
        item: { id: "item-202", registration_id: "reg-app-002", section_id: "sec-cse221-c", status: "enrolled", created_at: "2027-04-14T13:20:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse221-c")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE221")!,
      },
      {
        item: { id: "item-203", registration_id: "reg-app-002", section_id: "sec-swe312-a", status: "enrolled", created_at: "2027-04-14T13:20:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-swe312-a")!,
        course: MOCK_COURSES.find((c) => c.code === "SWE312")!,
      },
    ],
    totalCredits: 9.0,
    totalCourses: 3,
    hasScheduleConflict: false,
    hasPrerequisiteConflict: false,
    isProbation: false,
  },

  // 3. Sayedur Rahman - Unpaid, Pending Review
  {
    registration: {
      id: "reg-app-003",
      student_id: "student-sayedur-03",
      semester_id: "sem-spring-2027",
      status: "pending_advisor",
      submitted_at: "2027-04-13T16:15:00Z",
      advisor_id: MOCK_ADVISOR_PROFILE.id,
      reviewed_at: null,
      advisor_notes: null,
      payment_cleared: false,
      payment_reference: null,
      created_at: "2027-04-13T11:00:00Z",
      updated_at: "2027-04-13T16:15:00Z",
    },
    student: {
      id: "student-sayedur-03",
      diu_id: "211-15-458",
      full_name: "Sayedur Rahman",
      email: "sayedur.211@diu.edu.bd",
      role: "student",
      department_code: "CSE",
      cgpa: 3.12,
      completed_credits: 78,
      phone: "+8801911223344",
      avatar_url: null,
      onboarding_completed: true,
      batch: "61",
      created_at: "2024-01-15T00:00:00Z",
      updated_at: "2027-04-13T00:00:00Z",
    },
    semester: MOCK_CURRENT_SEMESTER,
    formattedApplicationDate: "Apr 13, 2027 • 4:15 PM",
    isUnderReview: false,
    items: [
      {
        item: { id: "item-301", registration_id: "reg-app-003", section_id: "sec-cse221-a", status: "enrolled", created_at: "2027-04-13T16:15:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse221-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE221")!,
      },
      {
        item: { id: "item-302", registration_id: "reg-app-003", section_id: "sec-cse412-a", status: "enrolled", created_at: "2027-04-13T16:15:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse412-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE412")!,
      },
    ],
    totalCredits: 6.0,
    totalCourses: 2,
    hasScheduleConflict: false,
    hasPrerequisiteConflict: false,
    isProbation: false,
  },

  // 4. Nusrat Ahmed - Paid, Completed
  {
    registration: {
      id: "reg-app-004",
      student_id: "student-nusrat-04",
      semester_id: "sem-spring-2027",
      status: "approved",
      submitted_at: "2027-04-13T15:50:00Z",
      advisor_id: MOCK_ADVISOR_PROFILE.id,
      reviewed_at: "2027-04-14T09:30:00Z",
      advisor_notes: "Approved. All prerequisites and credit distributions verified.",
      payment_cleared: true,
      payment_reference: "DIU-AC-2027-4594",
      created_at: "2027-04-13T10:00:00Z",
      updated_at: "2027-04-14T09:30:00Z",
    },
    student: {
      id: "student-nusrat-04",
      diu_id: "211-15-459",
      full_name: "Nusrat Ahmed",
      email: "nusrat.211@diu.edu.bd",
      role: "student",
      department_code: "CSE",
      cgpa: 3.91,
      completed_credits: 96,
      phone: "+8801811223344",
      avatar_url: null,
      onboarding_completed: true,
      batch: "61",
      created_at: "2024-01-15T00:00:00Z",
      updated_at: "2027-04-14T00:00:00Z",
    },
    semester: MOCK_CURRENT_SEMESTER,
    formattedApplicationDate: "Apr 13, 2027 • 3:50 PM",
    isUnderReview: false,
    items: [
      {
        item: { id: "item-401", registration_id: "reg-app-004", section_id: "sec-cse311-a", status: "enrolled", created_at: "2027-04-13T15:50:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse311-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE311")!,
      },
      {
        item: { id: "item-402", registration_id: "reg-app-004", section_id: "sec-cse412-a", status: "enrolled", created_at: "2027-04-13T15:50:00Z" },
        section: MOCK_SECTIONS.find((s) => s.id === "sec-cse412-a")!,
        course: MOCK_COURSES.find((c) => c.code === "CSE412")!,
      },
    ],
    totalCredits: 6.0,
    totalCourses: 2,
    hasScheduleConflict: false,
    hasPrerequisiteConflict: false,
    isProbation: false,
  },
];
