import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import { displayTactic } from "../arena/rules.js";
import { getItem, itemsByKind } from "../economy/catalog.js";

const MENTIONS_SUPPRESSED = Object.freeze({ parse: [], users: [] });

const NARRATION = Object.freeze({
  "noisy-cricket-debt-collector":
    "Agent J calls that the Noisy Cricket debt-collection package. The interest was physical.",
  "plasma-dry-cleaning-bill":
    "That suit is going straight to intergalactic dry cleaning, and the loser is paying.",
  "deatomizer-customer-service":
    "Customer service confirms the blast was intentional. The warranty still hates you.",
  "blast-radius-paperwork":
    "The blast radius crossed three jurisdictions and one very nervous insurance adjuster.",
  "warning-shot-performance-review":
    "That wasn't a warning shot. That was your performance review.",
  "clean-suit-dirty-blast":
    "Agent J kept the suit clean and made the blast somebody else's problem.",
  "neuralyze-the-scoreboard":
    "Neuralyze the witnesses if you want. The scoreboard remembers.",
  "make-this-look-good":
    "Agent J makes this look good. The other fighter makes losing look mandatory.",
  "plasma-hr-complaint":
    "The plasma strike was so inappropriate Human Resources neuralyzed itself before opening the complaint.",
  "noisy-cricket-prenup":
    "That Noisy Cricket hit hard enough to activate three prenups and a regional tsunami warning.",
  "blast-tax-deduction":
    "The blast removed the target, the back wall, and several deductions from next year's return.",
  "deatomizer-group-rate":
    "The deatomizer offered a group rate. The loser supplied the group and all identifiable atoms.",
  "plasma-eviction-notice":
    "That plasma bolt served an eviction notice to every molecule currently claiming residence.",
  "shield-refund-denied":
    "The shield held. The attacker's dignity requested a refund and was denied.",
  "bureaucratic-forcefield":
    "A wall of federal paperwork absorbed the hit. Nothing penetrates Form 51-B.",
  "defensive-audit":
    "Agent J audited that attack and found insufficient violence to proceed.",
  "containment-copay":
    "The shield covered the emergency. The containment copay will outlive both players.",
  "heat-on-hold":
    "You brought all that heat and still got put on hold.",
  "block-and-adjust-tie":
    "Blocked with one hand. Adjusted the tie with the other.",
  "bureau-charged-admission":
    "That defense was so clean the Bureau tried to charge admission.",
  "public-embarrassment-unblocked":
    "The shield caught everything except the loser's public embarrassment.",
  "shielded-child-support":
    "The shield rejected the attack with the same efficiency the loser uses on child-support notices.",
  "forcefield-dress-code":
    "The forcefield permits energy, radiation, and no outfit that cheap.",
  "defensive-cavity-search":
    "That defense stopped the attack so completely the Bureau is checking it for contraband.",
  "shield-warranty-hearing":
    "The shield held through impact, litigation, and a warranty hearing conducted under fire.",
  "block-party-for-one":
    "Agent J threw a block party. Attendance was one fighter and the attack that never got inside.",
  "pocket-sand-classified":
    "Dirty Trick deployed. The pocket sand is classified; the coughing is public.",
  "illegal-worm-guy-assist":
    "Three Worm Guys interfered, denied everything, and billed overtime.",
  "evidence-locker-switcheroo":
    "Somebody switched the evidence labels. Legally, the loser may now be a toaster.",
  "intergalactic-cheap-shot":
    "That cheap shot violated six treaties and improved the match considerably.",
  "field-improvisation":
    "That ain't cheating. That's field improvisation with excellent tailoring.",
  "evidence-bad-suit-good":
    "The evidence looks terrible. Agent J looks fantastic. Case closed.",
  "dirty-trick-clean-suit":
    "Dirty trick, clean suit. Bureau priorities remain intact.",
  "advanced-diplomacy":
    "Agent J calls that advanced diplomacy: somebody else hits the floor.",
  "neuralyzer-battery-swap":
    "The batteries were switched mid-fight. The loser now remembers consenting to this.",
  "worm-guy-custody-transfer":
    "A Worm Guy changed sides, custody, and species before the referee found the paperwork.",
  "forbidden-pocket-gravy":
    "Pocket gravy deployed. Nobody knows why it worked, and the Hague has asked us not to investigate.",
  "evidence-bag-banana-peel":
    "An evidence bag, a banana peel, and one falsified gravity report just decided the round.",
  "illegal-third-elbow":
    "The third elbow was not on the equipment list. It was, however, devastatingly persuasive.",
});

