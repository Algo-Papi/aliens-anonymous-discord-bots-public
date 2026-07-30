import assert from "node:assert/strict";
import test from "node:test";

import { ResearchInteractionController } from "../../src/commands/research-controller.js";
import {
  researchPreviewPayload,
  researchSetupPayload,
} from "../../src/commands/research-presentation.js";
import { ResearchSessions } from "../../src/research/sessions.js";

function resultFixture() {
  return {
    markdown: "## Finding\nA sourced finding.",
    context: {
      messageCount: 3,
      omittedForPrivacy: 0,
    },
    sources: [{ url: "https://example.com" }],
  };
}

test("research sessions default to Standard Research and can retain Deep Research", () => {
  const sessions = new ResearchSessions();
  const standard = sessions.create({ userId: "user" });
  const deep = sessions.create({ userId: "user", tier: "deep" });

  assert.equal(standard.tier, "standard");
  assert.equal(deep.tier, "deep");
});

test("research setup keeps tier separate from mode and context scope", () => {
  const payload = researchSetupPayload({
    id: "session",
    mode: "ground",
    scope: "standard",
    tier: "standard",
  });
  const components = payload.components.map((row) => row.toJSON());
  const tierMenu = components
    .flatMap((row) => row.components)
    .find((component) => component.custom_id === "research:tier:session");

  assert.match(payload.content, /Mode: \*\*Ground this discussion\*\*/);
  assert.match(payload.content, /Context: \*\*Standard\*\*/);
  assert.match(
    payload.content,
    /Research level: \*\*Standard Research — Luna\*\*/,
  );
  assert.deepEqual(
    tierMenu.options.map(({ label, value, default: isDefault }) => ({
      label,
      value,
      isDefault: Boolean(isDefault),
    })),
    [
      {
        label: "Standard Research — Luna",
        value: "standard",
        isDefault: true,
      },
      {
        label: "Deep Research — Terra",
        value: "deep",
        isDefault: false,
      },
    ],
  );
});

test("private and public research presentations identify the selected tier", () => {
  const payload = researchPreviewPayload({
    id: "session",
    mode: "fact_check",
    scope: "focused",
    tier: "deep",
    result: resultFixture(),
  });
  const footer = payload.embeds.at(-1).toJSON().footer.text;

  assert.match(footer, /Deep Research — Terra/);
});

test("research controller changes tier without changing mode or context", async () => {
  const sessions = new ResearchSessions();
  const session = sessions.create({
    userId: "user",
    guildId: "guild",
    channelId: "channel",
    mode: "ground",
    scope: "standard",
  });
  let updatedPayload;
  const controller = new ResearchInteractionController({
    client: {},
    config: {
      research: {
        enabled: true,
        roleIds: new Set(["desk"]),
        channelIds: new Set(["channel"]),
      },
    },
    sessions,
    limits: {},
    service: {},
    apiConfigured: true,
    logger: {
      info: () => {},
      error: () => {},
    },
  });
  const interaction = {
    customId: `research:tier:${session.id}`,
    user: { id: "user" },
    guildId: "guild",
    guild: {
      members: {
        fetch: async () => ({
          roles: { cache: new Map([["desk", {}]]) },
        }),
      },
    },
    values: ["deep"],
    update: async (payload) => {
      updatedPayload = payload;
    },
  };

  await controller.handleSelect(interaction);

  assert.equal(session.tier, "deep");
  assert.equal(session.mode, "ground");
  assert.equal(session.scope, "standard");
  assert.match(updatedPayload.content, /Deep Research — Terra/);
});

test("research controller passes the selected tier to the service", async () => {
  const sessions = new ResearchSessions();
  const session = sessions.create({
    userId: "user",
    guildId: "guild",
    channelId: "channel",
    parentChannelId: null,
    anchorMessageId: "anchor",
    tier: "deep",
  });
  let serviceInput;
  let editedPayload;
  const controller = new ResearchInteractionController({
    client: {
      channels: {
        cache: new Map([
          [
            "channel",
            {
              messages: {
                fetch: async () => ({ id: "anchor" }),
              },
            },
          ],
        ]),
      },
    },
    config: {
      research: {
        enabled: true,
        roleIds: new Set(["desk"]),
        channelIds: new Set(["channel"]),
      },
    },
    sessions,
    limits: {
      reserve: () => ({ ok: true, token: "reservation" }),
      complete: () => {},
      release: () => {},
    },
    service: {
      run: async (input) => {
        serviceInput = input;
        return resultFixture();
      },
    },
    apiConfigured: true,
    logger: {
      info: () => {},
      error: () => {},
    },
  });
  const interaction = {
    customId: `research:submit:${session.id}`,
    user: { id: "user" },
    guildId: "guild",
    guild: {
      members: {
        fetch: async () => ({
          roles: { cache: new Map([["desk", {}]]) },
        }),
      },
    },
    fields: {
      getTextInputValue: () => "",
    },
    deferReply: async () => {},
    editReply: async (payload) => {
      editedPayload = payload;
    },
  };

  await controller.handleModal(interaction);

  assert.equal(serviceInput.tier, "deep");
  assert.match(
    editedPayload.embeds.at(-1).toJSON().footer.text,
    /Deep Research — Terra/,
  );
});
