import {
  ROUTINE_EXCLUSIONS,
  SIGNIFICANCE_LEVELS,
} from "./eligibility.js";
import { getIntelSource } from "./source-registry.js";

const US_REFERENCE_PATTERN =
  /\b(?:united states|america(?:n)?|white house|pentagon|congress|senate|house of representatives|supreme court|federal|homeland security|fbi|cia|faa|nasa|noaa|cdc|cisa|fema|california|texas|florida|new york|washington(?:,\s*d\.?c\.?| dc)|los angeles|chicago|houston|philadelphia|phoenix|san antonio|san diego|dallas|austin|atlanta|boston|miami|seattle|denver|las vegas|hawaii|alaska|puerto rico|guam)\b/iu;

const US_ABBREVIATION_PATTERN = /\b(?:U\.S\.A?\.?|US|USA)\b/u;

const US_MILITARY_PATTERN =
  /\b(?:u\.?s\.?\s+(?:military|forces|troops|navy|army|air force|marines|coast guard)|american\s+(?:military|forces|troops|service members?))\b/iu;

const IMPACT_PATTERN =
  /\b(?:emergenc(?:y|ies)|evacuat(?:e|ed|ion)|shutdown|closed|closure|ground stop|outage|disrupt(?:ed|ion)|attack(?:ed)?|strike(?:s|n)?|explosion|blast|collapse|crash(?:ed)?|derail(?:ed|ment)|shooting|mass casualty|killed|dead|fatalit(?:y|ies)|wounded|hospitali[sz]ed|landfall|warning|declares?|orders?|signs?|passes?|rules?|overturns?|strikes down|resigns?|impeach(?:ed|ment)?|indict(?:ed|ment)?|sanctions?|invasion|ceasefire|mobilization|launch(?:ed)?|breach(?:ed)?|hack(?:ed)?|cyberattack|recall)\b/iu;

const CRITICAL_PATTERN =
  /\b(?:nuclear (?:detonation|explosion|attack|exchange)|radiological release|chemical weapons? attack|biological weapons? attack|intercontinental ballistic missile|icbm launch|president (?:is )?assassinated|pandemic emergency|public health emergency of international concern|global internet outage|worldwide communications outage)\b/iu;

const MAJOR_GLOBAL_PATTERN =
  /\b(?:declares? war|invades?|invasion of|war expands?|nuclear (?:weapon|threat|alert)|tsunami warning|major earthquake|magnitude [78](?:\.\d)?|category [45] (?:hurricane|cyclone|typhoon)|pandemic|novel pathogen|global market crash|strait of hormuz (?:closed|closure|blocked)|suez canal (?:closed|closure|blocked)|massive cyberattack|widespread power outage|nationwide blackout|hundreds (?:are )?(?:dead|killed)|thousands (?:are )?(?:injured|displaced))\b/iu;

const MAJOR_US_PATTERN =
  /\b(?:mass shooting|terror(?:ist|ism) attack|assassination attempt|government shutdown|national emergency|nationwide (?:ban|outage|recall|ground stop)|supreme court (?:rules|overturns|strikes down)|congress (?:passes|approves)|president (?:signs|orders|declares|resigns)|major earthquake|tsunami warning|hurricane (?:warning|landfall)|category [345] hurricane|tornado emergency|particularly dangerous situation|nuclear power plant warning|radiological hazard warning|shelter in place|widespread cyberattack|critical infrastructure attack|major airport closure|all flights grounded)\b/iu;

const GOVERNMENT_ACTION_PATTERN =
  /\b(?:supreme court (?:rules|overturns|strikes down)|congress (?:passes|approves)|senate (?:passes|approves|convicts|acquits)|house (?:passes|approves|impeaches)|president (?:signs|orders|declares|vetoes|resigns)|federal government (?:shuts down|reopens)|national emergency|nationwide (?:ban|order|mandate)|u\.?s\.? (?:launches|orders|declares|sanctions|deploys))\b/iu;

const HIGH_CONSEQUENCE_POLICY_PATTERN =
  /\b(?:war|military|emergency|shutdown|constitutional|nationwide|tariff|sanction|immigration|abortion|election result|critical infrastructure|banking|currency|debt default|martial law)\b/iu;

