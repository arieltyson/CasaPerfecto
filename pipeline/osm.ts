// Street and path network from OpenStreetMap through the Overpass API.
import { bbox, cached, fetchBytes, log } from "./lib.ts";

export interface OsmWay {
  id: number;
  nodes: number[];
  tags: Record<string, string>;
}

export interface OsmData {
  coords: Map<number, [number, number]>;
  ways: OsmWay[];
}

const WALKABLE = new Set([
  "footway",
  "path",
  "pedestrian",
  "steps",
  "residential",
  "living_street",
  "service",
  "unclassified",
  "tertiary",
  "tertiary_link",
  "secondary",
  "secondary_link",
  "primary",
  "primary_link",
  "track",
  "cycleway",
  "corridor",
]);

/** Whether a person may walk along this way. */
export function isWalkable(tags: Record<string, string>): boolean {
  const highway = tags["highway"];
  if (!highway || !WALKABLE.has(highway)) return false;
  const foot = tags["foot"];
  if (foot === "no" || foot === "private") return false;
  const access = tags["access"];
  const footAllowed = foot === "yes" || foot === "designated";
  if ((access === "no" || access === "private") && !footAllowed) return false;
  if (tags["sidewalk"] === "no" && highway === "primary" && !footAllowed) {
    return false;
  }
  return true;
}

export async function loadOsm(refresh = false): Promise<OsmData> {
  const b = bbox();
  const query = `[out:json][timeout:300];
way["highway"](${b.south},${b.west},${b.north},${b.east});
out body;
>;
out skel qt;`;
  const bytes = await cached(
    "osm-highways.json",
    () =>
      fetchBytes("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
      }),
    refresh,
  );
  const json = JSON.parse(new TextDecoder().decode(bytes)) as {
    elements: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      nodes?: number[];
      tags?: Record<string, string>;
    }[];
  };

  const coords = new Map<number, [number, number]>();
  const ways: OsmWay[] = [];
  for (const el of json.elements) {
    if (el.type === "node" && el.lon !== undefined && el.lat !== undefined) {
      coords.set(el.id, [el.lon, el.lat]);
    } else if (el.type === "way" && el.nodes && el.tags) {
      if (isWalkable(el.tags)) {
        ways.push({ id: el.id, nodes: el.nodes, tags: el.tags });
      }
    }
  }
  log("osm", `${ways.length} walkable ways, ${coords.size} nodes`);
  return { coords, ways };
}
