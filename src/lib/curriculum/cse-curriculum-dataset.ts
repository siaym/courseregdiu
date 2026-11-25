/**
 * Normalized DIU B.Sc. in CSE Curriculum Dataset
 * Extracted directly from the official DIU CSE curriculum reference image.
 *
 * Summary from source document:
 * - Core Courses: 93 Credits (37 courses)
 * - General Education Courses: 37.5 Credits (13 courses)
 * - Project Courses: 6 Credits (3 CSE-499 FYDP variants)
 * - Common Elective Courses: 2 courses (3 credits each)
 * - Specialization Elective Courses: 38 courses across 5 groups (Any 1 group: 6 courses, 18 Credits)
 * - Total Programme Credit Summary: 154.5 Credits
 */

export type CourseCategory =
  | "CORE"
  | "GENERAL_EDUCATION"
  | "PROJECT"
  | "COMMON_ELECTIVE"
  | "SPECIALIZATION_ELECTIVE";

export type SpecializationGroup =
  | "ARTIFICIAL_INTELLIGENCE"
  | "SOFTWARE_DEVELOPMENT"
  | "NETWORK_AND_COMMUNICATION"
  | "ALGORITHMS"
  | "EMBEDDED_SYSTEMS_AND_ROBOTICS";

export interface NormalizedCurriculumCourse {
  code: string;
  title: string;
  category: CourseCategory;
  theoryCredits: number | null;
  labCredits: number | null;
  totalCredits: number;
  specializationGroup: SpecializationGroup | null;
  variant: string | null;
  departmentCode: string;
  ocrReviewFlag?: string;
}

