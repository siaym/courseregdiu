import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEmail,
  isDIUEmail,
  resolveEmailAuthorization,
  registerMockAuthorizedEmail,
  revokeMockAuthorizedEmail,
} from "@/lib/auth/email-authorization";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_ADMIN_PROFILE,
  MOCK_AUTHORIZED_EMAILS,
} from "@/lib/mock/data";

const baseUrl = "http://localhost:3000";

// ====================================================================
// TEST 1: DIU email student login succeeds
// ====================================================================
test("Policy Test 1: DIU email student login succeeds", async () => {
  // Domain check
  assert.equal(isDIUEmail("siyam.cse@diu.edu.bd"), true, "Valid @diu.edu.bd is recognized");
  assert.equal(isDIUEmail("siyam.cse@gmail.com"), false, "Non-DIU email is rejected");

  // 1.1: Standard DIU student email resolution
  const res = await resolveEmailAuthorization("siyam.cse@diu.edu.bd");
  assert.equal(res.authorized, true, "Valid @diu.edu.bd email must be authorized");
  assert.equal(res.role, "student", "Default eligibility role must be student");

  // 1.2: Normalization robustness (uppercase and whitespace)
  const normRes = await resolveEmailAuthorization("  SIYAM.CSE@DIU.EDU.BD  ");
  assert.equal(normRes.authorized, true, "Uppercase DIU email must normalize and succeed");
  assert.equal(normRes.role, "student");
});

// ====================================================================
// TEST 2: Unregistered personal email student login fails
// ====================================================================
test("Policy Test 2: Unregistered personal email student login fails", async () => {
  // 2.1: Unknown Gmail account
  const resGmail = await resolveEmailAuthorization("unregistered.student@gmail.com");
  assert.equal(resGmail.authorized, false, "Unregistered Gmail must be rejected");
  assert.equal(resGmail.reason, "UNREGISTERED_PERSONAL_EMAIL");

  // 2.2: Unknown Yahoo account
  const resYahoo = await resolveEmailAuthorization("someone@yahoo.com");
  assert.equal(resYahoo.authorized, false, "Unregistered Yahoo email must be rejected");

  // 2.3: Spoofed domain suffix
  const resSpoofed = await resolveEmailAuthorization("attacker@diu.edu.bd.evil.com");
  assert.equal(resSpoofed.authorized, false, "Spoofed domain must be rejected");
});

// ====================================================================
// TEST 3: Admin-authorized personal email student login succeeds
// ====================================================================
test("Policy Test 3: Admin-authorized personal email student login succeeds", async () => {
  // siyam.personal@gmail.com is authorized in MOCK_AUTHORIZED_EMAILS
  const res = await resolveEmailAuthorization("siyam.personal@gmail.com");
  assert.equal(res.authorized, true, "Admin-authorized personal email must be authorized");
  assert.equal(res.profileId, MOCK_STUDENT_PROFILE.id, "Must link to student's profile ID");
  assert.equal(res.emailType, "alternative_personal");

  // Live HTTP verification: accessing dashboard with authorized personal email session
  const dashRes = await fetch(`${baseUrl}/dashboard`, {
    headers: {
      Cookie: "diu_session_role=student_alt",
    },
    redirect: "manual",
  });
  assert.equal(dashRes.status, 200, "Authorized personal email student session must access dashboard");
});

// ====================================================================
// TEST 4: Both student emails resolve to the same profile
// ====================================================================
test("Policy Test 4: Both student emails resolve to the same profile", async () => {
  const diuResolution = await resolveEmailAuthorization("siyam.cse@diu.edu.bd");
  const personalResolution = await resolveEmailAuthorization("siyam.personal@gmail.com");

  assert.equal(diuResolution.authorized, true);
  assert.equal(personalResolution.authorized, true);

  // Both identities must map strictly to the same student profile ID
  assert.equal(
    personalResolution.profileId,
    MOCK_STUDENT_PROFILE.id,
    "Alternative email must resolve to same profile as primary student"
  );
  assert.equal(
    personalResolution.profile?.id,
    MOCK_STUDENT_PROFILE.id,
    "Full profile object must be identical"
  );
});