const SPACE_UAP_PATTERN =
  /\b(?:uap|uaps|ufo|ufos|non[- ]human intelligence|extraterrestrial|alien life|first contact|technosignature|biosignature)\b/iu;

const EXCEPTIONAL_DISCLOSURE_PATTERN =
  /\b(?:confirms?|verified|official(?:ly)?|declassif(?:y|ied)|announces?|discovers?|evidence of|first detection|first contact)\b/iu;

const COMMENTARY_PATTERN =
  /\b(?:opinion|op-ed|analysis|commentary|podcast|interview|column|editorial|what we know|explainer|thread:|my take|i think|speculation)\b/iu;

const ROUTINE_POLITICS_PATTERN =
  /\b(?:poll(?:ing)?|campaign(?:ing)?|rally|fundraiser|endorsement|debate performance|approval rating|primary race|campaign ad|midterms?|mail-in voting|voting rules?|administration urges|court filing|appeal filed|political lawsuit)\b/iu;

const HUMAN_INTEREST_FOLLOWUP_PATTERN =
  /\b(?:opened (?:their|his|her) home|community mourns|vigil for|funeral for|survivors? remember|profile of|nostalgia for|the story of|what life is like)\b/iu;

const ORDINARY_CRIME_PATTERN =
  /\b(?:shoplifting|burglary|robbery|traffic stop|carjacking|theft|fraud|charged with|arrested for)\b/iu;

const MASS_HARM_PATTERN =
  /\b(?:mass|multiple|dozens|hundreds|terror|explosion|killed|dead|fatal|hostages?|school shooting|active shooter)\b/iu;

const INCREMENTAL_BATTLEFIELD_PATTERN =
  /\b(?:footage (?:shows|of)|reportedly destroyed|drone footage|another (?:airstrike|strike|night of strikes)|new round of strikes|consecutive (?:day|days|night|nights) of strikes|continued strikes|minor advances?|tactical gains?|unconfirmed battlefield)\b/iu;

const WEATHER_PATTERN =
  /\b(?:weather|thunderstorm|rain|snow|wind advisory|flood advisory|heat advisory|forecast|tornado watch|winter storm watch)\b/iu;

const HIGH_IMPACT_WEATHER_PATTERN =
  /\b(?:tornado emergency|particularly dangerous situation|hurricane warning|storm surge warning|tsunami warning|extreme wind warning|flash flood emergency|category [345] hurricane)\b/iu;

