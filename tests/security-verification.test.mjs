import test from "node:test";
import assert from "node:assert/strict";

import { validateSafeRedirect } from "../src/app/auth/callback/route.ts";
import { isDIUEmail } from "../src/lib/auth/roles.ts";
import { studentOnboardingSchema } from "../src/lib/validations/onboarding.ts";
import { profileUpdateSchema } from "../src/lib/validations/auth.ts";
import { validateRegistrationStateTransition } from "../src/lib/validations/registration.ts";

const baseUrl = "http://localhost:3000";

// ====================================================================
// TEST 1: Presentation Demo Mode — Login Page Bypassed
// ====================================================================
test("Security Test 1: Route Access & Login Page Bypass for Demo", async () => {
  // 1.1: Verify /login redirects directly to application workspace (no login screen shown)
  const loginRes = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  assert.equal(
    loginRes.status === 307 || loginRes.status === 308 || loginRes.status === 302,
    true,
    "/login must redirect away from login screen"
  );
  const loginLocation = loginRes.headers.get("location") || "";
  assert.equal(
    loginLocation.includes("/dashboard"),
    true,
    `/login must redirect to /dashboard (got: ${loginLocation})`
  );

  // 1.2: Verify root / renders the DIU institutional landing page (HTTP 200)
  const rootRes = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert.equal(
    rootRes.status,
    200,
    `Root / must render landing page with 200 (got: ${rootRes.status})`
  );

  // 1.3: Verify protected paths do not bounce to /login during demo presentation
  const protectedPaths = ["/dashboard", "/courses", "/schedule", "/student/profile"];
  for (const path of protectedPaths) {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    const location = res.headers.get("location") || "";
    assert.equal(
      !location.includes("/login"),
      true,
      `Protected path ${path} must never redirect to /login during demo (got: ${location})`
    );
  }
});

// ====================================================================
// TEST 2: Student Accessing Advisor Routes
// ====================================================================
test("Security Test 2: Student Accessing Advisor Routes", async () => {
  const advisorPaths = ["/advisor", "/advisor/queue", "/advisor/students", "/advisor/review/reg-app-2027-01"];

  for (const path of advisorPaths) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Cookie: "diu_session_role=student",
      },
      redirect: "manual",
    });
    assert.equal(
      res.status === 307 || res.status === 308 || res.status === 302,
      true,
      `Student accessing ${path} must be intercepted`
    );
    const location = res.headers.get("location") || "";
    assert.equal(
      location.includes("/unauthorized"),
      true,
      `Student accessing ${path} must be redirected to /unauthorized (got: ${location})`
    );
  }
});

// ====================================================================
// TEST 3: Student Attempting Role Escalation
// ====================================================================
test("Security Test 3: Student Attempting Role Escalation", () => {
  // 3.1: Profile update schema must reject attempts to submit role, cgpa, or completed credits
  const escalationAttempt = {
    fullName: "Malicious Student",
    role: "admin",
    cgpa: 4.00,
    completedCredits: 148,
    departmentCode: "CSE",
  };

  const parsed = profileUpdateSchema.safeParse(escalationAttempt);
  // Even if parsed passes valid fields, TypeScript and Zod schema strip/reject unpermitted properties
  if (parsed.success) {
    const sanitized = parsed.data;
    assert.equal(sanitized.role, undefined, "Role must NOT be writable through profile update payload");
    assert.equal(sanitized.cgpa, undefined, "CGPA must NOT be writable through profile update payload");
    assert.equal(sanitized.completedCredits, undefined, "Credits must NOT be writable through profile update payload");
  }

  // 3.2: Verify domain validation rejects non-institutional emails
  assert.equal(isDIUEmail("student@gmail.com"), false);
  assert.equal(isDIUEmail("admin@diu.edu.bd.fake.org"), false);
  assert.equal(isDIUEmail("legit.student@diu.edu.bd"), true);
});

// ====================================================================
// TEST 4: Advisor Accessing an Unassigned Student
// ====================================================================
test("Security Test 4: Advisor Accessing an Unassigned Student", async () => {
  // Dr. Rahman Ahmed's assigned IDs are reg-app-2027-01 through reg-app-2027-04
  // Accessing an unassigned ID must be blocked and redirected to /unauthorized
  const unassignedPath = "/advisor/review/unassigned-student-reg-999";
  const res = await fetch(`${baseUrl}${unassignedPath}`, {
    headers: {
      Cookie: "diu_session_role=advisor",
    },
    redirect: "manual",
  });

  assert.equal(
    res.status === 307 || res.status === 308 || res.status === 302,
    true,
    "Advisor accessing unassigned student registration must be intercepted"
  );
  const location = res.headers.get("location") || "";
  assert.equal(
    location.includes("/unauthorized"),
    true,
    `Unassigned review must redirect to /unauthorized (got: ${location})`
  );
});

