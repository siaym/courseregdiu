import test from "node:test";
import assert from "node:assert/strict";

// Configure test environment session role
process.env.NODE_TEST_ROLE = "student";

import {
  getBatchSemesterCourses,
  addCourseToBatchConfig,
} from "../src/lib/curriculum/batch-course-service.ts";
import {
  getStudentPaymentClearance,
  updatePaymentClearanceStatus,
  getPaymentAuditTrail,
} from "../src/lib/payment/payment-service.ts";
import {
  submitStudentRegistration,
} from "../src/app/courses/actions.ts";
import {
  MOCK_STUDENT_PROFILE,
} from "../src/lib/mock/data.ts";

// ====================================================================
// TEST SUITE: BATCH-SEMESTER COURSES & PAYMENT CLEARANCE VERIFICATION
// ====================================================================

test("Scenario 1: Batch 69 student sees only Batch 69 courses for Spring 2027", async () => {
  const batch69Courses = await getBatchSemesterCourses("sem-spring-2027", "69");
  assert.ok(batch69Courses.length > 0, "Batch 69 must have configured courses");

  const codes = batch69Courses.map((c) => c.course.code);
  // Batch 69 (Freshman): CSE110, CSE111, MAT101, ENG101, PHY111
  assert.ok(codes.includes("CSE110"), "Batch 69 must include CSE110");
  assert.ok(codes.includes("CSE111"), "Batch 69 must include CSE111");
  assert.ok(codes.includes("MAT101"), "Batch 69 must include MAT101");
  assert.ok(codes.includes("ENG101"), "Batch 69 must include ENG101");
  assert.ok(codes.includes("PHY111"), "Batch 69 must include PHY111");

  // Higher level courses like CSE311, CSE425 must NOT be in Batch 69
  assert.equal(codes.includes("CSE311"), false, "Batch 69 must NOT include junior course CSE311");
  assert.equal(codes.includes("CSE425"), false, "Batch 69 must NOT include senior course CSE425");
});

test("Scenario 2: Batch 70 student sees only Batch 70 courses", async () => {
  const batch70Courses = await getBatchSemesterCourses("sem-spring-2027", "70");
  const codes = batch70Courses.map((c) => c.course.code);

  assert.ok(codes.includes("CSE110"), "Batch 70 must include CSE110");
  assert.ok(codes.includes("CSE111"), "Batch 70 must include CSE111");
  assert.ok(codes.includes("ENG101"), "Batch 70 must include ENG101");

  // Batch 70 does not have PHY111 or CSE221
  assert.equal(codes.includes("CSE221"), false, "Batch 70 must NOT include CSE221");
});

test("Scenario 3: Changing the semester changes eligible courses", async () => {
  // Add a course specifically to Summer 2027
  await addCourseToBatchConfig("sem-summer-2027", "69", "course-cse122");

  const springCourses = await getBatchSemesterCourses("sem-spring-2027", "69");
  const summerCourses = await getBatchSemesterCourses("sem-summer-2027", "69");

  const springHas122 = springCourses.some((c) => c.course.code === "CSE122");
  const summerHas122 = summerCourses.some((c) => c.course.code === "CSE122");

  assert.equal(springHas122, false, "Spring 2027 must NOT have CSE122 for Batch 69");
  assert.equal(summerHas122, true, "Summer 2027 must have CSE122 for Batch 69");
});

test("Scenario 4: Server-side validation rejects unconfigured courses in registration submit", async () => {
  // Batch 60 profile submitting a Batch 59 exclusive senior course (CSE499)
  const invalidPayload = {
    previousSection: "60_A",
    desiredSection: "60_B",
    courses: [
      {
        courseId: "course-cse499", // Final Year Project, not in Batch 60 curriculum
        courseCode: "CSE499",
        courseTitle: "Final Year Design Project / Thesis",
        credits: 3.0,
        sectionId: "sec-cse499-60a",
        sectionName: "60_A",
        courseType: "general",
      },
    ],
  };

  const result = await submitStudentRegistration(invalidPayload);
  assert.equal(result.success, false, "Server action must reject unconfigured course");
  assert.ok(
    result.error?.includes("not configured for Batch"),
    "Error message must specify batch course eligibility violation"
  );
});

test("Scenario 5: Duplicate courses are rejected", async () => {
  const duplicatePayload = {
    previousSection: "60_A",
    desiredSection: "60_B",
    courses: [
      {
        courseId: "course-cse221",
        courseCode: "CSE221",
        courseTitle: "Algorithms Design and Analysis",
        credits: 3.0,
        sectionId: "sec-cse221-60a",
        sectionName: "60_A",
        courseType: "general",
      },
      {
        courseId: "course-cse221", // Duplicate courseId
        courseCode: "CSE221",
        courseTitle: "Algorithms Design and Analysis",
        credits: 3.0,
        sectionId: "sec-cse221-60b",
        sectionName: "60_B",
        courseType: "retake",
      },
    ],
  };

  const result = await submitStudentRegistration(duplicatePayload);
  assert.equal(result.success, false, "Server action must reject duplicate courses");
  assert.ok(
    result.error?.includes("Duplicate course error"),
    "Error message must state duplicate course error"
  );
});