export const CSE_CURRICULUM_DATASET: NormalizedCurriculumCourse[] = [
  // =========================================================================
  // A. CORE COURSES (93 Credits)
  // =========================================================================
  { code: "CSE-112", title: "Computer Fundamentals", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-113", title: "Programming and Problem Solving", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-114", title: "Programming and Problem Solving Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-115", title: "Introduction to Biology & Chemistry for Computation", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-121", title: "Electrical Circuits", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-122", title: "Electrical Circuits Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-123", title: "Data Structure", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-124", title: "Data Structure Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-212", title: "Discrete Mathematics", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-213", title: "Algorithms", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-214", title: "Algorithms Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-215", title: "Electronic Devices and Circuits", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-216", title: "Electronic Devices and Circuits Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-221", title: "Object Oriented Programming", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-222", title: "Object Oriented Programming Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-223", title: "Digital Logic Design", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-224", title: "Digital Logic Design Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-225", title: "Data Communication", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-226", title: "Numerical Methods", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-227", title: "Systems Analysis and Design", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-228", title: "Theory of Computation", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-311", title: "Database Management System", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-312", title: "Database Management System Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-313", title: "Compiler Design", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-314", title: "Compiler Design Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-315", title: "Software Engineering", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-316", title: "Artificial Intelligence", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-317", title: "Microprocessor and Microcontrollers", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-321", title: "Computer Networks", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-322", title: "Computer Networks Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-323", title: "Operating Systems", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-324", title: "Operating Systems Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-325", title: "Instrumentation and Control", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-326", title: "Social and Professional Issues in Computing", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-411", title: "Computer Graphics", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-412", title: "Computer Graphics Lab", category: "CORE", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "CSE-413", title: "Computer Architecture and Organization", category: "CORE", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },

  // =========================================================================
  // B. GENERAL EDUCATION COURSES (37.5 Credits)
  // =========================================================================
  { code: "ENG-101", title: "Basic Functional English and English Spoken", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "ENG-102", title: "Writing and Comprehension", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "MAT-101", title: "Mathematics - I", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "MAT-102", title: "Mathematics-II: Calculus, Complex Variables & Linear Algebra", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "MAT-211", title: "Engineering Mathematics", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "PHY-101", title: "Physics - I", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "PHY-102", title: "Physics - II", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "PHY-103", title: "Physics - II Lab", category: "GENERAL_EDUCATION", theoryCredits: null, labCredits: 1.5, totalCredits: 1.5, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "BNS-101", title: "Bangladesh Studies (History of Independence & Contemporary Issues)", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "AOL-101", title: "Art of Living", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "STA-101", title: "Statistics and Probability", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "ACT-327", title: "Financial and Managerial Accounting", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },
  { code: "ECO-426", title: "Engineering Economics", category: "GENERAL_EDUCATION", theoryCredits: 3, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE" },

  // =========================================================================
  // C. PROJECT COURSES (06 Credits — CSE-499 Variants)
  // =========================================================================
  { code: "CSE-499", title: "FYDP (Title Defense)", category: "PROJECT", theoryCredits: null, labCredits: null, totalCredits: 1, specializationGroup: null, variant: "Title Defense", departmentCode: "CSE" },
  { code: "CSE-499", title: "FYDP (Phase-I, continued from Level 4, Term 1)", category: "PROJECT", theoryCredits: null, labCredits: null, totalCredits: 2, specializationGroup: null, variant: "Phase-I", departmentCode: "CSE" },
  { code: "CSE-499", title: "FYDP (Phase-II, continued from Level 4, Term 2)", category: "PROJECT", theoryCredits: null, labCredits: null, totalCredits: 3, specializationGroup: null, variant: "Phase-II", departmentCode: "CSE" },

  // =========================================================================
  // D. COMMON ELECTIVE COURSES
  // =========================================================================
  { code: "CSE 328", title: "Introduction to Data Science (Elective)", category: "COMMON_ELECTIVE", theoryCredits: null, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE", ocrReviewFlag: "Printed with space ('CSE 328') instead of hyphen" },
  { code: "CSE414", title: "Research Innovation and Technical Writing (Elective)", category: "COMMON_ELECTIVE", theoryCredits: null, labCredits: null, totalCredits: 3, specializationGroup: null, variant: null, departmentCode: "CSE", ocrReviewFlag: "Printed without space/hyphen ('CSE414')" },

  // =========================================================================
  // E1. SPECIALIZATION IN ARTIFICIAL INTELLIGENCE
  // =========================================================================
  { code: "CSE 431", title: "Machine Learning", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE", ocrReviewFlag: "Printed with space ('CSE 431') instead of hyphen" },
  { code: "CSE-432", title: "Natural Language Processing", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-433", title: "Artificial Neural Networks", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-434", title: "Pattern Recognition", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-435", title: "Soft Computing", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-436", title: "Digital Image Processing", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-437", title: "Computer Vision", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },
  { code: "CSE-438", title: "Business Intelligence", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ARTIFICIAL_INTELLIGENCE", variant: null, departmentCode: "CSE" },

  // =========================================================================
  // E2. SPECIALIZATION IN SOFTWARE DEVELOPMENT
  // =========================================================================
  { code: "CSE-441", title: "UI and UX Design", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-442", title: "Software Quality Assurance", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-443", title: "Web Computing", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-444", title: "Software Architecture and Design Pattern", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-445", title: "Intellectual Property and Contract Law", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-446", title: "Mobile Applications Development", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-447", title: "Concurrent and Distributed Programming", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },
  { code: "CSE-448", title: "Virtual Reality and 3D Games", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "SOFTWARE_DEVELOPMENT", variant: null, departmentCode: "CSE" },

  // =========================================================================
  // E3. SPECIALIZATION IN NETWORK AND COMMUNICATION
  // =========================================================================
  { code: "CSE-451", title: "Cloud Computing and Services", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-452", title: "Optical Fiber Communication", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-453", title: "Wireless Sensor Network", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-454", title: "Cyber Security and Forensics", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-455", title: "High Performance Computing", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-456", title: "Network Programming", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },
  { code: "CSE-457", title: "Wireless and Cellular Communication", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "NETWORK_AND_COMMUNICATION", variant: null, departmentCode: "CSE" },

  // =========================================================================
  // E4. SPECIALIZATION IN ALGORITHMS
  // =========================================================================
  { code: "CSE-461", title: "Algorithm Engineering", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-462", title: "Computational Complexity", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-463", title: "Advanced Algorithms", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-464", title: "Basic Graph Theory", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-465", title: "Algorithmic Game Theory", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-466", title: "Bioinformatics Algorithm", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },
  { code: "CSE-467", title: "Algorithm for distributed computation", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "ALGORITHMS", variant: null, departmentCode: "CSE" },

  // =========================================================================
  // E5. SPECIALIZATION IN EMBEDDED SYSTEMS AND ROBOTICS
  // =========================================================================
  { code: "CSE-471", title: "Introduction to Embedded Systems", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-472", title: "Internet of Things (IoT)", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-473", title: "Robotics", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-474", title: "VLSI Design", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-475", title: "Micro-sensors", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-476", title: "Sensor Manufacturing and Process Control", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-477", title: "Introduction to Nanotechnology and Nanodevices", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
  { code: "CSE-478", title: "Additive Manufacturing Engineering", category: "SPECIALIZATION_ELECTIVE", theoryCredits: 1.5, labCredits: 1.5, totalCredits: 3, specializationGroup: "EMBEDDED_SYSTEMS_AND_ROBOTICS", variant: null, departmentCode: "CSE" },
];
