import test from "node:test";
import assert from "node:assert/strict";

import {
  isEmailAuthEnabled,
  isDemoBypassEnabled,
  setDemoBypassEnabled,
  getAllSystemSettings,
} from "@/lib/settings/system-settings";
import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
  signInWithEmailPasswordAction,
  toggleEmailAuthAction,
  toggleDemoBypassAction,
} from "@/app/login/actions";

test("Email Authentication & Admin Dynamic Toggle Suite", async (t) => {
  await t.test("Scenario 1: System settings defaults and inspection", async () => {
    const settings = await getAllSystemSettings();
    assert.equal(typeof settings.emailAuthEnabled, "boolean");
    assert.equal(typeof settings.demoBypassEnabled, "boolean");
    assert.ok(settings.updatedAt, "Settings must have an updatedAt timestamp");
  });

  await t.test("Scenario 2: Admin can toggle Email Authentication ON and OFF", async () => {
    process.env.NODE_TEST_ROLE = "admin";

    // Toggle ON
    const onRes = await toggleEmailAuthAction(true);
    assert.equal(onRes.success, true);
    assert.equal(onRes.data?.enabled, true);
    assert.equal(await isEmailAuthEnabled(), true);

    // Toggle OFF
    const offRes = await toggleEmailAuthAction(false);
    assert.equal(offRes.success, true);
    assert.equal(offRes.data?.enabled, false);
    assert.equal(await isEmailAuthEnabled(), false);

    // Re-enable for subsequent scenarios
    await toggleEmailAuthAction(true);
    assert.equal(await isEmailAuthEnabled(), true);

    delete process.env.NODE_TEST_ROLE;
  });

  await t.test("Scenario 3: Non-admin users cannot toggle Email Authentication", async () => {
    process.env.NODE_TEST_ROLE = "student";

    let threw = false;
    try {
      await toggleEmailAuthAction(false);
    } catch (err) {
      threw = true;
      assert.ok(
        err?.message?.includes("NEXT_REDIRECT") || err?.message?.includes("unauthorized"),
        "Non-admin role must be redirected/denied"
      );
    }

    assert.ok(threw, "Non-admin call must throw or redirect");
    delete process.env.NODE_TEST_ROLE;
  });

  await t.test("Scenario 4: When Email Auth is disabled, all email sign-in actions fail closed", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(false);
    delete process.env.NODE_TEST_ROLE;

    assert.equal(await isEmailAuthEnabled(), false);

    // 4.1 OTP request rejection
    const otpReqRes = await requestEmailOtpAction({ email: "siyam.cse@diu.edu.bd" });
    assert.equal(otpReqRes.success, false);
    assert.ok(
      otpReqRes.error?.toLowerCase().includes("disabled"),
      `Error must state email auth is disabled (got: ${otpReqRes.error})`
    );

    // 4.2 OTP verify rejection
    const otpVerifyRes = await verifyEmailOtpAction({
      email: "siyam.cse@diu.edu.bd",
      token: "123456",
    });
    assert.equal(otpVerifyRes.success, false);
    assert.ok(
      otpVerifyRes.error?.toLowerCase().includes("disabled"),
      `Error must state email auth is disabled (got: ${otpVerifyRes.error})`
    );

    // 4.3 Password login rejection
    const pwdRes = await signInWithEmailPasswordAction({
      email: "siyam.cse@diu.edu.bd",
      password: "Password123!",
    });
    assert.equal(pwdRes.success, false);
    assert.ok(
      pwdRes.error?.toLowerCase().includes("disabled"),
      `Error must state email auth is disabled (got: ${pwdRes.error})`
    );

    // Restore Email Auth to ON for remaining tests
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;
  });

  await t.test("Scenario 5: When Email Auth is enabled, unauthorized email is rejected", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await requestEmailOtpAction({ email: "intruder.random@gmail.com" });
    assert.equal(res.success, false);
    assert.ok(
      res.error?.toLowerCase().includes("not authorized"),
      `Unauthorized email must be rejected (got: ${res.error})`
    );
  });

  await t.test("Scenario 6: When Email Auth is enabled, deactivated email is rejected", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await requestEmailOtpAction({ email: "deactivated.advisor@gmail.com" });
    assert.equal(res.success, false);
    assert.ok(
      res.error?.toLowerCase().includes("deactivated"),
      `Deactivated account must be rejected (got: ${res.error})`
    );
  });

  await t.test("Scenario 7: When Email Auth is enabled, authorized DIU email receives OTP", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await requestEmailOtpAction({ email: "siyam.cse@diu.edu.bd" });
    assert.equal(res.success, true);
    assert.equal(res.data?.email, "siyam.cse@diu.edu.bd");
  });

  await t.test("Scenario 8: When Email Auth is enabled, authorized alternative personal email receives OTP", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await requestEmailOtpAction({ email: "siyam.personal@gmail.com" });
    assert.equal(res.success, true);
    assert.equal(res.data?.email, "siyam.personal@gmail.com");
  });

  await t.test("Scenario 9: Correct OTP code verifies and establishes session", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await verifyEmailOtpAction({
      email: "siyam.cse@diu.edu.bd",
      token: "123456",
    });
    assert.equal(res.success, true);
    assert.ok(res.redirectTo, "Must provide landing destination");
  });

  await t.test("Scenario 10: Invalid OTP code is rejected", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    await toggleEmailAuthAction(true);
    delete process.env.NODE_TEST_ROLE;

    const res = await verifyEmailOtpAction({
      email: "siyam.cse@diu.edu.bd",
      token: "999999",
    });
    assert.equal(res.success, false);
    assert.ok(
      res.error?.toLowerCase().includes("invalid"),
      `Invalid token must be rejected (got: ${res.error})`
    );
  });

  await t.test("Scenario 11: Demo bypass is hard-disabled in production and toggleable by admin in dev", async () => {
    process.env.NODE_TEST_ROLE = "admin";
    const devToggle = await toggleDemoBypassAction(false);
    assert.equal(devToggle.success, true);
    assert.equal(devToggle.data?.enabled, false);

    const devToggleOn = await toggleDemoBypassAction(true);
    assert.equal(devToggleOn.success, true);
    assert.equal(devToggleOn.data?.enabled, true);
    delete process.env.NODE_TEST_ROLE;

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    assert.equal(await isDemoBypassEnabled(), false);

    const res = await setDemoBypassEnabled(true);
    assert.equal(res.success, false);
    assert.equal(await isDemoBypassEnabled(), false);

    process.env.NODE_ENV = origEnv;
  });
});
