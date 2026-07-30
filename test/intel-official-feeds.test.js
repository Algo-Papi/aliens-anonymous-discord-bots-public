import assert from "node:assert/strict";
import test from "node:test";

import {
  parseNhcCurrentStorms,
  parseNwsHighImpactAlerts,
  parseSwpcHighImpactAlerts,
  parseUsgsSignificantEarthquakes,
} from "../src/intel/official-feeds.js";

function earthquakeFeature({
  id,
  magnitude,
  longitude,
  latitude,
  alert = null,
  tsunami = 0,
  place = "Test location",
}) {
  return {
    type: "Feature",
    id,
    properties: {
      mag: magnitude,
      place,
      time: 1_785_270_000_000,
      updated: 1_785_270_060_000,
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
      sig: 700,
      alert,
      tsunami,
      status: "reviewed",
    },
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude, 12.3],
    },
  };
}

test("USGS emits only U.S.-impact or globally major earthquakes", () => {
  const candidates = parseUsgsSignificantEarthquakes({
    type: "FeatureCollection",
    features: [
      earthquakeFeature({
        id: "us-near",
        magnitude: 5.2,
        longitude: -122,
        latitude: 38,
        place: "Northern California",
      }),
      earthquakeFeature({
        id: "foreign-mid",
        magnitude: 6.8,
        longitude: 80,
        latitude: 30,
        place: "Remote region",
      }),
      earthquakeFeature({
        id: "global-major",
        magnitude: 7.2,
        longitude: 80,
        latitude: 30,
        place: "Remote region",
      }),
    ],
  });

  assert.deepEqual(
    candidates.map((candidate) => candidate.eventId),
    ["us-near", "global-major"],
  );
  assert.equal(candidates[0].source.key, "usgs");
  assert.equal(candidates[0].evidence.official, true);
  assert.equal(candidates[0].geography.countryCode, "US");
  assert.equal(candidates[1].severity.rank, 4);
});

function nwsFeature(id, overrides = {}) {
  return {
    type: "Feature",
    id: `https://api.weather.gov/alerts/${id}`,
    properties: {
      status: "Actual",
      messageType: "Alert",
      sent: "2026-07-28T20:00:00Z",
      effective: "2026-07-28T20:00:00Z",
      expires: "2026-07-28T21:00:00Z",
      event: "Tornado Warning",
      headline: "Tornado Warning issued for Example County",
      description: "A tornado warning remains in effect.",
      areaDesc: "Example County; Another County",
      severity: "Extreme",
      certainty: "Observed",
      urgency: "Immediate",
      parameters: {},
      ...overrides,
    },
  };
}

test("NWS suppresses routine warnings but retains emergencies and rare hazards", () => {
  const candidates = parseNwsHighImpactAlerts({
    type: "FeatureCollection",
    features: [
      nwsFeature("routine-tornado"),
      nwsFeature("tornado-emergency", {
        headline: "TORNADO EMERGENCY for Metro Example",
        parameters: {
          NWSheadline: ["TORNADO EMERGENCY"],
        },
      }),
      nwsFeature("hurricane", {
        event: "Hurricane Warning",
        headline: "Hurricane Warning issued for the Florida Keys",
        severity: "Severe",
      }),
      nwsFeature("ordinary-wind", {
        event: "Wind Advisory",
        severity: "Moderate",
        urgency: "Expected",
        certainty: "Likely",
      }),
      nwsFeature("local-civil-message", {
        event: "Civil Emergency Message",
        headline: "County road and public-land closure",
      }),
    ],
  });

  assert.equal(candidates.length, 2);
  assert.match(candidates[0].title, /TORNADO EMERGENCY/);
  assert.equal(candidates[0].severity.rank, 5);
  assert.equal(candidates[1].metadata.event, "Hurricane Warning");
  assert.deepEqual(candidates[1].geography.areas, [
    "Example County",
    "Another County",
  ]);
});

function storm(overrides = {}) {
  return {
    id: "ep072026",
    binNumber: "EP2",
    name: "Genevieve",
    classification: "HU",
    intensity: "105",
    pressure: "955",
    latitude: "18.0N",
    longitude: "116.9W",
    latitudeNumeric: 18,
    longitudeNumeric: -116.9,
    movementDir: 290,
    movementSpeed: 9,
    lastUpdate: "2026-07-28T21:00:00.000Z",
    publicAdvisory: {
      advNum: "018",
      issuance: "2026-07-28T21:00:00.000Z",
      url: "https://www.nhc.noaa.gov/text/MIATCPEP2.shtml",
    },
    windWatchesWarnings: null,
    stormSurgeWatchWarningGIS: null,
    ...overrides,
  };
}

test("NHC current-storm gate is U.S.-first and preserves stable storm ids", () => {
  const candidates = parseNhcCurrentStorms({
    activeStorms: [
      storm(),
      storm({
        id: "ep062026",
        binNumber: "CP1",
        name: "Fausto",
        classification: "TS",
        intensity: "45",
        latitude: "22.5N",
        longitude: "152.2W",
        latitudeNumeric: 22.5,
        longitudeNumeric: -152.2,
        publicAdvisory: {
          advNum: "040",
          issuance: "2026-07-28T21:00:00.000Z",
          url: "https://www.nhc.noaa.gov/text/HFOTCPCP1.shtml",
        },
      }),
      storm({
        id: "al052026",
        binNumber: "AT1",
        name: "Alex",
        intensity: "85",
        latitudeNumeric: 24,
        longitudeNumeric: -58,
      }),
      storm({
        id: "al062026",
        binNumber: "AT2",
        name: "Bonnie",
        classification: "TD",
        intensity: "25",
        latitudeNumeric: 24,
        longitudeNumeric: -70,
      }),
    ],
  });

  assert.deepEqual(
    candidates.map((candidate) => candidate.eventId),
    ["ep062026", "al052026"],
  );
  assert.equal(candidates[0].geography.countryCode, "US");
  assert.match(candidates[1].title, /Category 2 Hurricane Alex/);
  assert.equal(candidates[1].id, "nhc:al052026");
});

function swpcRecord(productId, scale, serial, issueDatetime) {
  return {
    product_id: productId,
    issue_datetime: issueDatetime,
    message: [
      "Space Weather Message Code: TEST01",
      `Serial Number: ${serial}`,
      `WARNING: Geomagnetic Storm Category ${scale} expected`,
      `NOAA Scale: ${scale} - Test`,
      "Potential Impacts: Power-grid and radio effects are possible.",
    ].join("\r\n"),
  };
}

test("SWPC emits only G3/R3/S3 or stronger products", () => {
  const candidates = parseSwpcHighImpactAlerts([
    swpcRecord("G2", "G2", "100", "2026-07-28 18:00:00.000"),
    swpcRecord("G3", "G3", "101", "2026-07-28 19:00:00.000"),
    {
      ...swpcRecord(
        "R4",
        "R4",
        "102",
        "2026-07-28 20:00:00.000",
      ),
      message: [
        "Space Weather Message Code: ALTFLR",
        "Serial Number: 102",
        "ALERT: X-ray Flux exceeded M5",
        "NOAA Scale: R4 - Severe",
      ].join("\n"),
    },
  ]);

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].metadata.scaleValue, 3);
  assert.equal(
    candidates[0].publishedAt,
    "2026-07-28T19:00:00.000Z",
  );
  assert.equal(
    candidates[0].publishedAtMs,
    Date.parse("2026-07-28T19:00:00.000Z"),
  );
  assert.equal(candidates[1].severity.level, "extreme");
  assert.equal(candidates[1].metadata.scaleFamily, "R");
});
