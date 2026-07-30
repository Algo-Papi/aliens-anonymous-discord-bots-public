import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeArenaChallenge,
  authorizeReport,
  authorizeResearch,
  isEligibleWitness,
} from "../../src/security/authorization.js";

function member(id, roles = [], { bot = false } = {}) {
  const guild = { id: "guild" };
  return {
    id,
    guild,
    user: { id, bot },
    roles: { cache: new Map(roles.map((roleId) => [roleId, true])) },
  };
}

const accessRoleIds = new Set(["access"]);
const protectedRoleIds = new Set(["protected"]);
const participating = { targetOptOut: false, witnessOptOut: false };

function authorize(invoker, target, overrides = {}) {
  return authorizeReport({
    invoker,
    target,
    botUserId: "agent-j",
    accessRoleIds,
    protectedRoleIds,
    invokerPrivacy: participating,
    targetPrivacy: participating,
    ...overrides,
  });
}

test("report authorization enforces participation and protection", () => {
  assert.equal(
    authorize(member("a"), member("b", ["access"])).code,
    "INVOKER_ROLE",
  );
  assert.equal(
    authorize(member("a", ["access"]), member("b")).code,
    "TARGET_ROLE",
  );
  assert.equal(
    authorize(
      member("a", ["access"]),
      member("b", ["access", "protected"]),
    ).code,
    "PROTECTED_TARGET",
  );
  assert.equal(
    authorize(
      member("a", ["access"]),
      member("b", ["access"], { bot: true }),
    ).code,
    "BOT_TARGET",
  );
});

test("research access is independently role- and channel-gated", () => {
  const base = {
    enabled: true,
    member: member("a", ["desk"]),
    researchRoleIds: new Set(["desk"]),
    channelId: "case-board",
    researchChannelIds: new Set(["case-board"]),
    apiConfigured: true,
  };
  assert.deepEqual(authorizeResearch(base), { ok: true });
  assert.equal(
    authorizeResearch({
      ...base,
      member: member("a", ["access"]),
    }).code,
    "RESEARCH_ROLE",
  );
  assert.equal(
    authorizeResearch({ ...base, channelId: "general" }).code,
    "RESEARCH_CHANNEL",
  );
  assert.deepEqual(
    authorizeResearch({
      ...base,
      channelId: "case-thread",
      parentChannelId: "case-board",
    }),
    { ok: true },
  );
  assert.equal(
    authorizeResearch({ ...base, apiConfigured: false }).code,
    "RESEARCH_API",
  );
  assert.equal(
    authorizeResearch({ ...base, enabled: false }).code,
    "RESEARCH_DISABLED",
  );
});

test("self-targeting is allowed but self-challenging is denied", () => {
  const self = member("a", ["access"]);
  assert.deepEqual(authorize(self, self), {
    ok: true,
    selfTarget: true,
  });
  assert.equal(
    authorizeArenaChallenge({
      invoker: self,
      target: self,
      botUserId: "agent-j",
      accessRoleIds,
      protectedRoleIds,
      invokerPrivacy: participating,
      targetPrivacy: participating,
    }).code,
    "SELF_CHALLENGE",
  );
});

test("privacy opt-out is reciprocal by default", () => {
  const invoker = member("a", ["access"]);
  const target = member("b", ["access"]);
  assert.equal(
    authorize(invoker, target, {
      invokerPrivacy: { targetOptOut: true, witnessOptOut: false },
    }).code,
    "RECIPROCITY",
  );
  assert.equal(
    authorize(invoker, target, {
      targetPrivacy: { targetOptOut: true, witnessOptOut: false },
    }).code,
    "TARGET_OPT_OUT",
  );
});

test("witness eligibility enforces roles, protection, bots, and opt-out", () => {
  assert.equal(
    isEligibleWitness({
      member: member("a", ["access"]),
      accessRoleIds,
      protectedRoleIds,
      privacy: participating,
    }),
    true,
  );
  assert.equal(
    isEligibleWitness({
      member: member("a", ["access", "protected"]),
      accessRoleIds,
      protectedRoleIds,
      privacy: participating,
    }),
    false,
  );
  assert.equal(
    isEligibleWitness({
      member: member("a", ["access"]),
      accessRoleIds,
      protectedRoleIds,
      privacy: { targetOptOut: false, witnessOptOut: true },
    }),
    false,
  );
});
