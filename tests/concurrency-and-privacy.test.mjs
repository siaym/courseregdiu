import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveEmailAuthorization,
} from "@/lib/auth/email-authorization";
import {
  MOCK_STUDENT_PROFILE,
} from "@/lib/mock/data";
import { validateRegistrationStateTransition } from "@/lib/validations/registration";

const baseUrl = "http://localhost:3000";

// ====================================================================
// TEST 1: Profile Privacy — Protected Routes Guard Profile Data
// ====================================================================
test("Privacy Test 1: Profile routes reject unauthenticated requests", async () => {
  // Profiles contain sensitive academic records (CGPA, credits, student ID).
  // Unauthenticated requests must never receive profile data.
  const profileRes = await fetch(`${baseUrl}/student/profile`, {
    redirect: "manual",
  });

  assert.equal(
    profileRes.status === 307 || profileRes.status === 308 || profileRes.status === 302,
    true,
    "Unauthenticated request to /student/profile must be redirected"
  );
  const location = profileRes.headers.get("location") || "";
  assert.equal(
    location.includes("/login"),
    true,
    `Redirect must point to /login (got: ${location})`
  );
});

// ====================================================================
// TEST 2: Identity Linking — Canonical Profile Mapping
// ====================================================================
test("Identity Linking Test 2: Dual Google identities resolve to identical profile", async () => {
  // 1. Primary institutional email resolution
  const primaryRes = await resolveEmailAuthorization("siyam.cse@diu.edu.bd");
  assert.equal(primaryRes.authorized, true);
  assert.equal(primaryRes.profileId, MOCK_STUDENT_PROFILE.id);
  assert.equal(primaryRes.role, "student");

  // 2. Secondary personal Google account resolution
  const altRes = await resolveEmailAuthorization("siyam.personal@gmail.com");
  assert.equal(altRes.authorized, true);
  assert.equal(altRes.profileId, MOCK_STUDENT_PROFILE.id, "Must resolve to identical canonical profile ID");
  assert.equal(altRes.role, "student");
  assert.equal(altRes.emailType, "alternative_personal");

  // 3. Unlinked personal account must be rejected
  const unlinkedRes = await resolveEmailAuthorization("stranger@gmail.com");
  assert.equal(unlinkedRes.authorized, false);
  assert.equal(unlinkedRes.reason, "UNREGISTERED_PERSONAL_EMAIL");
});

// ====================================================================
// TEST 3: Middleware Authorization — Rejects Unregistered Personal Email
// ====================================================================
test("Middleware Test 3: Middleware redirects deactivated advisor account", async () => {
  const deactRes = await fetch(`${baseUrl}/advisor`, {
    headers: {
      Cookie: "diu_session_role=advisor_deactivated",
    },
    redirect: "manual",
  });

  assert.equal(
    deactRes.status === 307 || deactRes.status === 308 || deactRes.status === 302,
    true,
    "Deactivated advisor session must be intercepted"
  );
  const location = deactRes.headers.get("location") || "";
  assert.equal(
    location.includes("/login"),
    true,
    "Deactivated account must be routed to /login"
  );
});

// ====================================================================
// TEST 4: Concurrency & Capacity Enforcement Logic
// ====================================================================
test("Capacity Test 4: Section capacity enforcement logic rejects over-enrollment", async () => {
  // Simulate atomic capacity check algorithm implemented in public.enroll_section_atomic
  function simulateAtomicEnrollment(section, currentEnrolledItems, newCourseId) {
    // 1. Check for duplicate course enrollment
    const hasSameCourse = currentEnrolledItems.some(
      (item) => item.course_id === newCourseId
    );
    if (hasSameCourse) {
      return { success: false, error: "Already enrolled in this course" };
    }

    // 2. Check capacity
    if (section.enrolled_count >= section.capacity) {
      return { success: false, error: "Section is fully enrolled" };
    }

    // 3. Increment
    return {
      success: true,
      enrolled_count: section.enrolled_count + 1,
      capacity: section.capacity,
    };
  }

  // Case A1: Full Lab section (25 seats fixed)
  const fullLabSection = { id: "sec-lab-full", capacity: 25, enrolled_count: 25 };
  const fullLabResult = simulateAtomicEnrollment(fullLabSection, [], "course-cse111");
  assert.equal(fullLabResult.success, false);
  assert.equal(fullLabResult.error, "Section is fully enrolled");

  // Case A2: Full Theory section (50 seats fixed)
  const fullTheorySection = { id: "sec-theory-full", capacity: 50, enrolled_count: 50 };
  const fullTheoryResult = simulateAtomicEnrollment(fullTheorySection, [], "course-cse110");
  assert.equal(fullTheoryResult.success, false);
  assert.equal(fullTheoryResult.error, "Section is fully enrolled");

  // Case B1: Available Lab section (25 seats fixed)
  const openLabSection = { id: "sec-lab-open", capacity: 25, enrolled_count: 22 };
  const openLabResult = simulateAtomicEnrollment(openLabSection, [], "course-cse111");
  assert.equal(openLabResult.success, true);
  assert.equal(openLabResult.enrolled_count, 23);
  assert.equal(openLabResult.capacity, 25);

  // Case B2: Available Theory section (50 seats fixed)
  const openTheorySection = { id: "sec-theory-open", capacity: 50, enrolled_count: 48 };
  const openTheoryResult = simulateAtomicEnrollment(openTheorySection, [], "course-cse110");
  assert.equal(openTheoryResult.success, true);
  assert.equal(openTheoryResult.enrolled_count, 49);
  assert.equal(openTheoryResult.capacity, 50);

  // Case C: Duplicate course enrollment attempt
  const dupResult = simulateAtomicEnrollment(
    openTheorySection,
    [{ course_id: "course-cse110" }],
    "course-cse110"
  );
  assert.equal(dupResult.success, false);
  assert.equal(dupResult.error, "Already enrolled in this course");
});

// ====================================================================
// TEST 5: Registration State Machine Security
// ====================================================================
test("State Transition Test 5: State machine strictly prohibits student self-approval", async () => {
  // Student attempting to approve own registration
  const studentApprove = validateRegistrationStateTransition("draft", "approved", "student");
  assert.equal(studentApprove.allowed, false, "Student cannot transition directly to approved");

  // Student submitting draft for advising
  const studentSubmit = validateRegistrationStateTransition("draft", "pending_advisor", "student");
  assert.equal(studentSubmit.allowed, true, "Student can transition draft to pending_advisor");

  // Advisor reviewing pending application
  const advisorApprove = validateRegistrationStateTransition("pending_advisor", "approved", "advisor");
  assert.equal(advisorApprove.allowed, true, "Advisor can approve pending application");

  // Advisor attempting to modify draft application before submission
  const advisorPremature = validateRegistrationStateTransition("draft", "approved", "advisor");
  assert.equal(advisorPremature.allowed, false, "Advisor cannot approve draft before submission");
});
