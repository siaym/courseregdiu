import test from "node:test";
import assert from "node:assert/strict";
import {
  getMockAdvisorApplicationCenterData,
} from "../src/lib/advisor/queue-service.ts";
import {
  MOCK_ADVISOR_PROFILE,
} from "../src/lib/mock/data.ts";

// ====================================================================
// TEST SUITE: ADVISOR APPLICATION CENTER THREE-CATEGORY VERIFICATION
// ====================================================================

test("Scenario 1: Assigned student with no application appears under Not Applied", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Fahim Shahriar (student-fahim-05) is assigned to Dr. Rahman Ahmed and has no application
  const fahim = data.notApplied.find((item) => item.student.id === "student-fahim-05");
  assert.ok(fahim, "Assigned student Fahim Shahriar must appear in Not Applied list");
  assert.equal(fahim.student.diu_id, "221-15-460");
  assert.equal(fahim.student.full_name, "Fahim Shahriar");

  // Sadia Afrin (student-sadia-06) is also assigned and has no application
  const sadia = data.notApplied.find((item) => item.student.id === "student-sadia-06");
  assert.ok(sadia, "Assigned student Sadia Afrin must appear in Not Applied list");
});

test("Scenario 2: Assigned student with a pending application appears only under Pending", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Atikur Rahman has a pending application (reg-app-001)
  const atikurPending = data.pending.find((item) => item.student.id === "student-atikur-01");
  assert.ok(atikurPending, "Atikur Rahman must appear in Pending list");
  assert.equal(atikurPending.statusLabel, "Pending Review");

  // Must NOT appear in Approved or Not Applied
  const atikurApproved = data.approved.find((item) => item.student.id === "student-atikur-01");
  const atikurNotApplied = data.notApplied.find((item) => item.student.id === "student-atikur-01");
  assert.equal(atikurApproved, undefined, "Atikur Rahman must NOT appear in Approved list");
  assert.equal(atikurNotApplied, undefined, "Atikur Rahman must NOT appear in Not Applied list");
});

test("Scenario 3: Assigned student with an under-review application appears only under Pending", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Mithila Binte Hasan has an under-review application (reg-app-002)
  const mithilaPending = data.pending.find((item) => item.student.id === "student-mithila-02");
  assert.ok(mithilaPending, "Mithila Binte Hasan must appear in Pending list");
  assert.equal(mithilaPending.status, "under_review");
  assert.equal(mithilaPending.statusLabel, "Under Review");
  assert.equal(mithilaPending.isUnderReview, true);

  // Must NOT appear in Approved or Not Applied
  const mithilaApproved = data.approved.find((item) => item.student.id === "student-mithila-02");
  const mithilaNotApplied = data.notApplied.find((item) => item.student.id === "student-mithila-02");
  assert.equal(mithilaApproved, undefined, "Mithila Binte Hasan must NOT appear in Approved list");
  assert.equal(mithilaNotApplied, undefined, "Mithila Binte Hasan must NOT appear in Not Applied list");
});

test("Scenario 4: Assigned student with an approved application appears only under Approved", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Nusrat Ahmed has an approved application (reg-app-004)
  const nusratApproved = data.approved.find((item) => item.student.id === "student-nusrat-04");
  assert.ok(nusratApproved, "Nusrat Ahmed must appear in Approved list");
  assert.equal(nusratApproved.status, "approved");
  assert.equal(nusratApproved.statusLabel, "Approved");

  // Must NOT appear in Pending or Not Applied
  const nusratPending = data.pending.find((item) => item.student.id === "student-nusrat-04");
  const nusratNotApplied = data.notApplied.find((item) => item.student.id === "student-nusrat-04");
  assert.equal(nusratPending, undefined, "Nusrat Ahmed must NOT appear in Pending list");
  assert.equal(nusratNotApplied, undefined, "Nusrat Ahmed must NOT appear in Not Applied list");
});

