// Messages between the page and the routing worker.

export interface InitMessage {
  type: "init";
  /** Absolute URL of the data directory. */
  dataUrl: string;
  cellNodes: number[];
  cellSnap: number[];
}

export interface RouteMessage {
  type: "route";
  id: number;
  /** Walking-graph node the workplace snaps to. */
  node: number;
  /** Meters from the workplace to that node. */
  snap: number;
  /** Walking speed in m/s. */
  speed: number;
  transit: boolean;
}

export type ToWorker = InitMessage | RouteMessage;

export interface RouteResult {
  type: "result";
  id: number;
  /** Minutes from each cell to work on foot. */
  walk: Float32Array;
  /** Minutes by walking and Muni, or null when not requested. */
  transit: Float32Array | null;
  /** Schedule sample date for the transit times. */
  serviceDate: string | null;
}

export interface RouteError {
  type: "error";
  id: number;
  message: string;
}

export type FromWorker = RouteResult | RouteError;
