// Rebuilds every data file the site ships. Run with `npm run pipeline`.
// Downloads are cached in pipeline/.cache; pass --refresh to fetch new data.
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { encodeGraph } from "../src/lib/graph.ts";
import { DATA_OUT, isoDate, log, writeBytes, writeJson } from "./lib.ts";
import { buildBasemap } from "./basemap.ts";
import { loadOsm } from "./osm.ts";
import { loadTerrain } from "./terrain.ts";
import {
  NodeIndex,
  buildCells,
  buildNetwork,
  intersections,
  outline,
} from "./walk.ts";

const refresh = process.argv.includes("--refresh");

const osm = await loadOsm(refresh);
const terrain = await loadTerrain();
const network = buildNetwork(osm, terrain);
const nodes = new NodeIndex(network);
const cells = buildCells(network, nodes);

const graphBytes = gzipSync(encodeGraph(network.graph), { level: 9 });
writeBytes(join(DATA_OUT, "graph.bin.gz"), graphBytes);
log("out", `graph.bin.gz ${(graphBytes.length / 1024).toFixed(0)} KB`);

writeJson(join(DATA_OUT, "places.json"), intersections(network, cells));
writeJson(join(DATA_OUT, "area.json"), {
  asOf: isoDate(),
  grid: cells.grid,
  cells: { index: cells.index, node: cells.node, snap: cells.snap },
  outline: outline(cells),
});

await buildBasemap(refresh);
