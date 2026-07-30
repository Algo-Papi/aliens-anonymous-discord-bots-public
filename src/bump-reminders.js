import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const BUMP_CREW_JOIN_CUSTOM_ID = "bump-crew:join";
export const BUMP_CREW_LEAVE_CUSTOM_ID = "bump-crew:leave";

const REMINDER_LINES = [
  "Aliens Anonymous has slipped below public radar. This is either a visibility problem or an extremely successful cover-up.",
  "Public detection levels are falling. The Bureau reluctantly requests one qualified human finger.",
  "Our DISBOARD signature is fading. Agent K has reviewed the machinery and remains legally prohibited from touching it.",
  "The server has drifted into the search-result basement. A manual transmission should correct the altitude.",
  "Recruitment radar is quiet. Either the witnesses need encouragement or the swamp gas has unionized.",
  "The public-facing beacon requires human intervention. Agent K tried glaring at it; the cooldown remained unimpressed.",
  "Another transmission window has opened. The Bureau promises the button is only moderately classified.",
  "Aliens Anonymous is ready for another pass across civilian radar. Try to look natural while pressing the obvious command.",
];

const ACKNOWLEDGEMENT_LINES = [
  "Signal reacquired. Aliens Anonymous is back on public radar.",
  "Transmission accepted. Civilian discovery probability has become somebody else's problem.",
  "Beacon restored. The server is visible again and the paperwork has stopped screaming.",
  "Public signature confirmed. New witnesses may now wander in without an appointment.",
  "DISBOARD contact re-established. Agent K credits the human operator and denies observing them.",
  "Recruitment signal boosted. The cover story remains implausible but operational.",
];

function scheduleMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function localClock(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute),
  };
}

function deterministicIndex(key, length) {
  let hash = 0;
  for (const character of String(key)) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return hash % length;
}

function displayTime(time) {
  const [rawHour, minute] = time.split(":").map(Number);
  const suffix = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function parseBumpReminderTimes(
  value,
  fallback = ["00:00", "08:00", "12:00", "16:00", "20:00"],
) {
  const selected = String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const times = selected.length > 0 ? selected : fallback;
  for (const time of times) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error(
        `Invalid bump reminder time "${time}". Use 24-hour HH:MM values.`,
      );
    }
  }
  return [...new Set(times)].sort(
    (left, right) => scheduleMinutes(left) - scheduleMinutes(right),
  );
}

export function dueBumpReminderSlot({
  now = new Date(),
  timeZone,
  times,
  graceMinutes = 10,
}) {
  const clock = localClock(now, timeZone);
  for (const time of times) {
    const scheduled = scheduleMinutes(time);
    if (
      clock.minuteOfDay >= scheduled &&
      clock.minuteOfDay < scheduled + graceMinutes
    ) {
      return {
        key: `${clock.dateKey}@${time}`,
        dateKey: clock.dateKey,
        time,
      };
    }
  }
  return null;
}

export function buildBumpReminderPayload({
  roleId,
  slotKey,
  times,
  timeZone,
}) {
  const line =
    REMINDER_LINES[deterministicIndex(slotKey, REMINDER_LINES.length)];
  const embed = new EmbedBuilder()
    .setColor(0x4cc9f0)
    .setTitle("📡 DISBOARD TRANSMISSION WINDOW OPEN")
    .setDescription(
      `${line}\n\nA human volunteer can run **\`/bump\`** in this channel now. Agent K will only remind people; it will never execute the command.`,
    )
    .addFields({
      name: "Scheduled radar checks",
      value: `${times.map(displayTime).join(" • ")}\n${timeZone}`,
    })
    .setFooter({
      text: "Manual and voluntary • no coins, perks, or automatic bumping",
    });

  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(BUMP_CREW_JOIN_CUSTOM_ID)
      .setLabel("Join Bump Crew")
      .setEmoji("📡")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(BUMP_CREW_LEAVE_CUSTOM_ID)
      .setLabel("Leave Bump Crew")
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    content: `<@&${roleId}>`,
    embeds: [embed],
    components: [controls],
    allowedMentions: { parse: [], roles: [roleId], users: [] },
  };
}

export function isSuccessfulDisboardBump(message, disboardUserId) {
  if (message.author?.id !== disboardUserId) {
    return false;
  }
  const text = [
    message.content,
    ...(message.embeds ?? []).flatMap((embed) => [
      embed.title,
      embed.description,
      ...(embed.fields ?? []).flatMap((field) => [
        field.name,
        field.value,
      ]),
    ]),
  ]
    .filter(Boolean)
    .join("\n");
  return /\b(?:bump done|server (?:was|has been) bumped|successfully bumped|bumped successfully)\b/iu.test(
    text,
  );
}

export function buildBumpAcknowledgement({
  messageId,
  bumpedAt,
  cooldownMs,
}) {
  const line =
    ACKNOWLEDGEMENT_LINES[
      deterministicIndex(messageId, ACKNOWLEDGEMENT_LINES.length)
    ];
  const nextWindow = Math.ceil((bumpedAt + cooldownMs) / 1_000);
  return `🛰️ **${line}** Next manual DISBOARD window opens <t:${nextWindow}:R>.`;
}
