/// <reference lib="webworker" />
// Routing runs here so the page stays responsive: the graph is fetched and
// decoded in this thread, and results are returned as transferable buffers.
import {
  BASE_SPEED,
  type Graph,
  decodeGraph,
  timeToSeeds,
} from "../lib/graph.ts";
import { type TransitData, transitTimes } from "../lib/transit.ts";
import type { FromWorker, InitMessage, ToWorker } from "./protocol.ts";

declare const self: DedicatedWorkerGlobalScope;

let init: InitMessage | null = null;
let graph: Promise<Graph> | null = null;
let transit: Promise<TransitData> | null = null;

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Some servers decompress .gz files on the way; only inflate real gzip.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer;
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

function loadGraph(dataUrl: string) {
  graph ??= fetchBuffer(`${dataUrl}graph.bin.gz`).then(decodeGraph);
  return graph;
}

function loadTransit(dataUrl: string) {
  transit ??= fetch(`${dataUrl}transit.json`).then(async (res) => {
    if (!res.ok) throw new Error(`transit.json: ${res.status}`);
    return (await res.json()) as TransitData;
  });
  return transit;
}

function toCellMinutes(
  nodeSeconds: Float32Array,
  extraSeconds: number,
  speed: number,
  cells: InitMessage,
): Float32Array {
  const out = new Float32Array(cells.cellNodes.length);
  for (let i = 0; i < out.length; i++) {
    const seconds = nodeSeconds[cells.cellNodes[i]!]!;
    out[i] = (seconds + cells.cellSnap[i]! / speed + extraSeconds) / 60;
  }
  return out;
}

self.addEventListener("message", async (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.type === "init") {
    init = message;
    void loadGraph(message.dataUrl);
    return;
  }
  const cells = init;
  try {
    if (!cells) throw new Error("Router used before init.");
    const g = await loadGraph(cells.dataUrl);
    const factor = BASE_SPEED / message.speed;
    const snapSeconds = message.snap / message.speed;
    const walkNodes = timeToSeeds(
      g,
      [{ node: message.node, seconds: 0 }],
      factor,
    );
    const walk = toCellMinutes(walkNodes, snapSeconds, message.speed, cells);
    let transitMinutes: Float32Array | null = null;
    let serviceDate: string | null = null;
    if (message.transit) {
      const data = await loadTransit(cells.dataUrl);
      serviceDate = data.serviceDate;
      const best = transitTimes(g, data, walkNodes, factor);
      transitMinutes = toCellMinutes(best, snapSeconds, message.speed, cells);
    }
    const reply: FromWorker = {
      type: "result",
      id: message.id,
      walk,
      transit: transitMinutes,
      serviceDate,
    };
    const transfer = [
      walk.buffer,
      ...(transitMinutes ? [transitMinutes.buffer] : []),
    ];
    self.postMessage(reply, transfer);
  } catch (error) {
    const reply: FromWorker = {
      type: "error",
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
});
