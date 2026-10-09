// Muni weekday morning service from the SFMTA GTFS feed, reduced to stop
// patterns with typical ride times and headways.
import { strFromU8, unzipSync } from "fflate";
import type { TransitData } from "../src/lib/transit.ts";
import { gtfsSeconds, parseCsv } from "./csv.ts";
import { bbox, cached, fetchBytes, log } from "./lib.ts";
import type { NodeIndex } from "./walk.ts";

const FEED = "https://muni-gtfs.apps.sfmta.com/data/muni_gtfs-current.zip";
const WINDOW_START = 6 * 3600;
const WINDOW_END = 10 * 3600;
const STOP_SNAP_METERS = 150;

function ymd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

/** The first Wednesday on or after today that the feed has service for. */
function serviceDate(calendar: Record<string, string>[]): string {
  const date = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(date.getTime() + i * 86_400_000);
    if (d.getUTCDay() !== 3) continue;
    const stamp = ymd(d);
    if (
      calendar.some((c) => c["start_date"]! <= stamp && stamp <= c["end_date"]!)
    ) {
      return stamp;
    }
  }
  // Fall back to the latest Wednesday the calendar covers.
  const end = calendar
    .map((c) => c["end_date"]!)
    .toSorted()
    .at(-1)!;
  const d = new Date(
    `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T12:00:00Z`,
  );
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() - 1);
  return ymd(d);
}

function median(values: number[]) {
  const s = values.toSorted((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

export async function buildTransit(
  nodes: NodeIndex,
  refresh: boolean,
): Promise<TransitData> {
  const zip = unzipSync(
    await cached("muni-gtfs.zip", () => fetchBytes(FEED), refresh),
  );
  const file = (name: string) => {
    const bytes = zip[name];
    return bytes ? parseCsv(strFromU8(bytes)) : [];
  };

  const calendar = file("calendar.txt");
  const date = serviceDate(calendar);
  const weekday = "wednesday";
  const active = new Set(
    calendar
      .filter(
        (c) =>
          c[weekday] === "1" &&
          c["start_date"]! <= date &&
          date <= c["end_date"]!,
      )
      .map((c) => c["service_id"]!),
  );
  for (const ex of file("calendar_dates.txt")) {
    if (ex["date"] !== date) continue;
    if (ex["exception_type"] === "1") active.add(ex["service_id"]!);
    if (ex["exception_type"] === "2") active.delete(ex["service_id"]!);
  }

  const routeName = new Map(
    file("routes.txt").map((r) => [
      r["route_id"]!,
      r["route_short_name"] || r["route_long_name"] || r["route_id"]!,
    ]),
  );
  const trips = new Map(
    file("trips.txt")
      .filter((t) => active.has(t["service_id"]!))
      .map((t) => [
        t["trip_id"]!,
        {
          route: t["route_id"]!,
          direction: t["direction_id"] ?? "0",
          headsign: t["trip_headsign"] ?? "",
        },
      ]),
  );

  const stopTimes = new Map<
    string,
    { seq: number; stop: string; time: number }[]
  >();
  for (const st of file("stop_times.txt")) {
    const trip = st["trip_id"]!;
    if (!trips.has(trip)) continue;
    const time = gtfsSeconds(
      st["departure_time"] || st["arrival_time"] || "0:0:0",
    );
    const list = stopTimes.get(trip) ?? [];
    list.push({ seq: Number(st["stop_sequence"]), stop: st["stop_id"]!, time });
    stopTimes.set(trip, list);
  }

  const b = bbox();
  const stopInfo = new Map(
    file("stops.txt").map((s) => [
      s["stop_id"]!,
      {
        name: s["stop_name"] ?? "",
        lon: Number(s["stop_lon"]),
        lat: Number(s["stop_lat"]),
      },
    ]),
  );

  // Group morning trips by route, direction and exact stop sequence.
  const patterns = new Map<
    string,
    { route: string; headsign: string; stops: string[]; offsets: number[][] }
  >();
  for (const [tripId, list] of stopTimes) {
    list.sort((x, y) => x.seq - y.seq);
    const start = list[0]!.time;
    if (start < WINDOW_START || start >= WINDOW_END) continue;
    const trip = trips.get(tripId)!;
    const stops = list.map((s) => s.stop);
    const key = `${trip.route}|${trip.direction}|${stops.join(",")}`;
    const pattern = patterns.get(key) ?? {
      route: routeName.get(trip.route) ?? trip.route,
      headsign: trip.headsign,
      stops,
      offsets: stops.map(() => []),
    };
    list.forEach((s, i) => pattern.offsets[i]!.push(s.time - start));
    patterns.set(key, pattern);
  }

  const stopIndex = new Map<string, number>();
  const out: TransitData = {
    serviceDate: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    window: "06:00-10:00",
    stops: { node: [], name: [], lon: [], lat: [] },
    patterns: [],
  };
  const snap = new Map<string, number | null>();
  const keep = (stopId: string): number | null => {
    if (snap.has(stopId)) return snap.get(stopId)!;
    const info = stopInfo.get(stopId);
    let result: number | null = null;
    if (
      info &&
      info.lat >= b.south &&
      info.lat <= b.north &&
      info.lon >= b.west &&
      info.lon <= b.east
    ) {
      const hit = nodes.nearest(info.lon, info.lat, STOP_SNAP_METERS);
      if (hit) {
        result = out.stops.node.length;
        stopIndex.set(stopId, result);
        out.stops.node.push(hit.node);
        out.stops.name.push(info.name);
        out.stops.lon.push(Number(info.lon.toFixed(6)));
        out.stops.lat.push(Number(info.lat.toFixed(6)));
      }
    }
    snap.set(stopId, result);
    return result;
  };

  for (const p of patterns.values()) {
    const tripsInWindow = p.offsets[0]!.length;
    const stops: number[] = [];
    const times: number[] = [];
    p.stops.forEach((stopId, i) => {
      const index = keep(stopId);
      if (index === null) return;
      stops.push(index);
      times.push(median(p.offsets[i]!));
    });
    if (stops.length < 2) continue;
    const t0 = times[0]!;
    out.patterns.push({
      route: p.route,
      headsign: p.headsign,
      headway: Math.round((WINDOW_END - WINDOW_START) / tripsInWindow),
      stops,
      times: times.map((t) => t - t0),
    });
  }
  log(
    "transit",
    `service date ${out.serviceDate}: ${out.patterns.length} patterns, ${out.stops.node.length} stops`,
  );
  return out;
}
