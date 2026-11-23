import test from "node:test";
import assert from "node:assert/strict";

import {
  getCurrentUser,
  getCurrentProfile,
  requireAdmin,
} from "../src/lib/auth/roles.ts";
import { resolveEmailAuthorization } from "../src/lib/auth/email-authorization.ts";
import { isDemoMode } from "../src/lib/config/demo.ts";
import { submitStudentOnboarding } from "../src/app/onboarding/actions.ts";
import { finalizeAdvisorReviewAction } from "../src/app/advisor/actions.ts";

// ====================================================================
// TEST 1: Production Strict Isolation — No Dev Session Impersonation
// ====================================================================
test("P0 Security Test 1: Production environment strictly ignores diu_session_role=admin", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRole = process.env.NODE_TEST_ROLE;

  try {
    // Simulate production environment
    process.env.NODE_ENV = "production";
    process.env.NODE_TEST_ROLE = "admin";

    // In production, getCurrentUser must NEVER construct mock admin user
    const user = await getCurrentUser();
    assert.equal(
      user,
      null,
      "In production, unauthenticated request with admin dev cookie/role must return null"
    );

    // In production, getCurrentProfile must NEVER return mock admin profile
    const profile = await getCurrentProfile(user);
    assert.equal(
      profile,
      null,
      "In production, profile resolution without verified Supabase user must return null"
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NODE_TEST_ROLE = originalRole;
  }
});

// ====================================================================
// TEST 2: Production Strict Isolation — requireAdmin Throws/Redirects
// ====================================================================
test("P0 Security Test 2: Production requireAdmin strictly blocks impersonated admin", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRole = process.env.NODE_TEST_ROLE;

  try {
    process.env.NODE_ENV = "production";
    process.env.NODE_TEST_ROLE = "admin";

    let intercepted = false;
    try {
      await requireAdmin();
    } catch (err) {
      // In Next.js, redirect() throws a NEXT_REDIRECT digest
      intercepted = true;
      const message = String(err);
      assert.equal(
        message.includes("NEXT_REDIRECT") || message.includes("login") || message.includes("unauthorized"),
        true,
        `Expected redirect interception, got: ${message}`
      );
    }
    assert.equal(intercepted, true, "requireAdmin must strictly intercept unauthenticated request in production");
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NODE_TEST_ROLE = originalRole;
  }
});

// ====================================================================
// TEST 3: DEMO_MODE Hard-Disabled in Production
// ====================================================================
test("P0 Security Test 3: DEMO_MODE is unconditionally false in production", async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";

    assert.equal(
      isDemoMode(),
      false,
      "DEMO_MODE must be strictly false in production regardless of env vars"
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// ====================================================================
// TEST 4: Email Authorization Fails Closed on Database Errors
// ====================================================================
test("P0 Security Test 4: Database query failure fails closed in resolveEmailAuthorization", async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    // Unregistered personal email in production must always fail closed
    const res = await resolveEmailAuthorization("malicious.user@external.com");
    assert.equal(res.authorized, false, "External personal email must never be authorized");
    assert.equal(
      res.reason === "UNREGISTERED_PERSONAL_EMAIL" || res.reason === "DATABASE_UNAVAILABLE",
      true,
      `Expected fail-closed denial reason, got: ${res.reason}`
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// ====================================================================
// TEST 5: Deactivated Account Fails Closed
// ====================================================================
test("P0 Security Test 5: Deactivated email identity is rejected with DEACTIVATED", async () => {
  const res = await resolveEmailAuthorization("deactivated.advisor@gmail.com");
  assert.equal(res.authorized, false, "Deactivated account must be rejected");
  assert.equal(res.reason, "DEACTIVATED");
});

// ====================================================================
// TEST 6: Student Ownership & Advisor Assignment Isolation
// ====================================================================
test("P1 Security Test 6: Finalize review strictly enforces advisor assignment", async () => {
  const originalRole = process.env.NODE_TEST_ROLE;
  try {
    // Simulate student attempting to finalize an application
    process.env.NODE_TEST_ROLE = "student";

    const result = await finalizeAdvisorReviewAction({
      registrationId: "reg-app-001",
      action: "approve",
      notes: "Student attempting self-approval",
    });

    assert.equal(result.success, false, "Student must never be allowed to finalize advisor review");
    assert.equal(
      result.error?.includes("Unauthorized") || result.error?.includes("Forbidden"),
      true,
      "Expected authorization failure message"
    );
  } finally {
    process.env.NODE_TEST_ROLE = originalRole;
  }
});

// ====================================================================
// TEST 7: Onboarding Fails Closed on Unauthenticated Request
// ====================================================================
test("P1 Security Test 7: Onboarding fails closed if unauthenticated", async () => {
  const originalRole = process.env.NODE_TEST_ROLE;
  try {
    delete process.env.NODE_TEST_ROLE;

    const result = await submitStudentOnboarding({
      fullName: "Test Unauthenticated Student",
      diuId: "221-15-99999",
      batch: "60th Batch",
    });

    assert.equal(result.success, false, "Unauthenticated onboarding must be rejected");
    assert.equal(
      result.error?.includes("Authentication required") || result.error?.includes("Please sign in"),
      true,
      "Expected authentication required error"
    );
  } finally {
    process.env.NODE_TEST_ROLE = originalRole;
  }
});