const BROADCAST_LINES = Object.freeze({
  broadcast_bureau_hr: Object.freeze([
    "Human Resources found both career paths increasingly theoretical.",
    "The Bureau reminds combatants that humiliation is not covered by dental.",
    "This incident entered both personnel files in a needlessly permanent font.",
    "HR calls the winning tactic actionable and the losing tactic a separation event.",
    "Management appreciates the initiative and disputes the property damage.",
  ]),
  broadcast_conspiracy_radio: Object.freeze([
    "That roll came through the numbers station beneath Wright-Patterson.",
    "The frequencies predicted this, but Big Dice does not want you asking why.",
    "Three pixels were enhanced and the tactical truth became substantially worse.",
    "Official sources call it random; our parking-lot informant says controlled disclosure.",
    "Stay awake, listeners—the next roll may be manufactured weather.",
  ]),
  broadcast_worm_guys: Object.freeze([
    "“Beautiful execution.” “Absolutely. Terrible paperwork.”",
    "“Was that authorized?” “Not by anybody still employed here.”",
    "“Strong round.” “Strong coffee, too. Neither is legally ours.”",
    "“I had the winner.” “You bet on both fighters.” “Federal strategy.”",
    "“That looked expensive.” “Put it on Zed's tab.”",
  ]),
  broadcast_uapgerb: Object.freeze([
    "Gerb enhanced the replay until the tactic became a legally distinct weather balloon.",
    "Remote analysis found observables, pixels, and one deeply avoidable decision.",
    "Gerb isolated the winning maneuver between compression artifacts four and five.",
    "The footage is inconclusive; the loser's competence has been confidently ruled out.",
    "A red circle and six arrows confirm that something tactical occurred.",
  ]),
});

