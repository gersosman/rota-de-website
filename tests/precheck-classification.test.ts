import assert from "node:assert/strict";
import test from "node:test";
import { classifyAssessment, classifyPrecheck } from "../src/lib/domain/classify.ts";
import { journeySchema } from "../src/lib/validation/assessment.ts";

const asked = {
  residenceCountry: "TR",
  ceIntent: "have" as const,
  src3: "have" as const,
  experienceRange: "y5_plus",
};

test("a complete precheck is not marked incomplete because unasked fields are absent", () => {
  const result = classifyPrecheck(asked);
  assert.equal(result.hint, "NEEDS_REVIEW");
  assert.equal(result.leadStatus, "NEEDS_REVIEW");
  assert.deepEqual(result.missing, []);
  assert.match(result.reason, /uygunluk kararı verilmedi/i);
  assert.doesNotMatch(result.reason, /eksik:/i);
});

test("planning, none and an information request stay distinct from a missing answer", () => {
  const result = classifyPrecheck({
    residenceCountry: "TR",
    ceIntent: "planning",
    src3: "info",
    experienceRange: "none",
  });
  assert.equal(result.hint, "NEEDS_REVIEW");
  assert.deepEqual(result.missing, []);
});

test("another country is stored as a real answer and a blank name is missing", () => {
  const named = classifyPrecheck({ ...asked, residenceCountry: "OTHER", residenceDetail: "Hollanda" });
  assert.equal(named.hint, "NEEDS_REVIEW");
  const blank = classifyPrecheck({ ...asked, residenceCountry: "OTHER" });
  assert.equal(blank.hint, "INSUFFICIENT_INFORMATION");
  assert.ok(blank.missing.includes("residenceDetail"));
  assert.match(blank.reason, /Ülke adı/);
});

test("a negative licence answer is not treated as missing information", () => {
  const result = classifyAssessment({
    residenceCountry: "TR",
    ageRange: "undisclosed",
    licenceClasses: [],
    licenceCountry: "TR",
    hasCe: "no",
    euEeaLicence: "no",
    code95: "no",
    experienceRange: "none",
    germanLevel: "none",
    intent: "unsure",
  });
  assert.equal(result.hint, "NEEDS_REVIEW");
  assert.notEqual(result.hint, "INSUFFICIENT_INFORMATION");
  assert.notEqual(result.hint, "BESCHV_24A_ABS2_RELATED");
});

test("unknown code 95 is not forced onto abs. 2 and src3 is not treated as code 95", () => {
  const unknown = classifyAssessment({
    residenceCountry: "TR",
    ageRange: "25_34",
    licenceClasses: ["CE"],
    licenceCountry: "TR",
    hasCe: "yes",
    euEeaLicence: "yes",
    code95: "unknown",
    experienceRange: "y3_5",
    germanLevel: "B1",
    intent: "work_in_germany",
  });
  assert.equal(unknown.hint, "NEEDS_REVIEW");
  const srcOnly = classifyPrecheck({ ...asked, src3: "have" });
  assert.notEqual(srcOnly.hint, "BESCHV_24A_ABS1_RELATED");
  assert.notEqual(srcOnly.hint, "BESCHV_24A_ABS2_RELATED");
});

test("the live journey accepts Turkey, another country and a required email", () => {
  const base = {
    ce: "planning" as const,
    src3: "info" as const,
    experience: "none" as const,
    fullName: "Ada Yılmaz",
    email: "aday@example.com",
    city: "Ankara",
    marketingOptIn: false,
    consent: true as const,
    disclaimerAck: true as const,
    idempotencyKey: "journey-key-precheck",
  };
  const turkey = journeySchema.safeParse({ ...base, residence: "TR" });
  assert.equal(turkey.success, true);
  if (turkey.success) {
    assert.equal(turkey.data.german, undefined);
    assert.equal(turkey.data.availability, undefined);
    assert.equal(turkey.data.ce, "planning");
    assert.equal(turkey.data.experience, "none");
  }
  const other = journeySchema.safeParse({ ...base, residence: "OTHER", residenceDetail: "Hollanda" });
  assert.equal(other.success, true);
  if (other.success) assert.equal(other.data.residenceDetail, "Hollanda");
  assert.equal(journeySchema.safeParse({ ...base, residence: "OTHER" }).success, false);
  assert.equal(journeySchema.safeParse({ ...base, email: "" }).success, false);
  assert.equal(journeySchema.safeParse({ ...base, email: "eksik" }).success, false);
});