test("Scenario 6: Search returns only eligible courses within batch", async () => {
  const batch69Courses = await getBatchSemesterCourses("sem-spring-2027", "69");
  // Simulating the search filter:
  const query = "algo";
  const matches = batch69Courses.filter(
    (c) => c.course.code.toLowerCase().includes(query) || c.course.title.toLowerCase().includes(query)
  );

  // Algorithms (CSE221) is NOT in Batch 69
  assert.equal(matches.length, 0, "Query for 'algo' in Batch 69 must return 0 results");

  const mathQuery = "mat";
  const mathMatches = batch69Courses.filter(
    (c) => c.course.code.toLowerCase().includes(mathQuery) || c.course.title.toLowerCase().includes(mathQuery)
  );
  assert.equal(mathMatches.length, 1, "Query for 'mat' in Batch 69 must return MAT101");
  assert.equal(mathMatches[0].course.code, "MAT101");
});

test("Scenario 7: General and Retake is stored independently per course", async () => {
  const validPayload = {
    previousSection: "60_A",
    desiredSection: "60_B",
    courses: [
      {
        courseId: "course-cse221",
        courseCode: "CSE221",
        courseTitle: "Algorithms Design and Analysis",
        credits: 3.0,
        sectionId: "sec-cse221-60a",
        sectionName: "60_A",
        courseType: "general", // General
      },
      {
        courseId: "course-cse222",
        courseCode: "CSE222",
        courseTitle: "Algorithms Lab",
        credits: 1.5,
        sectionId: "sec-cse222-60al",
        sectionName: "60_A_L",
        courseType: "retake", // Retake
      },
    ],
  };

  const result = await submitStudentRegistration(validPayload);
  assert.equal(result.success, true, "Submission with valid batch courses must succeed");
});

test("Scenario 8: Admin can mark a student's payment status Cleared", async () => {
  const updateRes = await updatePaymentClearanceStatus(
    "student-advisee-004", // Mehedi Hasan
    "sem-spring-2027",
    "cleared",
    "Tuition fee deposited at university cashier counter.",
    "admin-finance-01"
  );

  assert.equal(updateRes.success, true, "Admin updating payment to cleared must succeed");
  assert.equal(updateRes.record?.status, "cleared");

  const fetched = await getStudentPaymentClearance("student-advisee-004", "sem-spring-2027");
  assert.equal(fetched?.status, "cleared", "Subsequent query must return verified Cleared status");
});

test("Scenario 9: Admin can mark a student's payment status Not Cleared", async () => {
  const updateRes = await updatePaymentClearanceStatus(
    "student-advisee-002", // Nusrat Jahan
    "sem-spring-2027",
    "not_cleared",
    "Financial hold: Cheque returned by clearing house.",
    "admin-finance-01"
  );

  assert.equal(updateRes.success, true, "Admin updating payment to not_cleared must succeed");
  assert.equal(updateRes.record?.status, "not_cleared");

  const fetched = await getStudentPaymentClearance("student-advisee-002", "sem-spring-2027");
  assert.equal(fetched?.status, "not_cleared", "Subsequent query must return Not Cleared");
});

test("Scenario 10: Payment status changes record an immutable audit entry", async () => {
  const auditEntries = await getPaymentAuditTrail("student-advisee-002", "sem-spring-2027");
  assert.ok(auditEntries.length > 0, "Audit trail must exist for student");

  const latest = auditEntries[0];
  assert.equal(latest.newStatus, "not_cleared");
  assert.ok(latest.notes?.includes("Cheque returned"));
});

test("Scenario 11: Payment status for one semester does not affect another semester", async () => {
  // Spring 2027 status for Siyam
  const springStatus = await getStudentPaymentClearance(MOCK_STUDENT_PROFILE.id, "sem-spring-2027");
  assert.equal(springStatus?.status, "cleared");

  // Fall 2026 status for Siyam is unrecorded/null
  const fallStatus = await getStudentPaymentClearance(MOCK_STUDENT_PROFILE.id, "sem-fall-2026");
  assert.equal(fallStatus, null, "Payment clearance for Fall 2026 must be isolated from Spring 2027");
});

test("Scenario 12: Student manually marks payment as Paid or Unpaid on registration submission", async () => {
  const paidPayload = {
    previousSection: "60_A",
    desiredSection: "60_B",
    isPaid: true,
    courses: [
      {
        courseId: "course-cse221",
        courseCode: "CSE221",
        courseTitle: "Algorithms Design and Analysis",
        credits: 3.0,
        sectionId: "sec-cse221-60a",
        sectionName: "60_A",
        courseType: "general",
      },
    ],
  };

  const paidResult = await submitStudentRegistration(paidPayload);
  assert.equal(paidResult.success, true, "Student registration with isPaid=true must succeed");

  const unpaidPayload = {
    previousSection: "60_A",
    desiredSection: "60_B",
    isPaid: false,
    courses: [
      {
        courseId: "course-cse221",
        courseCode: "CSE221",
        courseTitle: "Algorithms Design and Analysis",
        credits: 3.0,
        sectionId: "sec-cse221-60a",
        sectionName: "60_A",
        courseType: "general",
      },
    ],
  };

  const unpaidResult = await submitStudentRegistration(unpaidPayload);
  assert.equal(unpaidResult.success, true, "Student registration with isPaid=false must succeed");
});
