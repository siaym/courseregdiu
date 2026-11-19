import test from "node:test";
import assert from "node:assert/strict";

// 1. Test validateSafeRedirect (OAuth Redirect Security)
import { validateSafeRedirect } from "../src/app/auth/callback/route.ts";

test("OAuth Redirect Security - Open Redirect Prevention", () => {
  // Valid internal paths
  assert.equal(validateSafeRedirect("/dashboard"), "/dashboard");
  assert.equal(validateSafeRedirect("/courses"), "/courses");
  assert.equal(validateSafeRedirect("/advisor"), "/advisor");
  assert.equal(validateSafeRedirect("/onboarding"), "/onboarding");
  assert.equal(validateSafeRedirect("/student/tracking"), "/student/tracking");

  // Malicious external targets MUST fallback to safe default (/dashboard)
  assert.equal(validateSafeRedirect("https://evil.com"), "/dashboard");
  assert.equal(validateSafeRedirect("http://attacker.com/phish"), "/dashboard");
  assert.equal(validateSafeRedirect("//evil.com/bypass"), "/dashboard");
  assert.equal(validateSafeRedirect("/\\evil.com"), "/dashboard");
  assert.equal(validateSafeRedirect("javascript:alert(1)"), "/dashboard");
  assert.equal(validateSafeRedirect("data:text/html,evil"), "/dashboard");
  assert.equal(validateSafeRedirect(null), "/dashboard");
  assert.equal(validateSafeRedirect(undefined), "/dashboard");
  assert.equal(validateSafeRedirect(""), "/dashboard");
  assert.equal(validateSafeRedirect("/unwhitelisted/random/path"), "/dashboard");
});

// 2. Test isDIUEmail (Institutional Domain Verification)
import { isDIUEmail } from "../src/lib/auth/roles.ts";

test("Institutional Identity - @diu.edu.bd Domain Enforcement", () => {
  // Valid DIU emails
  assert.equal(isDIUEmail("siyam.cse@diu.edu.bd"), true);
  assert.equal(isDIUEmail("student.221@diu.edu.bd"), true);
  assert.equal(isDIUEmail("faculty@diu.edu.bd"), true);

  // Unauthorized domains
  assert.equal(isDIUEmail("attacker@gmail.com"), false);
  assert.equal(isDIUEmail("student@yahoo.com"), false);
  assert.equal(isDIUEmail("hacker@diu.edu.bd.evil.com"), false);
  assert.equal(isDIUEmail("fake@diu.edu.org"), false);
  assert.equal(isDIUEmail(""), false);
  assert.equal(isDIUEmail(null), false);
  assert.equal(isDIUEmail(undefined), false);
});

// 3. Test studentOnboardingSchema (Zod Input Validation & Constraints)
import { studentOnboardingSchema } from "../src/lib/validations/onboarding.ts";

test("Student Onboarding Schema - Strict DIU Input Syntax", () => {
  // Valid onboarding payloads
  const valid1 = studentOnboardingSchema.safeParse({
    fullName: "Atikur Rahman",
    diuId: "211-15-456",
    batch: "61st Batch",
  });
  assert.equal(valid1.success, true);

  const valid2 = studentOnboardingSchema.safeParse({
    fullName: "Siyam Ahmed",
    diuId: "221-15-12345",
    batch: "60th Batch",
  });
  assert.equal(valid2.success, true);

  // Invalid DIU ID syntax
  const invalidId = studentOnboardingSchema.safeParse({
    fullName: "Siyam Ahmed",
    diuId: "invalid-id-syntax",
    batch: "60th Batch",
  });
  assert.equal(invalidId.success, false);

  // Missing or short name
  const invalidName = studentOnboardingSchema.safeParse({
    fullName: "A",
    diuId: "221-15-12345",
    batch: "60th Batch",
  });
  assert.equal(invalidName.success, false);

  // Missing batch
  const invalidBatch = studentOnboardingSchema.safeParse({
    fullName: "Siyam Ahmed",
    diuId: "221-15-12345",
    batch: "",
  });
  assert.equal(invalidBatch.success, false);
});

// 4. Live Server Route Guard Integration Tests
test("Server Route Guards - Unauthenticated Access Interception", async () => {
  const baseUrl = "http://localhost:3000";

  // Test 4.1: Unauthenticated access to /dashboard must redirect to /login
  const dashRes = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
  assert.equal(
    dashRes.status === 307 || dashRes.status === 308 || dashRes.status === 302,
    true,
    "Expected redirect on unauthenticated /dashboard access"
  );
  const dashLocation = dashRes.headers.get("location") || "";
  assert.equal(dashLocation.includes("/login"), true, "Redirect must target /login");

  // Test 4.2: Unauthenticated access to /advisor must redirect to /login
  const advisorRes = await fetch(`${baseUrl}/advisor`, { redirect: "manual" });
  assert.equal(
    advisorRes.status === 307 || advisorRes.status === 308 || advisorRes.status === 302,
    true,
    "Expected redirect on unauthenticated /advisor access"
  );
  const advisorLocation = advisorRes.headers.get("location") || "";
  assert.equal(advisorLocation.includes("/login"), true, "Redirect must target /login");

  // Test 4.3: Unauthenticated access to /courses must redirect to /login
  const coursesRes = await fetch(`${baseUrl}/courses`, { redirect: "manual" });
  assert.equal(
    coursesRes.status === 307 || coursesRes.status === 308 || coursesRes.status === 302,
    true,
    "Expected redirect on unauthenticated /courses access"
  );

  // Test 4.4: Student role attempting to access /advisor must redirect to /unauthorized
  const studentForbiddenRes = await fetch(`${baseUrl}/advisor`, {
    headers: {
      Cookie: "diu_session_role=student",
    },
    redirect: "manual",
  });
  assert.equal(
    studentForbiddenRes.status === 307 || studentForbiddenRes.status === 308 || studentForbiddenRes.status === 302,
    true
  );
  const forbiddenLocation = studentForbiddenRes.headers.get("location") || "";
  assert.equal(
    forbiddenLocation.includes("/unauthorized"),
    true,
    "Student accessing advisor route must be redirected to /unauthorized"
  );

  // Test 4.5: Incomplete student attempting to access /dashboard must redirect to /onboarding
  const incompleteStudentRes = await fetch(`${baseUrl}/dashboard`, {
    headers: {
      Cookie: "diu_session_role=student_new",
    },
    redirect: "manual",
  });
  assert.equal(
    incompleteStudentRes.status === 307 || incompleteStudentRes.status === 308 || incompleteStudentRes.status === 302,
    true
  );
  const onboardingLocation = incompleteStudentRes.headers.get("location") || "";
  assert.equal(
    onboardingLocation.includes("/onboarding"),
    true,
    "Incomplete student accessing /dashboard must be redirected to /onboarding"
  );

  // Test 4.6: Open redirect attack on auth callback route
  const callbackPhishRes = await fetch(`${baseUrl}/auth/callback?code=mock_code&next=https://evil.com`, {
    redirect: "manual",
  });
  const callbackLocation = callbackPhishRes.headers.get("location") || "";
  assert.equal(
    callbackLocation.includes("https://evil.com"),
    false,
    "Callback must NEVER redirect to external evil destination"
  );
});