function stableIndex(seed, length) {
  let hash = 0;
  for (const character of String(seed)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return length ? hash % length : 0;
}

function broadcastLine(match, round) {
  const lines = BROADCAST_LINES[match.broadcast_pack_id];
  return lines?.[stableIndex(`${match.id}:${round.round_number}`, lines.length)];
}

function unix(isoTimestamp) {
  return Math.floor(new Date(isoTimestamp).getTime() / 1_000);
}

export function reportEmbed(report) {
  return new EmbedBuilder()
    .setColor(report.color)
    .setTitle(report.title)
    .setDescription(report.description)
    .addFields(report.fields)
    .setFooter({ text: report.footer });
}

export function privacyPayload(privacy) {
  const targetState = privacy.targetOptOut ? "Opted out" : "Participating";
  const witnessState = privacy.witnessOptOut
    ? "Opted out"
    : "Participating";
  const aiContextState = privacy.aiContextOptOut
    ? "Opted out"
    : "Participating";
  return {
    content:
      "**Agent J Privacy File**\n" +
      `Targeting: **${targetState}**\n` +
      `Recent-active witness: **${witnessState}**\n` +
      `AI research context: **${aiContextState}**\n\n` +
      "Targeting and witness opt-outs pause your ability to target other members. The AI-context setting independently controls whether your public messages may be included in Desk Analyst research.",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("privacy:target:toggle")
          .setLabel(
            privacy.targetOptOut
              ? "Opt in to targeting"
              : "Opt out of targeting",
          )
          .setStyle(
            privacy.targetOptOut ? ButtonStyle.Success : ButtonStyle.Secondary,
          ),
        new ButtonBuilder()
          .setCustomId("privacy:witness:toggle")
          .setLabel(
            privacy.witnessOptOut
              ? "Opt in as witness"
              : "Opt out as witness",
          )
          .setStyle(
            privacy.witnessOptOut
              ? ButtonStyle.Success
              : ButtonStyle.Secondary,
          ),
        new ButtonBuilder()
          .setCustomId("privacy:all:optin")
          .setLabel("Opt in to both")
          .setStyle(ButtonStyle.Primary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("privacy:ai:toggle")
          .setLabel(
            privacy.aiContextOptOut
              ? "Allow AI context"
              : "Exclude me from AI context",
          )
          .setStyle(
            privacy.aiContextOptOut
              ? ButtonStyle.Success
              : ButtonStyle.Secondary,
          ),
      ),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function arenaRulesPayload() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x00a8e8)
        .setTitle("THE BLACKSITE ARENA — FIELD RULES")
        .setDescription(
          "Right-click a participating member and choose **Apps → Challenge in Blacksite Arena**.\n\n" +
            "**Blast** beats **Dirty Trick**\n" +
            "**Dirty Trick** beats **Shield**\n" +
            "**Shield** beats **Blast**\n\n" +
            "Each round both players secretly lock one tactic. Agent J rolls a public d100; winning the tactic matchup adds **+15**. First to two rounds wins.\n\n" +
            "Challenges expire after 60 seconds. Standard fights include a private 20-second equipment phase and 35 seconds per round. Ranked wins award **12 BC**, losses award **4 BC**, and the first completed fight each UTC day adds **5 BC**. Only the first two completed fights against the same opponent in 24 hours earn progression.\n\n" +
            "**Full Blacksite** challenges publicly disclose an Artifact before acceptance. They have separate records and do not affect ordinary credits, reputation, or streaks.",
        )
        .setFooter({
          text: "Agent J guarantees clean math, sharp suits, and absolutely no sympathy.",
        }),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

function pendingComponents(matchId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`arena:accept:${matchId}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`arena:decline:${matchId}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`arena:shop:${matchId}`)
        .setLabel("Browse Shop")
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function activeComponents(matchId, roundNumber) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`arena:open:${matchId}:${roundNumber}`)
        .setLabel("Choose Tactic")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function equipmentComponents(matchId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`arena:equipment:${matchId}`)
        .setLabel("Choose Equipment")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

export function tacticSelectionPayload(match) {
  return {
    content:
      `**Round ${match.current_round}: select your tactic.**\n` +
      "Your choice stays hidden until both players lock in. Pick fast—your opponent is already confusing luck with talent.",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `arena:tactic:${match.id}:${match.current_round}:blast`,
          )
          .setLabel("Blast")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(
            `arena:tactic:${match.id}:${match.current_round}:shield`,
          )
          .setLabel("Shield")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(
            `arena:tactic:${match.id}:${match.current_round}:dirty_trick`,
          )
          .setLabel("Dirty Trick")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function equipmentSelectionPayload(match, inventory) {
  const options = [
    { id: "none", name: "No Gadget", quantity: null },
    ...inventory.map((row) => ({
      id: row.gadget_id,
      name: getItem(row.gadget_id)?.name ?? row.gadget_id,
      quantity: row.quantity,
    })),
  ];
  const rows = [];
  for (let index = 0; index < options.length; index += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        ...options.slice(index, index + 5).map((option) =>
          new ButtonBuilder()
            .setCustomId(`arena:gadget:${match.id}:${option.id}`)
            .setLabel(
              option.quantity == null
                ? option.name
                : `${option.name} ×${option.quantity}`,
            )
            .setStyle(
              option.id === "none"
                ? ButtonStyle.Secondary
                : ButtonStyle.Primary,
            ),
        ),
      ),
    );
  }
  return {
    content:
      "**Select zero or one gadget.** It is reserved immediately, stays hidden until the fight begins, and is returned if the match is cancelled.",
    components: rows.slice(0, 5),
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

function formatRoll(initial, final, bonus, gadgetModifier, total) {
  const roll =
    initial === final ? `d100 **${initial}**` : `d100 **${initial} → ${final}**`;
  const gadget =
    gadgetModifier === 0
      ? ""
      : ` + equipment **${gadgetModifier > 0 ? "+" : ""}${gadgetModifier}**`;
  return `${roll} + tactic **${bonus}**${gadget} = **${total}**`;
}

function roundField(round, match) {
  const winner =
    round.winner_id === match.challenger_id
      ? `<@${match.challenger_id}>`
      : `<@${match.opponent_id}>`;
  const challengerLine =
    `<@${match.challenger_id}> — **${displayTactic(round.challenger_tactic)}**\n` +
    formatRoll(
      round.challenger_initial_roll,
      round.challenger_final_raw_roll,
      round.challenger_tactic_bonus,
      round.challenger_gadget_modifier,
      round.challenger_total,
    );
  const opponentLine =
    `<@${match.opponent_id}> — **${displayTactic(round.opponent_tactic)}**\n` +
    formatRoll(
      round.opponent_initial_roll,
      round.opponent_final_raw_roll,
      round.opponent_tactic_bonus,
      round.opponent_gadget_modifier,
      round.opponent_total,
    );
  const equipment = [
    round.challenger_gadget_effect
      ? `<@${match.challenger_id}> equipment: ${round.challenger_gadget_effect}`
      : null,
    round.opponent_gadget_effect
      ? `<@${match.opponent_id}> equipment: ${round.opponent_gadget_effect}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const commentary = broadcastLine(match, round);
  return {
    name: `Round ${round.round_number} — ${winner} wins`,
    value:
      `${challengerLine}\n${opponentLine}` +
      (equipment ? `\n${equipment}` : "") +
      "\n\n" +
      (NARRATION[round.narration_id] ??
        "Agent J has sealed the narration pending a corruption inquiry.") +
      (commentary ? `\n*${commentary}*` : ""),
    inline: false,
  };
}

export function arenaMessagePayload(match, rounds = [], lockedCount = 0) {
  const theme = getItem(match.case_theme_id);
  const artifact = getItem(match.artifact_id);
  const modeLine =
    match.match_mode === "blacksite"
      ? `**FULL BLACKSITE — ${artifact?.name ?? "UNKNOWN ARTIFACT"}**\nNo ordinary progression`
      : match.ranked
        ? "**Ranked — credits and reputation enabled**"
        : "**Exhibition — pair progression limit reached**";
  const embed = new EmbedBuilder()
    .setColor(
      theme?.color ?? (match.status === "complete" ? 0x20c997 : 0x00a8e8),
    )
    .setTitle(theme?.heading ?? "THE BLACKSITE ARENA")
    .setDescription(
      `<@${match.challenger_id}> **vs.** <@${match.opponent_id}>\n` +
        `Score: **${match.challenger_round_wins}–${match.opponent_round_wins}**\n` +
        modeLine,
    );
  if (theme?.footer) {
    embed.setFooter({ text: theme.footer });
  }

  if (match.status === "pending") {
    embed.addFields({
      name: "Challenge pending",
      value:
        `<@${match.opponent_id}> has until <t:${unix(match.expires_at)}:R> to accept.\n` +
        (match.match_mode === "blacksite"
          ? `**Artifact effect:** ${artifact?.description ?? "CLASSIFIED"}\n` +
            "Declining carries no penalty. Acceptance activates the disclosed hardware."
          : "Agent J sold the broadcast rights and kept the good camera angle."),
    });
    return {
      embeds: [embed],
      components: pendingComponents(match.id),
      allowedMentions: MENTIONS_SUPPRESSED,
    };
  }

  if (
    match.match_mode === "standard" &&
    match.ranked &&
    match.status !== "equipment_select"
  ) {
    embed.addFields({
      name: "Filed equipment",
      value:
        `<@${match.challenger_id}> — **${getItem(match.challenger_gadget_id)?.name ?? "No Gadget"}**\n` +
        `<@${match.opponent_id}> — **${getItem(match.opponent_gadget_id)?.name ?? "No Gadget"}**`,
    });
  }

  for (const round of rounds) {
    embed.addFields(roundField(round, match));
  }

  if (match.status === "equipment_select") {
    const locked =
      Number(match.challenger_equipment_locked) +
      Number(match.opponent_equipment_locked);
    embed.addFields({
      name: "Equipment requisition",
      value:
        `Loadouts locked: **${locked}/2**\n` +
        `Deadline: <t:${unix(match.expires_at)}:R>`,
    });
    return {
      embeds: [embed],
      components: equipmentComponents(match.id),
      allowedMentions: MENTIONS_SUPPRESSED,
    };
  }

  if (match.status === "round_select") {
    embed.addFields({
      name: `Round ${match.current_round} lock-in`,
      value:
        `Tactics locked: **${lockedCount}/2**\n` +
        `Deadline: <t:${unix(match.expires_at)}:R>`,
    });
    return {
      embeds: [embed],
      components: [],
      allowedMentions: MENTIONS_SUPPRESSED,
    };
  }

  const terminalText = {
    complete:
      `**Winner:** <@${match.winner_id}>\n` +
      (match.match_mode === "blacksite"
        ? "Full Blacksite result recorded. No ordinary credits, reputation, or streak changes."
        : match.ranked
          ? `<@${match.challenger_id}> received **${match.challenger_reward} BC**; ` +
            `<@${match.opponent_id}> received **${match.opponent_reward} BC**.`
          : "Exhibition complete. The pair progression limit prevented rewards.") +
      (getItem(match.victory_stamp_id)?.text
        ? `\n\n**[ ${getItem(match.victory_stamp_id).text} ]**`
        : ""),
    declined:
      `<@${match.opponent_id}> declined. Strategic retreat? Man, that was a sprint with paperwork.`,
    expired:
      "The challenge expired. Both fighters spent sixty seconds acting dangerous and zero seconds proving it.",
    abandoned: match.abandoned_by_user_id
      ? `<@${match.abandoned_by_user_id}> missed the tactic deadline. Agent J filed that under “scared with extra steps.”`
      : "Both fighters missed the tactic deadline. Agent J is keeping the deposit and deleting the footage.",
    technical_cancel:
      "Containment failure. Everybody keep your excuses; Agent J already has better ones.",
  }[match.status];
  embed.addFields({
    name: "Final status",
    value: terminalText ?? `Status: ${match.status}`,
  });
  return {
    embeds: [embed],
    components: [],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function arenaRoundResultPayload(match, round, lockedCount = 0) {
  const theme = getItem(match.case_theme_id);
  const embed = new EmbedBuilder()
    .setColor(theme?.color ?? 0x00a8e8)
    .setTitle(`ROUND ${round.round_number} RESOLUTION`)
    .addFields(roundField(round, match));
  if (match.status === "round_select") {
    embed.addFields({
      name: `Round ${match.current_round} — choose your next move`,
      value:
        `Tactics locked: **${lockedCount}/2**\n` +
        `Deadline: <t:${unix(match.expires_at)}:R>`,
    });
    embed.setFooter({
      text: `Score ${match.challenger_round_wins}-${match.opponent_round_wins} // Latest active control`,
    });
  } else {
    const stamp = getItem(match.victory_stamp_id)?.text;
    embed.addFields({
      name: "Final result",
      value:
        `**Winner:** <@${match.winner_id}>\n` +
        (match.match_mode === "blacksite"
          ? "Full Blacksite result recorded. No ordinary progression."
          : match.ranked
            ? `<@${match.challenger_id}> received **${match.challenger_reward} BC**; ` +
              `<@${match.opponent_id}> received **${match.opponent_reward} BC**.`
            : "Exhibition complete. No progression awarded.") +
        (stamp ? `\n\n**[ ${stamp} ]**` : ""),
    });
    embed.setFooter({ text: "Final Arena result filed." });
  }
  return {
    embeds: [embed],
    components:
      match.status === "round_select"
        ? activeComponents(match.id, match.current_round)
        : [],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function arenaTurnPromptPayload(match, lockedCount = 0) {
  const theme = getItem(match.case_theme_id);
  const artifact = getItem(match.artifact_id);
  const mode =
    match.match_mode === "blacksite"
      ? `Full Blacksite — ${artifact?.name ?? "Artifact authorized"}`
      : match.ranked
        ? "Ranked fight"
        : "Exhibition";
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(theme?.color ?? 0x00a8e8)
        .setTitle(`ROUND ${match.current_round} — AWAITING TACTICS`)
        .setDescription(
          `<@${match.challenger_id}> **vs.** <@${match.opponent_id}>\n` +
            `Score: **${match.challenger_round_wins}–${match.opponent_round_wins}**\n` +
            `${mode}\n\n` +
            `Tactics locked: **${lockedCount}/2**\n` +
            `Deadline: <t:${unix(match.expires_at)}:R>`,
        )
        .setFooter({ text: "This is the latest active Arena control." }),
    ],
    components: activeComponents(match.id, match.current_round),
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

function buttonRows(items, prefix, style = ButtonStyle.Primary) {
  const rows = [];
  for (let index = 0; index < items.length; index += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        ...items.slice(index, index + 5).map((entry) =>
          new ButtonBuilder()
            .setCustomId(`${prefix}:${entry.id}`)
            .setLabel(entry.buttonLabel ?? entry.name)
            .setStyle(style),
        ),
      ),
    );
  }
  return rows.slice(0, 5);
}

