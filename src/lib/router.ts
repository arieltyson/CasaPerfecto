// Page-side handle to the routing worker, with a small result cache so moving
// back to a recent workplace or speed is instant. The worker starts on first
// use and is started again if a request arrives after dispose().
import type { AreaData } from "../data/area.ts";
import type { FromWorker, RouteResult, ToWorker } from "../workers/protocol.ts";

export interface Commute {
  walk: Float32Array;
  transit: Float32Array | null;
  serviceDate: string | null;
}

const CACHE_SIZE = 8;

export class Router {
  private area: AreaData;
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (r: RouteResult) => void; reject: (e: Error) => void }
  >();
  private cache = new Map<string, Promise<Commute>>();

  constructor(area: AreaData) {
    this.area = area;
  }

  private start(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(
      new URL("../workers/router.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (event: MessageEvent<FromWorker>) => {
      const reply = event.data;
      const waiting = this.pending.get(reply.id);
      if (!waiting) return;
      this.pending.delete(reply.id);
      if (reply.type === "result") waiting.resolve(reply);
      else waiting.reject(new Error(reply.message));
    });
    const init: ToWorker = {
      type: "init",
      dataUrl: new URL(`${import.meta.env.BASE_URL}data/`, location.href).href,
      cellNodes: this.area.cells.node,
      cellSnap: this.area.cells.snap,
    };
    worker.postMessage(init);
    this.worker = worker;
    return worker;
  }

  route(
    node: number,
    snap: number,
    speed: number,
    transit: boolean,
  ): Promise<Commute> {
    const key = `${node}:${Math.round(snap)}:${speed}:${transit}`;
    const hit = this.cache.get(key);
    if (hit) {
      // Refresh recency.
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const worker = this.start();
    const id = this.nextId++;
    const promise = new Promise<RouteResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const message: ToWorker = {
        type: "route",
        id,
        node,
        snap,
        speed,
        transit,
      };
      worker.postMessage(message);
    }).then((r): Commute => ({
      walk: r.walk,
      transit: r.transit,
      serviceDate: r.serviceDate,
    }));
    promise.catch(() => this.cache.delete(key));
    this.cache.set(key, promise);
    while (this.cache.size > CACHE_SIZE) {
      this.cache.delete(this.cache.keys().next().value!);
    }
    return promise;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    for (const { reject } of this.pending.values()) {
      reject(new Error("Router disposed."));
    }
    this.pending.clear();
    this.cache.clear();
  }
}