test("Scenario 5: Student with an application does not appear under Not Applied", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Collect all student IDs that have an application in this semester
  const appStudentIds = new Set([
    ...data.pending.map((item) => item.student.id),
    ...data.approved.map((item) => item.student.id),
  ]);

  // Ensure NO student in Not Applied has an application
  data.notApplied.forEach((item) => {
    assert.equal(
      appStudentIds.has(item.student.id),
      false,
      `Student ${item.student.full_name} (${item.student.id}) has an existing application and must NOT be in Not Applied`
    );
  });
});

test("Scenario 6: Student assigned to another advisor never appears", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Kazi Tanvir (student-other-advisor-99) is assigned to Dr. Sheak Rashed Haider Noori
  const otherInPending = data.pending.find((item) => item.student.id === "student-other-advisor-99");
  const otherInApproved = data.approved.find((item) => item.student.id === "student-other-advisor-99");
  const otherInNotApplied = data.notApplied.find((item) => item.student.id === "student-other-advisor-99");

  assert.equal(otherInPending, undefined, "Other advisor's student must NEVER appear in Pending");
  assert.equal(otherInApproved, undefined, "Other advisor's student must NEVER appear in Approved");
  assert.equal(otherInNotApplied, undefined, "Other advisor's student must NEVER appear in Not Applied");
});

test("Scenario 7: Changing the semester updates all three lists and counts correctly", () => {
  // Query Spring 2027 (Active Advising Cycle)
  const springData = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");
  assert.equal(springData.selectedSemester.id, "sem-spring-2027");
  assert.equal(springData.counts.pending, 4);
  assert.equal(springData.counts.approved, 1);
  assert.equal(springData.counts.notApplied, 4);
  assert.equal(springData.counts.totalAssigned, 9);

  // Switch to Fall 2025 (Historical Audited Term)
  const fallData = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-fall-2025");
  assert.equal(fallData.selectedSemester.id, "sem-fall-2025");
  assert.equal(fallData.counts.pending, 0); // All finalized
  assert.equal(fallData.counts.approved, 3);
  assert.equal(fallData.counts.notApplied, 0);
  assert.equal(fallData.counts.totalAssigned, 3);

  // Verify list lengths match counts exactly
  assert.equal(fallData.pending.length, fallData.counts.pending);
  assert.equal(fallData.approved.length, fallData.counts.approved);
  assert.equal(fallData.notApplied.length, fallData.counts.notApplied);
});

test("Scenario 8: Search works independently in all three categories", () => {
  const data = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-spring-2027");

  // Search in Pending: "Atikur"
  const pendingMatch = data.pending.filter((p) =>
    p.student.full_name.toLowerCase().includes("atikur")
  );
  assert.equal(pendingMatch.length, 1);
  assert.equal(pendingMatch[0].student.full_name, "Atikur Rahman");

  // Search in Approved: "Nusrat"
  const approvedMatch = data.approved.filter((a) =>
    a.student.full_name.toLowerCase().includes("nusrat")
  );
  assert.equal(approvedMatch.length, 1);
  assert.equal(approvedMatch[0].student.full_name, "Nusrat Ahmed");

  // Search in Not Applied: "Fahim"
  const notAppliedMatch = data.notApplied.filter((n) =>
    n.student.full_name.toLowerCase().includes("fahim")
  );
  assert.equal(notAppliedMatch.length, 1);
  assert.equal(notAppliedMatch[0].student.full_name, "Fahim Shahriar");

  // Search for non-existent query in Pending
  const noMatch = data.pending.filter((p) =>
    p.student.full_name.toLowerCase().includes("nonexistentstudent")
  );
  assert.equal(noMatch.length, 0);
});

test("Scenario 9: Empty categories display appropriate counts and states", () => {
  // Query Fall 2025: Pending is empty (0)
  const fallData = getMockAdvisorApplicationCenterData(MOCK_ADVISOR_PROFILE.id, "sem-fall-2025");
  assert.equal(fallData.counts.pending, 0);
  assert.equal(fallData.pending.length, 0);

  // Not Applied in Fall 2025 is empty (0)
  assert.equal(fallData.counts.notApplied, 0);
  assert.equal(fallData.notApplied.length, 0);

  // Approved has exactly 3 records
  assert.equal(fallData.counts.approved, 3);
  assert.equal(fallData.approved.length, 3);
});
