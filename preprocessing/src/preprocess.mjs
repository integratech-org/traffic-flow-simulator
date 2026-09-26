import { readFileSync, writeFileSync } from "fs";
import * as turf from "@turf/turf";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CELL_SIZE_METERS = 7.5;
const GEOJSON_PATH = join(__dirname, "data/raw/commonwealth-mindanao.geojson");
const LEG_CONFIG_PATH = join(__dirname, "data/leg-config.json");
const OUTPUT_PATH = join(
  __dirname,
  "../../backend/src/network/data/network.json",
);

const geojson = JSON.parse(readFileSync(GEOJSON_PATH, "utf-8"));
const legConfig = JSON.parse(readFileSync(LEG_CONFIG_PATH, "utf-8"));

// Index raw OSM features by their "@id" (e.g. "way/9473123")
const featuresById = new Map();
for (const feature of geojson.features) {
  featuresById.set(feature.properties["@id"], feature);
}

/**
 * Concatenate one or more OSM ways (in the order given by leg-config.json)
 * into a single continuous LineString feature.
 *
 * Assumes ways are already oriented correctly (this was verified manually
 * for this junction — see traffic-sim-project-notes.md). If a new leg is
 * added later and this throws, the way order/direction in leg-config.json
 * needs checking, not this function.
 */
function buildLegLine(wayIds) {
  let coords = [];

  for (const wayId of wayIds) {
    const feature = featuresById.get(wayId);
    if (!feature) {
      throw new Error(`wayId ${wayId} not found in geojson`);
    }
    const wayCoords = feature.geometry.coordinates;

    if (coords.length === 0) {
      coords = [...wayCoords];
      continue;
    }

    const lastPoint = coords[coords.length - 1];
    const firstPoint = wayCoords[0];
    const gapMeters = turf.distance(
      turf.point(lastPoint),
      turf.point(firstPoint),
      { units: "meters" },
    );

    if (gapMeters > 1) {
      throw new Error(
        `${wayId} does not connect to the previous way in this leg ` +
          `(gap: ${gapMeters.toFixed(1)}m). Check wayIds order/direction in leg-config.json.`,
      );
    }

    // Drop the duplicate shared point, append the rest
    coords.push(...wayCoords.slice(1));
  }

  return turf.lineString(coords);
}

/**
 * Sample a line every CELL_SIZE_METERS to get discrete cell center coordinates.
 */
function discretizeLine(line) {
  const totalLengthMeters = turf.length(line, { units: "meters" });
  const numCells = Math.floor(totalLengthMeters / CELL_SIZE_METERS);

  const cellCoords = [];
  for (let i = 0; i < numCells; i++) {
    const point = turf.along(line, i * CELL_SIZE_METERS, { units: "meters" });
    cellCoords.push(point.geometry.coordinates); // [lng, lat]
  }

  return { numCells, cellCoords, totalLengthMeters };
}

const lanes = {}; // laneId -> { numCells, cellCoords, connectsTo }
const legSummary = {}; // legId -> metadata, for debugging/logging only

for (const leg of legConfig.legs) {
  legSummary[leg.id] = {};

  for (const direction of ["inbound", "outbound"]) {
    const line = buildLegLine(leg[direction].wayIds);
    const { numCells, cellCoords, totalLengthMeters } = discretizeLine(line);

    legSummary[leg.id][direction] = {
      lengthMeters: Math.round(totalLengthMeters * 10) / 10,
      numCells,
    };

    // One CA lane per physical lane on this leg. All lanes on a leg
    // currently share the same centerline geometry — no per-lane
    // lateral offset. Fine for simulation logic; a frontend concern
    // if you later want lanes drawn side-by-side on the map.
    for (let laneIndex = 0; laneIndex < leg.lanes; laneIndex++) {
      const laneId = `${leg.id}_${direction}_lane${laneIndex}`;
      lanes[laneId] = {
        legId: leg.id,
        direction,
        laneIndex,
        numCells,
        cellCoords,
        connectsTo: null, // filled in below for inbound lanes
      };
    }
  }
}

// Wire up connectsTo: inbound lane N of leg A -> outbound lane N of leg B,
// per the straight-through pairing in leg-config.json's connectsTo map.
for (const leg of legConfig.legs) {
  const pairedLegId = legConfig.connectsTo[leg.id];
  if (!pairedLegId) continue;

  for (let laneIndex = 0; laneIndex < leg.lanes; laneIndex++) {
    const inboundLaneId = `${leg.id}_inbound_lane${laneIndex}`;
    const outboundLaneId = `${pairedLegId}_outbound_lane${laneIndex}`;

    if (!lanes[outboundLaneId]) {
      throw new Error(
        `${inboundLaneId} has no matching outbound lane ${outboundLaneId} — ` +
          `lane counts between ${leg.id} and ${pairedLegId} don't match.`,
      );
    }

    lanes[inboundLaneId].connectsTo = outboundLaneId;
  }
}

const network = {
  cellSizeMeters: CELL_SIZE_METERS,
  junction: legConfig.junction.name,
  lanes,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(network, null, 2));

console.log("Leg lengths / cell counts:");
console.table(
  Object.entries(legSummary).flatMap(([legId, dirs]) =>
    Object.entries(dirs).map(([direction, stats]) => ({
      legId,
      direction,
      ...stats,
    })),
  ),
);
console.log(`\nWrote ${Object.keys(lanes).length} lanes to ${OUTPUT_PATH}`);
