import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgentResponseSelector,
  DIRECT_ADLIB_BANKS,
  DIRECT_ADLIB_TEMPLATES,
  DIRECT_RESPONSES,
  matchingTopics,
  ORB_REFERENCE_URL,
  selectAgentResponse,
  SHARED_TOPIC_ADLIB_BANKS,
  TOPIC_ADLIBS,
  TOPIC_ADLIB_TEMPLATES,
  TOPIC_RESPONSES,
} from "../src/responses.js";

test("ships the expected number of unique prepared responses", () => {
  assert.equal(DIRECT_RESPONSES.length, 12);
  assert.equal(new Set(DIRECT_RESPONSES).size, 12);
  assert.equal(Object.keys(TOPIC_RESPONSES).length, 31);

  for (const [topic, responses] of Object.entries(TOPIC_RESPONSES)) {
    const expectedLength = topic === "uapgerb" ? 11 : 9;
    assert.equal(responses.length, expectedLength, topic);
    assert.equal(new Set(responses).size, expectedLength, topic);
  }
});

test("every orb response is dramatic and links the example archive", () => {
  const orbLines = [
    ...TOPIC_RESPONSES.orb,
    ...TOPIC_ADLIBS.orb.details,
  ];

  for (const response of orbLines) {
    assert.match(response, /ORBS?/i);
    assert.ok(response.includes(ORB_REFERENCE_URL), response);
    assert.doesNotMatch(
      response,
      /autofocus|porch light|dust particle|cleaned the lens/i,
    );
  }
});

test("ad-lib banks are substantial, complete, and topic-specific", () => {
  assert.equal(DIRECT_ADLIB_TEMPLATES.length, 6);
  assert.equal(TOPIC_ADLIB_TEMPLATES.length, 6);
  for (const [key, bank] of Object.entries(DIRECT_ADLIB_BANKS)) {
    assert.ok(bank.length >= 10, key);
    assert.equal(new Set(bank).size, bank.length, key);
  }
  for (const [key, bank] of Object.entries(SHARED_TOPIC_ADLIB_BANKS)) {
    assert.ok(bank.length >= 10, key);
    assert.equal(new Set(bank).size, bank.length, key);
  }
  assert.deepEqual(
    Object.keys(TOPIC_ADLIBS),
    Object.keys(TOPIC_RESPONSES),
  );
  for (const [topic, bank] of Object.entries(TOPIC_ADLIBS)) {
    assert.equal(bank.details.length, 5, topic);
    assert.equal(new Set(bank.details).size, 5, topic);
  }
});

test("recognizes the requested topic phrases without partial-word matches", () => {
  assert.deepEqual(matchingTopics("This is classified UAP material about Lue Elizondo"), [
    "classified",
    "uap",
    "elizondo",
  ]);
  assert.deepEqual(matchingTopics("Elizondo mentioned two UAPs"), [
    "uap",
    "elizondo",
  ]);
  assert.deepEqual(matchingTopics("the value was reclassified"), []);
});

test("recognizes every expanded topic and common requested spelling", () => {
  const examples = new Map([
    ["UFOs", "ufo"],
    ["UAPGerb", "uapgerb"],
    ["Gerb", "uapgerb"],
    ["catastrophic disclosure", "disclosure"],
    ["non-human intelligence", "nhi"],
    ["whistle-blowers", "whistleblower"],
    ["crash-retrieval", "crash_retrieval"],
    ["reverse engineered", "reverse_engineering"],
    ["ontological shock", "ontological_shock"],
    ["inter-dimensional", "interdimensional"],
    ["non-human biologics", "biologics"],
    ["swamp gas", "swamp_gas"],
    ["weather balloons", "balloon"],
    ["Roswell", "roswell"],
    ["Area51", "area_51"],
    ["orbs", "orb"],
    ["tic-tac", "tic_tac"],
    ["Men in Black", "mib"],
    ["neuralizer", "neuralyzer"],
    ["psy-op", "psyop"],
    ["Nazca mummies", "nazca_mummies"],
    ["trust me, bro", "trust_me_bro"],
    ["MJ12", "majestic_12"],
    ["Chris Melon", "chris_mellon"],
    ["Jacques Vallée", "vallee"],
    ["Hal Puthof", "hal_puthoff"],
    ["Dr. Eric W. Davis", "eric_davis"],
    ["lizard people", "lizard_people"],
    ["probed", "probe"],
  ]);

  for (const [content, topic] of examples) {
    assert.deepEqual(matchingTopics(content), [topic], content);
  }
});

test("expanded patterns avoid obvious partial-word collisions", () => {
  for (const content of [
    "ballooning",
    "orbital",
    "problem",
    "Roswellian",
    "disclosuresque",
    "limbo",
    "Gerber",
    "gerbil",
  ]) {
    assert.deepEqual(matchingTopics(content), [], content);
  }
});

test("direct mentions and replies use the direct response pool", () => {
  const indexes = [0, 2];
  const result = selectAgentResponse(
    { content: "classified", isDirect: true },
    (max) => {
      const index = indexes.shift();
      assert.ok(index >= 0 && index < max);
      return index;
    },
  );

  assert.equal(result.kind, "direct");
  assert.equal(result.response, DIRECT_RESPONSES[2]);
  assert.match(result.response, /one person can reason/);
});

test("topic responses select independently from matching topics", () => {
  const indexes = [1, 0, 0];
  const result = selectAgentResponse(
    { content: "classified and UAP", isDirect: false },
    (max) => {
      const index = indexes.shift();
      assert.ok(index >= 0 && index < max);
      return index;
    },
  );

  assert.equal(result.kind, "uap");
  assert.equal(result.response, TOPIC_RESPONSES.uap[0]);
});

test("direct and passive ad-lib modes assemble coherent complete responses", () => {
  const directIndexes = [1, 0, 0, 0, 0, 0];
  const direct = selectAgentResponse(
    { content: "", isDirect: true },
    (max) => {
      const index = directIndexes.shift();
      assert.ok(index >= 0 && index < max);
      return index;
    },
  );
  assert.equal(direct.kind, "direct");
  assert.match(direct.response, /Agent K|Bureau|black phone/i);
  assert.ok(direct.response.endsWith("."));

  const topicIndexes = [0, 1, 0, 0, 0, 0, 0];
  const passive = selectAgentResponse(
    { content: "classified", isDirect: false },
    (max) => {
      const index = topicIndexes.shift();
      assert.ok(index >= 0 && index < max);
      return index;
    },
  );
  assert.equal(passive.kind, "classified");
  assert.match(passive.response, /CLASSIFIED/);
  assert.ok(passive.response.endsWith("."));
});

test("stateful selector avoids immediate prepared-response repeats", () => {
  const selector = createAgentResponseSelector(() => 0);
  const first = selector({ content: "", isDirect: true });
  const second = selector({ content: "", isDirect: true });
  assert.notEqual(first.response, second.response);
});

test("unrelated messages do not produce a response", () => {
  assert.equal(
    selectAgentResponse({ content: "ordinary conversation", isDirect: false }),
    null,
  );
});