function textFor(candidate) {
  return [
    candidate?.title,
    candidate?.summary,
    candidate?.text,
    candidate?.eventType,
    ...(candidate?.tags ?? []),
    ...(candidate?.geography?.areas ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function severityRank(candidate) {
  const raw =
    candidate?.severity?.rank ??
    candidate?.severityRank ??
    candidate?.severity?.level ??
    0;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  const normalized = String(raw).trim().toLowerCase();
  return {
    minor: 1,
    moderate: 2,
    severe: 3,
    extreme: 4,
    critical: 5,
  }[normalized] ?? 0;
}

function explicitCountryIsUs(candidate) {
  const country = String(
    candidate?.geography?.countryCode ??
      candidate?.countryCode ??
      "",
  ).toUpperCase();
  const scope = String(candidate?.geography?.scope ?? "").toLowerCase();
  return (
    ["US", "USA"].includes(country) ||
    ["us", "usa", "us-national", "united-states"].includes(scope)
  );
}

function officialUsEvent(candidate, source) {
  return (
    source?.lane === "official" &&
    ["nws", "usgs", "nhc", "faa", "cisa", "cdc", "fema", "noaa-space-weather"]
      .includes(source.key) &&
    (
      explicitCountryIsUs(candidate) ||
      ["nws", "faa", "cisa", "cdc", "fema", "noaa-space-weather"]
        .includes(source.key)
    )
  );
}

function inferredSignificance({
  candidate,
  text,
  directUsReference,
  consequentialGovernmentAction,
  majorGlobalShock,
  exceptionalSpaceUap,
}) {
  const explicit = candidate?.editorial?.significance;
  if (Object.values(SIGNIFICANCE_LEVELS).includes(explicit)) {
    return explicit;
  }

  const rank = severityRank(candidate);
  if (rank >= 5 || CRITICAL_PATTERN.test(text)) {
    return SIGNIFICANCE_LEVELS.CRITICAL;
  }
  if (
    rank >= 4 ||
    majorGlobalShock ||
    consequentialGovernmentAction ||
    exceptionalSpaceUap ||
    (directUsReference && MAJOR_US_PATTERN.test(text))
  ) {
    return SIGNIFICANCE_LEVELS.MAJOR;
  }
  if (
    rank >= 3 ||
    (directUsReference && IMPACT_PATTERN.test(text))
  ) {
    return SIGNIFICANCE_LEVELS.NOTABLE;
  }
  return SIGNIFICANCE_LEVELS.ROUTINE;
}

function inferExclusions({
  candidate,
  text,
  significance,
  consequentialGovernmentAction,
  majorGlobalShock,
  exceptionalSpaceUap,
}) {
  const explicit = Array.isArray(candidate?.editorial?.exclusions)
    ? candidate.editorial.exclusions
    : [];
  const exclusions = new Set(explicit);
  const major =
    significance === SIGNIFICANCE_LEVELS.MAJOR ||
    significance === SIGNIFICANCE_LEVELS.CRITICAL ||
    consequentialGovernmentAction ||
    majorGlobalShock ||
    exceptionalSpaceUap;

  if (COMMENTARY_PATTERN.test(text) && !major) {
    exclusions.add(ROUTINE_EXCLUSIONS.COMMENTARY);
  }
  if (HUMAN_INTEREST_FOLLOWUP_PATTERN.test(text) && !major) {
    exclusions.add(ROUTINE_EXCLUSIONS.COMMENTARY);
  }
  if (
    ROUTINE_POLITICS_PATTERN.test(text) &&
    !consequentialGovernmentAction
  ) {
    exclusions.add(ROUTINE_EXCLUSIONS.ROUTINE_US_POLITICS);
  }
  if (
    ORDINARY_CRIME_PATTERN.test(text) &&
    !MASS_HARM_PATTERN.test(text)
  ) {
    exclusions.add(ROUTINE_EXCLUSIONS.ORDINARY_CRIME);
  }
  if (
    INCREMENTAL_BATTLEFIELD_PATTERN.test(text) &&
    !majorGlobalShock &&
    significance !== SIGNIFICANCE_LEVELS.MAJOR &&
    significance !== SIGNIFICANCE_LEVELS.CRITICAL
  ) {
    exclusions.add(ROUTINE_EXCLUSIONS.INCREMENTAL_BATTLEFIELD_UPDATE);
  }
  if (
    WEATHER_PATTERN.test(text) &&
    !HIGH_IMPACT_WEATHER_PATTERN.test(text) &&
    severityRank(candidate) < 3
  ) {
    exclusions.add(ROUTINE_EXCLUSIONS.ROUTINE_WEATHER);
  }
  return [...exclusions].sort();
}

function deriveEntities(candidate, text) {
  const supplied = Array.isArray(candidate?.entities)
    ? candidate.entities.filter(Boolean).map(String)
    : [];
  const entityPatterns = [
    ["United States", /\b(?:U\.S\.A?\.?|US|USA|United States|American)\b/u],
    ["White House", /\bWhite House\b/iu],
    ["Pentagon", /\bPentagon\b/iu],
    ["Congress", /\bCongress\b/iu],
    ["Supreme Court", /\bSupreme Court\b/iu],
    ["NASA", /\bNASA\b/u],
    ["NOAA", /\bNOAA\b/u],
    ["FEMA", /\bFEMA\b/u],
    ["CENTCOM", /\bCENTCOM\b/u],
    ["Iran", /\bIran(?:ian)?\b/iu],
    ["Israel", /\bIsrael(?:i)?\b/iu],
    ["Russia", /\bRussia(?:n)?\b/iu],
    ["Ukraine", /\bUkrain(?:e|ian)\b/iu],
    ["China", /\bChin(?:a|ese)\b/iu],
    ["Taiwan", /\bTaiwan(?:ese)?\b/iu],
    ["Jordan", /\bJordan\b/iu],
    ["Seattle", /\bSeattle\b/iu],
    ["Texas", /\bTexas\b/iu],
    ["California", /\bCalifornia\b/iu],
    ["Florida", /\bFlorida\b/iu],
    ["New York", /\bNew York\b/iu],
  ];
  const eventPatterns = [
    [
      "event:missile-attack",
      /\b(?:ballistic missile|missile attack|launch(?:ed|es|ing)? missiles?)\b/iu,
    ],
    ["event:shooting", /\b(?:shooting|active shooter)\b/iu],
    ["event:earthquake", /\bearthquake\b/iu],
    [
      "event:aviation-disruption",
      /\b(?:ground stop|airport closure|all flights grounded)\b/iu,
    ],
    ["event:cyber-outage", /\b(?:cyberattack|IT outage|internet outage)\b/iu],
    [
      "event:tropical-cyclone",
      /\b(?:hurricane|tropical storm|typhoon|cyclone)\b/iu,
    ],
    ["event:space-weather", /\b(?:geomagnetic storm|radio blackout|solar radiation storm)\b/iu],
  ];
  const known = [...entityPatterns, ...eventPatterns]
    .filter(([, pattern]) => pattern.test(text))
    .map(([entity]) => entity);
  return [...new Set([...supplied, ...known])];
}

/**
 * Converts normalized feed metadata and auditable text rules into the explicit
 * editorial fields consumed by the publication policy. It deliberately treats
 * "BREAKING" as decoration rather than evidence of importance.
 */
export function classifyCandidate(candidate = {}) {
  const sourceKey = candidate.source?.key ?? candidate.sourceKey;
  const source = getIntelSource(sourceKey);
  const text = textFor(candidate);
  const directUsReference =
    candidate?.editorial?.scope?.directUsImpact === true ||
    explicitCountryIsUs(candidate) ||
    officialUsEvent(candidate, source) ||
    US_REFERENCE_PATTERN.test(text) ||
    US_ABBREVIATION_PATTERN.test(text) ||
    US_MILITARY_PATTERN.test(text);
  const consequentialGovernmentAction =
    candidate?.editorial?.scope?.consequentialUsGovernmentAction === true ||
    (
      GOVERNMENT_ACTION_PATTERN.test(text) &&
      HIGH_CONSEQUENCE_POLICY_PATTERN.test(text)
    );
  const majorGlobalShock =
    candidate?.editorial?.scope?.majorGlobalShock === true ||
    MAJOR_GLOBAL_PATTERN.test(text) ||
    CRITICAL_PATTERN.test(text);
  const exceptionalSpaceUap =
    candidate?.editorial?.scope?.exceptionalSpaceUap === true ||
    (
      SPACE_UAP_PATTERN.test(text) &&
      EXCEPTIONAL_DISCLOSURE_PATTERN.test(text)
    );
  const significance = inferredSignificance({
    candidate,
    text,
    directUsReference,
    consequentialGovernmentAction,
    majorGlobalShock,
    exceptionalSpaceUap,
  });
  const directUsImpact =
    directUsReference &&
    (
      significance !== SIGNIFICANCE_LEVELS.ROUTINE ||
      IMPACT_PATTERN.test(text)
    );
  const exclusions = inferExclusions({
    candidate,
    text,
    significance,
    consequentialGovernmentAction,
    majorGlobalShock,
    exceptionalSpaceUap,
  });

  return Object.freeze({
    title: candidate.title ?? candidate.summary ?? "Untitled report",
    url: candidate.url ?? candidate.canonicalUrl ?? "",
    publishedAt: candidate.publishedAt,
    eventKeys: Object.freeze(
      [
        ...(candidate.eventKeys ?? []),
        candidate.eventId && candidate.eventType !== "social-post"
          ? `${sourceKey}:${candidate.eventId}`
          : null,
      ].filter(Boolean),
    ),
    entities: Object.freeze(deriveEntities(candidate, text)),
    scope: Object.freeze({
      directUsImpact,
      consequentialUsGovernmentAction: consequentialGovernmentAction,
      majorGlobalShock,
      exceptionalSpaceUap,
    }),
    significance,
    exclusions: Object.freeze(exclusions),
    rationale: Object.freeze({
      sourceKey,
      directUsReference,
      severityRank: severityRank(candidate),
      matchedImpactLanguage: IMPACT_PATTERN.test(text),
    }),
  });
}