export function shopPayload(category, balance) {
  const items = itemsByKind(category);
  const title = {
    gadget: "ARENA REQUISITIONS — GADGETS",
    theme: "ARENA REQUISITIONS — CASE THEMES",
    stamp: "ARENA REQUISITIONS — VICTORY STAMPS",
    broadcast: "ARENA REQUISITIONS — BROADCAST PACKS",
    artifact: "THE BLACK VAULT — ARTIFACTS",
  }[category];
  const listed = items.map((entry) => ({
    ...entry,
    buttonLabel: `${entry.name} · ${entry.price} BC`,
  }));
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(category === "artifact" ? 0x7e57c2 : 0x00a8e8)
        .setTitle(title ?? "ARENA REQUISITIONS")
        .setDescription(
          `Current balance: **${balance} BC**\n\n` +
            items
              .map(
                (entry) =>
                  `**${entry.name} — ${entry.price} BC**\n${entry.description}` +
                  (entry.activationPrice
                    ? `\nActivation: **${entry.activationPrice} BC**, once per seven days.`
                    : ""),
              )
              .join("\n\n"),
        ),
    ],
    components: buttonRows(listed, "shop:buy"),
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function inventoryPayload(user, inventory, ownedItems) {
  const gadgetText = inventory.length
    ? inventory
        .map((row) => `**${row.item.name}** ×${row.quantity}`)
        .join("\n")
    : "No gadgets requisitioned.";
  const permanentText = ownedItems.length
    ? ownedItems.map((row) => `**${row.item.name}**`).join("\n")
    : "No permanent unlocks.";
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x00a8e8)
        .setTitle("AGENT J — EVIDENCE LOCKER")
        .setDescription(`Balance: **${user.credits} BC**`)
        .addFields(
          { name: "Consumable gadgets", value: gadgetText },
          { name: "Permanent files", value: permanentText },
        ),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function profilePayload(user, memberId, cosmetics) {
  const theme = getItem(cosmetics.theme);
  const stamp = getItem(cosmetics.stamp);
  const broadcast = getItem(cosmetics.broadcast);
  const total = user.wins + user.losses;
  const winRate = total ? Math.round((user.wins / total) * 100) : 0;
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(theme?.color ?? 0x00a8e8)
        .setTitle(theme?.heading ?? "AGENT J — ARENA CASE FILE")
        .setDescription(`<@${memberId}>\nBalance: **${user.credits} BC**`)
        .addFields(
          {
            name: "Standard record",
            value:
              `**${user.wins}–${user.losses}** (${winRate}% wins)\n` +
              `Reputation: **${user.reputation}**\n` +
              `Current streak: **${user.current_streak}** · Best: **${user.best_streak}**`,
          },
          {
            name: "Full Blacksite record",
            value: `**${user.artifact_wins}–${user.artifact_losses}**`,
          },
          {
            name: "Equipped presentation",
            value:
              `Theme: **${theme?.name ?? "Standard Bureau"}**\n` +
              `Stamp: **${stamp?.name ?? "None"}**\n` +
              `Broadcast: **${broadcast?.name ?? "Deadpan Agent J"}**`,
          },
        )
        .setFooter({
          text:
            theme?.footer ??
            "The Bureau disputes the accuracy of every flattering statistic.",
        }),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function cosmeticsPayload(ownedItems, cosmetics) {
  const cosmeticItems = ownedItems
    .map((row) => row.item)
    .filter((entry) =>
      ["theme", "stamp", "broadcast"].includes(entry.kind),
    )
    .map((entry) => ({
      ...entry,
      buttonLabel:
        (cosmetics[entry.kind] === entry.id ? "✓ " : "") + entry.name,
    }));
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x00a8e8)
        .setTitle("ARENA PRESENTATION FILE")
        .setDescription(
          cosmeticItems.length
            ? "Choose an owned presentation item to equip it."
            : "You do not own any Arena presentation items yet. Browse `/arena shop`.",
        ),
    ],
    components: buttonRows(cosmeticItems, "cosmetic:equip"),
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export { MENTIONS_SUPPRESSED };
