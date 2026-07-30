import { EmbedBuilder, escapeMarkdown } from "discord.js";

import { citationMessageUrl } from "./ledger.js";

export function displayName(user, member = null) {
  return (
    member?.displayName ??
    user.displayName ??
    user.globalName ??
    user.username
  );
}

export function buildRecordEmbed(targetUser, targetMember, record) {
  const subjectName = escapeMarkdown(displayName(targetUser, targetMember));
  const embed = new EmbedBuilder()
    .setColor(0x7ddc63)
    .setTitle("📁 INTERGALACTIC CITATION RECORD")
    .setDescription(
      `**Subject:** ${subjectName}\n**Total citations:** ${record.total}`,
    );

  if (record.total === 0) {
    return embed.addFields({
      name: "Record Status",
      value: "Suspiciously clean. No theatrical citations are on file.",
    });
  }

  for (const citation of record.citations) {
    const timestamp = Math.floor(citation.createdAt / 1_000);
    const details = [`**Charge:** ${citation.charge}`];
    if (citation.finding) {
      details.push(`**Bureau Finding:** ${citation.finding}`);
    }
    details.push(
      `**Sentence:** ${citation.sentence}`,
      `<t:${timestamp}:f> • [Jump to cited message](${citationMessageUrl(citation)})`,
    );
    embed.addFields({
      name: `Case #${citation.id} • ${citation.offenseLabel}`,
      value: details.join("\n"),
    });
  }

  if (record.total > record.citations.length) {
    embed.setFooter({
      text: `Showing ${record.citations.length} most recent citations.`,
    });
  }

  return embed;
}
