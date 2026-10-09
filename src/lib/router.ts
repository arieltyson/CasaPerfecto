// Page-side handle to the routing worker, with a small result cache so moving
// back to a recent workplace or speed is instant.
import type { AreaData } from "../data/area.ts";
import type { FromWorker, RouteResult, ToWorker } from "../workers/protocol.ts";

export interface Commute {
  walk: Float32Array;
  transit: Float32Array | null;
  serviceDate: string | null;
}

const CACHE_SIZE = 8;

export class Router {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (r: RouteResult) => void; reject: (e: Error) => void }
  >();
  private cache = new Map<string, Promise<Commute>>();

  constructor(area: AreaData) {
    this.worker = new Worker(
      new URL("../workers/router.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.addEventListener(
      "message",
      (event: MessageEvent<FromWorker>) => {
        const reply = event.data;
        const waiting = this.pending.get(reply.id);
        if (!waiting) return;
        this.pending.delete(reply.id);
        if (reply.type === "result") waiting.resolve(reply);
        else waiting.reject(new Error(reply.message));
      },
    );
    const message: ToWorker = {
      type: "init",
      dataUrl: new URL(`${import.meta.env.BASE_URL}data/`, location.href).href,
      cellNodes: area.cells.node,
      cellSnap: area.cells.snap,
    };
    this.worker.postMessage(message);
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
      this.worker.postMessage(message);
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
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error("Router disposed."));
    }
    this.pending.clear();
  }
}
