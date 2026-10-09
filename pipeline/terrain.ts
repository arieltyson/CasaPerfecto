// Elevation from the public AWS Terrain Tiles (Terrarium encoding). In the
// United States they are built from the USGS 3D Elevation Program.
import { decode } from "fast-png";
import { bbox, cached, fetchBytes, log } from "./lib.ts";

const ZOOM = 15;
const SIZE = 256;

function tileX(lon: number) {
  return ((lon + 180) / 360) * 2 ** ZOOM;
}

function tileY(lat: number) {
  const r = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** ZOOM
  );
}

export interface Terrain {
  /** Meters above sea level, bilinearly interpolated. */
  elevation(lon: number, lat: number): number;
}

export async function loadTerrain(): Promise<Terrain> {
  const b = bbox();
  const x0 = Math.floor(tileX(b.west));
  const x1 = Math.floor(tileX(b.east));
  const y0 = Math.floor(tileY(b.north));
  const y1 = Math.floor(tileY(b.south));
  const tiles = new Map<string, Float32Array>();

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const bytes = await cached(`terrain/${ZOOM}-${x}-${y}.png`, () =>
        fetchBytes(
          `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${x}/${y}.png`,
        ),
      );
      const png = decode(bytes);
      const channels = png.channels;
      const heights = new Float32Array(SIZE * SIZE);
      for (let i = 0; i < SIZE * SIZE; i++) {
        const r = png.data[i * channels]!;
        const g = png.data[i * channels + 1]!;
        const bl = png.data[i * channels + 2]!;
        heights[i] = r * 256 + g + bl / 256 - 32768;
      }
      tiles.set(`${x}/${y}`, heights);
    }
  }
  log("terrain", `${tiles.size} tiles at zoom ${ZOOM}`);

  function sample(px: number, py: number): number {
    const x = Math.floor(px / SIZE);
    const y = Math.floor(py / SIZE);
    const tile = tiles.get(`${x}/${y}`);
    if (!tile) return 0;
    const ix = Math.min(SIZE - 1, Math.max(0, Math.floor(px - x * SIZE)));
    const iy = Math.min(SIZE - 1, Math.max(0, Math.floor(py - y * SIZE)));
    return tile[iy * SIZE + ix]!;
  }

  return {
    elevation(lon, lat) {
      const px = tileX(lon) * SIZE - 0.5;
      const py = tileY(lat) * SIZE - 0.5;
      const fx = px - Math.floor(px);
      const fy = py - Math.floor(py);
      const x = Math.floor(px);
      const y = Math.floor(py);
      const top = sample(x, y) * (1 - fx) + sample(x + 1, y) * fx;
      const bottom = sample(x, y + 1) * (1 - fx) + sample(x + 1, y + 1) * fx;
      return top * (1 - fy) + bottom * fy;
    },
  };
}