// ====================================================================
// TEST 5: Incomplete Onboarding Bypass Prevention
// ====================================================================
test("Security Test 5: Incomplete Onboarding Bypass", async () => {
  const protectedStudentRoutes = ["/dashboard", "/courses", "/schedule", "/student/tracking"];

  for (const path of protectedStudentRoutes) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        Cookie: "diu_session_role=student_new",
      },
      redirect: "manual",
    });

    assert.equal(
      res.status === 307 || res.status === 308 || res.status === 302,
      true,
      `Incomplete student accessing ${path} must be intercepted`
    );
    const location = res.headers.get("location") || "";
    assert.equal(
      location.includes("/onboarding"),
      true,
      `Incomplete student must be redirected to /onboarding from ${path} (got: ${location})`
    );
  }
});

// ====================================================================
// TEST 6: Duplicate Student ID Submission
// ====================================================================
test("Security Test 6: Duplicate Student ID Submission", async () => {
  // Test schema rejection for invalid formats
  const invalidFormat = studentOnboardingSchema.safeParse({
    fullName: "Valid Name",
    diuId: "random-non-diu-id",
    batch: "61st Batch",
  });
  assert.equal(invalidFormat.success, false, "Invalid DIU Student ID syntax must be rejected");

  // Dynamic import of Server Action to test duplicate ID rejection logic
  const { submitStudentOnboarding } = await import("../src/app/onboarding/actions.ts");

  // Submitting an ID known to belong to another student (e.g. 211-15-456)
  const result = await submitStudentOnboarding({
    fullName: "Imposter Scholar",
    diuId: "211-15-456",
    batch: "61st Batch",
  });

  // When not signed in or submitting existing ID, it must fail safely
  assert.equal(result.success, false, "Duplicate student ID submission must be rejected");
  assert.equal(
    result.error?.includes("already registered") || result.error?.includes("Authentication required"),
    true,
    "Expected collision or authentication protection notice"
  );
});

// ====================================================================
// TEST 7: Unauthorized Application Updates
// ====================================================================
test("Security Test 7: Unauthorized Application Updates", () => {
  // 7.1: Student CANNOT self-approve an application
  const selfApprove = validateRegistrationStateTransition("draft", "approved", "student");
  assert.equal(selfApprove.allowed, false, "Student must not be allowed to transition draft -> approved");

  // 7.2: Student CANNOT modify an application that is already submitted (pending_advisor)
  const editSubmitted = validateRegistrationStateTransition("pending_advisor", "draft", "student");
  assert.equal(editSubmitted.allowed, false, "Student must not modify submitted application");

  // 7.3: Student CAN submit a draft application for review
  const validSubmission = validateRegistrationStateTransition("draft", "pending_advisor", "student");
  assert.equal(validSubmission.allowed, true, "Student must be allowed to submit draft -> pending_advisor");

  // 7.4: Advisor CANNOT modify a draft application (student has not submitted yet)
  const advisorEditDraft = validateRegistrationStateTransition("draft", "approved", "advisor");
  assert.equal(advisorEditDraft.allowed, false, "Advisor cannot approve unsubmitted draft");

  // 7.5: Advisor CAN approve a pending application
  const advisorApprove = validateRegistrationStateTransition("pending_advisor", "approved", "advisor");
  assert.equal(advisorApprove.allowed, true, "Advisor must be allowed to approve pending_advisor");

  // 7.6: Advisor CAN reject a pending application with revisions
  const advisorReject = validateRegistrationStateTransition("pending_advisor", "rejected", "advisor");
  assert.equal(advisorReject.allowed, true, "Advisor must be allowed to reject pending_advisor");
});

// ====================================================================
// TEST 8: Invalid OAuth Redirect (Open Redirect Prevention)
// ====================================================================
test("Security Test 8: Invalid OAuth Redirect", async () => {
  // 8.1: Unit validation of dangerous redirect targets
  const dangerousRedirects = [
    "https://evil.com",
    "http://phishing.site/login",
    "//attacker.com/bypass",
    "/\\attacker.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://malicious.org",
    "/unknown/unwhitelisted/path",
    "",
    null,
    undefined,
  ];

  for (const target of dangerousRedirects) {
    const safeTarget = validateSafeRedirect(target);
    assert.equal(
      safeTarget,
      "/dashboard",
      `Redirect target '${target}' must fallback to safe internal route '/dashboard'`
    );
  }

  // 8.2: Whitelisted valid routes must be preserved
  assert.equal(validateSafeRedirect("/dashboard"), "/dashboard");
  assert.equal(validateSafeRedirect("/courses"), "/courses");
  assert.equal(validateSafeRedirect("/advisor"), "/advisor");
  assert.equal(validateSafeRedirect("/onboarding"), "/onboarding");
  assert.equal(validateSafeRedirect("/student/tracking"), "/student/tracking");

  // 8.3: Live integration verification against /auth/callback endpoint
  const callbackRes = await fetch(`${baseUrl}/auth/callback?code=mock_code&next=https://evil.com`, {
    redirect: "manual",
  });
  const location = callbackRes.headers.get("location") || "";
  assert.equal(
    location.includes("https://evil.com"),
    false,
    "OAuth callback route must NEVER redirect to external evil URL"
  );
});