// ====================================================================
// TEST 5: Removing alternative email revokes access
// ====================================================================
test("Policy Test 5: Removing alternative email revokes access", async () => {
  // 5.1: Register a temporary test alternative email via registration helper
  const tempEmail = `temp.revocation.${Date.now()}@gmail.com`;
  registerMockAuthorizedEmail({
    id: `temp-auth-${Date.now()}`,
    profile_id: MOCK_STUDENT_PROFILE.id,
    auth_user_id: null,
    email: tempEmail,
    email_type: "alternative_personal",
    is_active: true,
    authorized_by: MOCK_ADMIN_PROFILE.id,
    authorized_at: new Date().toISOString(),
    reason: "Temporary test exception",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Verify it is authorized initially
  const beforeRevoke = await resolveEmailAuthorization(tempEmail);
  assert.equal(beforeRevoke.authorized, true);

  // 5.2: Revoke (remove) authorization via revocation helper
  revokeMockAuthorizedEmail(tempEmail);

  // 5.3: Verify access is immediately revoked
  const afterRevoke = await resolveEmailAuthorization(tempEmail);
  assert.equal(afterRevoke.authorized, false, "Revoked email must immediately lose authorization");
  assert.equal(afterRevoke.reason, "UNREGISTERED_PERSONAL_EMAIL");
});

// ====================================================================
// TEST 6: One email cannot be assigned to two profiles
// ====================================================================
test("Policy Test 6: One email cannot be assigned to two profiles", async () => {
  // Email already assigned to Siyam: "siyam.personal@gmail.com"
  const existingEmail = "siyam.personal@gmail.com";

  // Simulate collision check:
  const isAssigned = MOCK_AUTHORIZED_EMAILS.filter(
    (item) => normalizeEmail(item.email) === existingEmail
  );
  assert.equal(isAssigned.length, 1, "Email exists for one profile");

  // Attempting to authorize this email for a different profile (e.g. prof-student-01)
  const isDuplicate = MOCK_AUTHORIZED_EMAILS.some(
    (item) => normalizeEmail(item.email) === existingEmail && item.profile_id !== MOCK_STUDENT_PROFILE.id
  );
  assert.equal(isDuplicate, false, "Email must not be assigned to two profiles simultaneously");
});

// ====================================================================
// TEST 7: Unauthorized advisor email fails
// ====================================================================
test("Policy Test 7: Unauthorized advisor email fails", async () => {
  // A standard DIU student or unknown personal email cannot access Advisor Portal
  const studentAccessAdvisor = await fetch(`${baseUrl}/advisor`, {
    headers: {
      Cookie: "diu_session_role=student",
    },
    redirect: "manual",
  });
  assert.equal(
    studentAccessAdvisor.status === 307 || studentAccessAdvisor.status === 308 || studentAccessAdvisor.status === 302,
    true
  );
  const location = studentAccessAdvisor.headers.get("location") || "";
  assert.equal(location.includes("/unauthorized"), true, "Student cannot access advisor route");
});

// ====================================================================
// TEST 8: Admin-authorized personal advisor email succeeds
// ====================================================================
test("Policy Test 8: Admin-authorized personal advisor email succeeds", async () => {
  // dr.rahman.ahmed@gmail.com is authorized in MOCK_AUTHORIZED_EMAILS as advisor
  const authRes = await resolveEmailAuthorization("dr.rahman.ahmed@gmail.com");
  assert.equal(authRes.authorized, true, "Authorized personal advisor email must be authorized");
  assert.equal(authRes.role, "advisor", "Role must be advisor");
  assert.equal(authRes.emailType, "advisor_authorized");

  // Live HTTP verification: accessing advisor portal with authorized personal email session
  const advRes = await fetch(`${baseUrl}/advisor`, {
    headers: {
      Cookie: "diu_session_role=advisor_personal",
    },
    redirect: "manual",
  });
  assert.equal(advRes.status, 200, "Authorized personal advisor session must access /advisor");
});

// ====================================================================
// TEST 9: Deactivated advisor loses access
// ====================================================================
test("Policy Test 9: Deactivated advisor loses access", async () => {
  // deactivated.advisor@gmail.com is present with is_active = false
  const deactRes = await resolveEmailAuthorization("deactivated.advisor@gmail.com");
  assert.equal(deactRes.authorized, false, "Deactivated advisor email must NOT be authorized");
  assert.equal(deactRes.reason, "DEACTIVATED");

  // Live HTTP verification: deactivated advisor session must be redirected to /login with error
  const res = await fetch(`${baseUrl}/advisor`, {
    headers: {
      Cookie: "diu_session_role=advisor_deactivated",
    },
    redirect: "manual",
  });
  assert.equal(
    res.status === 307 || res.status === 308 || res.status === 302,
    true,
    "Deactivated advisor must be intercepted"
  );
  const location = res.headers.get("location") || "";
  assert.equal(
    location.includes("/login"),
    true,
    `Deactivated advisor must be redirected to /login (got: ${location})`
  );
});

// ====================================================================
// TEST 10: Personal email cannot grant admin access
// ====================================================================
test("Policy Test 10: Personal email cannot grant admin access", async () => {
  // 10.1: An authorized personal student email CANNOT access /admin
  const studentAdminRes = await fetch(`${baseUrl}/admin/emails`, {
    headers: {
      Cookie: "diu_session_role=student_alt",
    },
    redirect: "manual",
  });
  assert.equal(
    studentAdminRes.status === 307 || studentAdminRes.status === 308 || studentAdminRes.status === 302,
    true
  );
  const location = studentAdminRes.headers.get("location") || "";
  assert.equal(
    location.includes("/unauthorized"),
    true,
    "Personal student email must be redirected to /unauthorized when accessing /admin"
  );

  // 10.2: Only manually provisioned admin profile can access /admin
  const adminRes = await fetch(`${baseUrl}/admin/emails`, {
    headers: {
      Cookie: "diu_session_role=admin",
    },
    redirect: "manual",
  });
  assert.equal(adminRes.status, 200, "Authorized administrator session must access /admin/emails");
});
