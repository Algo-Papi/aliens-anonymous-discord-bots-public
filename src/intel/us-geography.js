function inBox(latitude, longitude, box) {
  return (
    latitude >= box.minimumLatitude &&
    latitude <= box.maximumLatitude &&
    longitude >= box.minimumLongitude &&
    longitude <= box.maximumLongitude
  );
}

// Deliberately broad impact corridors, not political boundary geometry. They
// include nearby offshore events that can affect U.S. states and territories.
const US_IMPACT_BOXES = Object.freeze([
  {
    name: "Contiguous United States",
    minimumLatitude: 20,
    maximumLatitude: 53,
    minimumLongitude: -132,
    maximumLongitude: -62,
  },
  {
    name: "Alaska and Aleutians",
    minimumLatitude: 48,
    maximumLatitude: 74,
    minimumLongitude: -180,
    maximumLongitude: -125,
  },
  {
    name: "Western Aleutians",
    minimumLatitude: 48,
    maximumLatitude: 58,
    minimumLongitude: 165,
    maximumLongitude: 180,
  },
  {
    name: "Hawaii",
    minimumLatitude: 15,
    maximumLatitude: 27,
    minimumLongitude: -165,
    maximumLongitude: -150,
  },
  {
    name: "Puerto Rico and U.S. Virgin Islands",
    minimumLatitude: 14,
    maximumLatitude: 22,
    minimumLongitude: -72,
    maximumLongitude: -62,
  },
  {
    name: "Guam and Northern Mariana Islands",
    minimumLatitude: 10,
    maximumLatitude: 23,
    minimumLongitude: 138,
    maximumLongitude: 148,
  },
  {
    name: "American Samoa",
    minimumLatitude: -18,
    maximumLatitude: -9,
    minimumLongitude: -174,
    maximumLongitude: -166,
  },
]);

export function usImpactArea(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return (
    US_IMPACT_BOXES.find((box) => inBox(latitude, longitude, box))
      ?.name ?? null
  );
}

export function isInUnitedStatesImpactCorridor(latitude, longitude) {
  return Boolean(usImpactArea(latitude, longitude));
}
