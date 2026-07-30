function roleIds(member) {
  if (member?.roles?.cache) {
    return new Set(member.roles.cache.keys());
  }
  if (Array.isArray(member?.roles)) {
    return new Set(member.roles);
  }
  return new Set();
}

function hasAnyRole(member, configuredRoleIds) {
  if (configuredRoleIds.size === 0) {
    return false;
  }
  const memberRoleIds = roleIds(member);
  return [...configuredRoleIds].some((roleId) =>
    memberRoleIds.has(roleId),
  );
}

function denied(code, message) {
  return { ok: false, code, message };
}

export function authorizeReport({
  invoker,
  target,
  botUserId,
  accessRoleIds,
  protectedRoleIds,
  invokerPrivacy,
  targetPrivacy,
  allowOptedOutInvokers = false,
}) {
  if (!invoker || !target) {
    return denied(
      "MEMBER_UNAVAILABLE",
      "Agent J could not verify both personnel files.",
    );
  }
  if (!hasAnyRole(invoker, accessRoleIds)) {
    return denied(
      "INVOKER_ROLE",
      "You do not have M.I.B. field clearance for this app.",
    );
  }
  if (
    !allowOptedOutInvokers &&
    (invokerPrivacy.targetOptOut || invokerPrivacy.witnessOptOut)
  ) {
    return denied(
      "RECIPROCITY",
      "Your Agent J privacy opt-out is active. Opt back in before scanning other members.",
    );
  }
  if (target.user?.bot || target.id === botUserId) {
    return denied(
      "BOT_TARGET",
      "Agent J does not scan bots. That is an Internal Affairs problem.",
    );
  }
  if (!hasAnyRole(target, accessRoleIds)) {
    return denied(
      "TARGET_ROLE",
      "That subject has not joined the Agent J participation program.",
    );
  }
  if (hasAnyRole(target, protectedRoleIds)) {
    return denied(
      "PROTECTED_TARGET",
      "That personnel file is protected above your clearance.",
    );
  }
  if (targetPrivacy.targetOptOut) {
    return denied(
      "TARGET_OPT_OUT",
      "That subject has opted out of Agent J targeting.",
    );
  }
  return { ok: true, selfTarget: invoker.id === target.id };
}

export function authorizeArenaChallenge(options) {
  const reportAuthorization = authorizeReport(options);
  if (!reportAuthorization.ok) {
    return reportAuthorization;
  }
  if (options.invoker.id === options.target.id) {
    return denied(
      "SELF_CHALLENGE",
      "You cannot challenge yourself. Even Agent J has paperwork limits.",
    );
  }
  return { ok: true };
}

export function isEligibleWitness({
  member,
  accessRoleIds,
  protectedRoleIds,
  privacy,
}) {
  return Boolean(
    member &&
      !member.user?.bot &&
      hasAnyRole(member, accessRoleIds) &&
      !hasAnyRole(member, protectedRoleIds) &&
      !privacy.witnessOptOut,
  );
}

export function memberHasAccess(member, accessRoleIds) {
  return hasAnyRole(member, accessRoleIds);
}

export function authorizeResearch({
  enabled,
  member,
  researchRoleIds,
  channelId,
  parentChannelId = null,
  researchChannelIds,
  apiConfigured,
}) {
  if (!enabled) {
    return denied(
      "RESEARCH_DISABLED",
      "M.I.B. Field Research is not active yet.",
    );
  }
  if (!hasAnyRole(member, researchRoleIds)) {
    return denied(
      "RESEARCH_ROLE",
      "This function requires the configured M.I.B Desk Analyst role. Contact a server administrator to request access.",
    );
  }
  if (
    researchChannelIds.size === 0 ||
    (!researchChannelIds.has(channelId) &&
      !researchChannelIds.has(parentChannelId))
  ) {
    return denied(
      "RESEARCH_CHANNEL",
      "M.I.B. Field Research is not authorized in this channel.",
    );
  }
  if (!apiConfigured) {
    return denied(
      "RESEARCH_API",
      "The Bureau research terminal is awaiting its OpenAI credential.",
    );
  }
  return { ok: true };
}
