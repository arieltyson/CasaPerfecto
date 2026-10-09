// The map. Loaded lazily so the welcome screen stays light. Cell geometry is
// built once; commute bands change through feature-state, so moving the
// slider never rebuilds a source.
import type { FeatureCollection } from "geojson";
import {
  type ExpressionSpecification,
  type GeoJSONSource,
  Map as MapLibre,
  NavigationControl,
  type StyleSpecification,
  addProtocol as addMapProtocol,
  setWorkerUrl,
} from "maplibre-gl";
// MapLibre runs tile parsing in its own module worker; bundle it with the app
// so it is served from this origin.
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import type { Layers, Point } from "../../app/model.ts";
import type { FlyTarget } from "../../app/ui.tsx";
import type { AreaData } from "../../data/area.ts";
import {
  MAP_ALERT,
  MAP_FILL_OPACITY,
  MAP_INK,
  MOTION,
  NEUTRAL_DOT,
  PALETTES,
  RAMPS,
} from "../../design/tokens.ts";
import { band } from "../../lib/areas.ts";
import { cellCenter, cellRing } from "../../lib/grid.ts";

let protocolAdded = false;
function addProtocol() {
  if (protocolAdded) return;
  addMapProtocol("pmtiles", new Protocol().tile);
  setWorkerUrl(mapWorkerUrl);
  protocolAdded = true;
}

export interface MapMarker extends Point {
  label: string;
}

export interface MapViewProps {
  area: AreaData;
  appearance: "light" | "dark";
  highContrast: boolean;
  walk: Float32Array | null;
  transit: Float32Array | null;
  maxMinutes: number;
  layers: Layers;
  workplace: Point;
  listings: MapMarker[];
  selectedCell: number | null;
  picking: boolean;
  fly: FlyTarget | null;
  reducedMotion: boolean;
  /** Screen space covered by panels, so the camera centers in what is left. */
  padding: { top: number; right: number; bottom: number; left: number };
  label: string;
  onSelectCell: (cell: number | null) => void;
  onPick: (point: Point) => void;
  onError: () => void;
}

const base = new URL(import.meta.env.BASE_URL, location.href).href;

async function loadStyle(
  flavor: "light" | "dark",
): Promise<StyleSpecification> {
  const res = await fetch(`${base}basemap/style-${flavor}.json`);
  const text = await res.text();
  return JSON.parse(text.replaceAll("__BASE__", base)) as StyleSpecification;
}

function cellsGeoJson(area: AreaData): FeatureCollection {
  const c = area.cells;
  return {
    type: "FeatureCollection",
    features: c.index.map((g, i) => ({
      type: "Feature",
      id: i,
      properties: {
        vb: c.violentBand[i],
        pb: c.propertyBand[i],
        d: c.danger[i],
      },
      geometry: { type: "Polygon", coordinates: [cellRing(area.grid, g)] },
    })),
  };
}

function encampmentGeoJson(area: AreaData): FeatureCollection {
  const c = area.cells;
  return {
    type: "FeatureCollection",
    features: c.index.flatMap((g, i) =>
      c.encampment[i]! > 0
        ? [
            {
              type: "Feature" as const,
              properties: { eb: c.encampmentBand[i] },
              geometry: {
                type: "Point" as const,
                coordinates: cellCenter(area.grid, g),
              },
            },
          ]
        : [],
    ),
  };
}

function pointsGeoJson(markers: MapMarker[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      properties: { label: m.label },
      geometry: { type: "Point", coordinates: [m.lon, m.lat] },
    })),
  };
}

function selectedGeoJson(
  area: AreaData,
  cell: number | null,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features:
      cell === null
        ? []
        : [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [cellRing(area.grid, area.cells.index[cell]!)],
              },
            },
          ],
  };
}

function rampFor(kind: "commute" | "incidents", flavor: "light" | "dark") {
  if (kind === "commute") {
    return flavor === "light" ? RAMPS.commuteLight : RAMPS.commuteDark;
  }
  return flavor === "light" ? RAMPS.incidentsLight : RAMPS.incidentsDark;
}

function addOverlays(
  map: MapLibre,
  props: MapViewProps,
  flavor: "light" | "dark",
) {
  const palette =
    PALETTES[
      props.highContrast ? (flavor === "light" ? "hcLight" : "hcDark") : flavor
    ];
  const ink = MAP_INK[flavor];
  const commute = rampFor("commute", flavor);
  const incidents = rampFor("incidents", flavor);
  const firstLabel = map.getStyle().layers.find((l) => l.type === "symbol")?.id;

  map.addSource("cells", {
    type: "geojson",
    data: cellsGeoJson(props.area),
  });
  map.addSource("encampments", {
    type: "geojson",
    data: encampmentGeoJson(props.area),
  });
  map.addSource("outline", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiLineString", coordinates: props.area.outline },
    },
  });
  map.addSource("tenderloin", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: props.area.tenderloin },
    },
  });
  map.addSource("selected", {
    type: "geojson",
    data: selectedGeoJson(props.area, props.selectedCell),
  });
  map.addSource("workplace", {
    type: "geojson",
    data: pointsGeoJson([{ ...props.workplace, label: "" }]),
  });
  map.addSource("listings", {
    type: "geojson",
    data: pointsGeoJson(props.listings),
  });

  const commuteColor: ExpressionSpecification = [
    "match",
    ["coalesce", ["feature-state", "band"], 0],
    1,
    commute[0]!,
    2,
    commute[1]!,
    3,
    commute[2]!,
    4,
    commute[3]!,
    commute[4]!,
  ];
  map.addLayer(
    {
      id: "commute-fill",
      type: "fill",
      source: "cells",
      paint: {
        "fill-color": commuteColor,
        // Antialiasing draws hairline seams between adjacent cells.
        "fill-antialias": false,
        "fill-opacity": [
          "case",
          [">", ["coalesce", ["feature-state", "band"], 0], 0],
          MAP_FILL_OPACITY,
          0,
        ],
      },
    },
    firstLabel,
  );
  const bandColor = (prop: string): ExpressionSpecification => [
    "match",
    ["get", prop],
    0,
    incidents[0]!,
    1,
    incidents[1]!,
    2,
    incidents[2]!,
    3,
    incidents[3]!,
    incidents[4]!,
  ];
  for (const [id, prop] of [
    ["violent-fill", "vb"],
    ["property-fill", "pb"],
  ] as const) {
    map.addLayer(
      {
        id,
        type: "fill",
        source: "cells",
        layout: { visibility: "none" },
        paint: {
          "fill-color": bandColor(prop),
          "fill-opacity": MAP_FILL_OPACITY,
        },
      },
      firstLabel,
    );
  }
  // When shading by incidents, blocks beyond the commute limit are dimmed so
  // the reachable area still reads at a glance.
  map.addLayer(
    {
      id: "outside-dim",
      type: "fill",
      source: "cells",
      layout: { visibility: "none" },
      paint: {
        "fill-color": palette.base,
        "fill-antialias": false,
        "fill-opacity": [
          "case",
          [">", ["coalesce", ["feature-state", "band"], 0], 0],
          0,
          0.6,
        ],
      },
    },
    firstLabel,
  );
  map.addLayer({
    id: "area-outline",
    type: "line",
    source: "outline",
    paint: { "line-color": ink, "line-width": 1.5, "line-opacity": 0.6 },
  });
  map.addLayer({
    id: "danger-line",
    type: "line",
    source: "cells",
    filter: ["==", ["get", "d"], 1],
    layout: { visibility: "none" },
    paint: {
      "line-color": ink,
      "line-width": 1.5,
      "line-dasharray": [2, 1.5],
    },
  });
  map.addLayer({
    id: "encampment-dots",
    type: "circle",
    source: "encampments",
    layout: { visibility: "none" },
    paint: {
      "circle-color": NEUTRAL_DOT[flavor],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "eb"],
        1,
        1.5,
        4,
        4.5,
      ],
      "circle-opacity": 0.85,
      "circle-stroke-color": palette.base,
      "circle-stroke-width": 1,
    },
  });
  // Always shown: round caps on a short dash draw a dotted line.
  map.addLayer({
    id: "tenderloin-line",
    type: "line",
    source: "tenderloin",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": MAP_ALERT[flavor],
      "line-width": 3.5,
      "line-dasharray": [0.1, 2],
    },
  });
  map.addLayer({
    id: "selected-line",
    type: "line",
    source: "selected",
    paint: { "line-color": palette.accent, "line-width": 3 },
  });
  map.addLayer({
    id: "listings-dot",
    type: "circle",
    source: "listings",
    paint: {
      "circle-color": palette.textPrimary,
      "circle-radius": 11,
      "circle-stroke-color": palette.base,
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "listings-label",
    type: "symbol",
    source: "listings",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Medium"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": palette.base },
  });
  map.addLayer({
    id: "workplace-dot",
    type: "circle",
    source: "workplace",
    paint: {
      "circle-color": palette.accent,
      "circle-radius": 10,
      "circle-stroke-color": palette.base,
      "circle-stroke-width": 3,
    },
  });
}

function applyLayers(map: MapLibre, layers: Layers) {
  const show = (id: string, on: boolean) =>
    map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  show("commute-fill", layers.shade === "commute");
  show("violent-fill", layers.shade === "violent");
  show("property-fill", layers.shade === "property");
  show("outside-dim", layers.shade !== "commute");
  show("danger-line", layers.danger);
  show("encampment-dots", layers.encampment);
}

function applyBands(
  map: MapLibre,
  walk: Float32Array | null,
  transit: Float32Array | null,
  maxMinutes: number,
) {
  if (!walk) return;
  for (let i = 0; i < walk.length; i++) {
    const minutes = Math.min(walk[i]!, transit?.[i] ?? Infinity);
    map.setFeatureState(
      { source: "cells", id: i },
      { band: band(minutes, maxMinutes) },
    );
  }
}

export default function MapView(props: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [ready, setReady] = useState(0);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // Create the map once.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    addProtocol();
    let disposed = false;
    const p = latest.current;
    const g = p.area.grid;
    let map: MapLibre | null = null;
    loadStyle(p.appearance).then(
      (style) => {
        if (disposed) return;
        const created = new MapLibre({
          container: el,
          style,
          center: [p.workplace.lon, p.workplace.lat],
          zoom: 13.6,
          minZoom: 12,
          maxZoom: 17.5,
          maxBounds: [
            [g.west - g.dLon * 20, g.south - g.dLat * 20],
            [g.west + g.dLon * (g.cols + 20), g.south + g.dLat * (g.rows + 20)],
          ],
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        map = created;
        mapRef.current = created;
        created.addControl(
          new NavigationControl({ showCompass: false }),
          "bottom-right",
        );
        created.touchZoomRotate.disableRotation();
        let loaded = false;
        created.on("load", () => {
          loaded = true;
        });
        created.on("style.load", () => {
          const current = latest.current;
          addOverlays(created, current, current.appearance);
          setReady((n) => n + 1);
        });
        created.on("error", (e) => {
          // Individual tile errors are recoverable; failing to open the
          // basemap archive before the first load is not.
          const source = (e as { sourceId?: string }).sourceId;
          if (!loaded && source === "protomaps") latest.current.onError();
        });
        created.on("click", (e) => {
          const current = latest.current;
          if (current.picking) {
            current.onPick({ lon: e.lngLat.lng, lat: e.lngLat.lat });
            return;
          }
          const hit = created.queryRenderedFeatures(e.point, {
            layers: ["commute-fill", "violent-fill", "property-fill"],
          })[0];
          current.onSelectCell(typeof hit?.id === "number" ? hit.id : null);
        });
      },
      () => latest.current.onError(),
    );
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap the basemap when the appearance or contrast changes.
  const flavorKey = `${props.appearance}:${props.highContrast}`;
  const firstFlavor = useRef(flavorKey);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstFlavor.current === flavorKey) return;
    firstFlavor.current = flavorKey;
    let live = true;
    void loadStyle(props.appearance).then((style) => {
      if (live) map.setStyle(style, { diff: false });
    });
    return () => {
      live = false;
    };
  }, [flavorKey, props.appearance]);

  const {
    walk,
    transit,
    maxMinutes,
    layers,
    workplace,
    listings,
    selectedCell,
    area,
  } = props;

  useEffect(() => {
    const map = mapRef.current;
    if (map && ready) applyBands(map, walk, transit, maxMinutes);
  }, [ready, walk, transit, maxMinutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && ready) applyLayers(map, layers);
  }, [ready, layers]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>("workplace");
    if (ready && source)
      source.setData(pointsGeoJson([{ ...workplace, label: "" }]));
  }, [ready, workplace]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>("listings");
    if (ready && source) source.setData(pointsGeoJson(listings));
  }, [ready, listings]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>("selected");
    if (ready && source) source.setData(selectedGeoJson(area, selectedCell));
  }, [ready, area, selectedCell]);

  const { padding } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready) map.setPadding(padding);
  }, [ready, padding]);

  const { fly, reducedMotion } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fly) return;
    map.easeTo({
      center: [fly.lon, fly.lat],
      zoom: fly.zoom ?? Math.max(map.getZoom(), 14),
      duration: reducedMotion ? 0 : MOTION.cameraMs,
    });
  }, [fly, reducedMotion]);

  // The canvas carries a text summary; the Areas tab has the full detail.
  useEffect(() => {
    const canvas = ready ? mapRef.current?.getCanvas() : undefined;
    if (!canvas) return;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", props.label);
    canvas.style.cursor = props.picking ? "crosshair" : "";
  }, [ready, props.label, props.picking]);

  // MapLibre styles its container as position: relative, so it fills an
  // absolutely positioned host instead of being the host.
  return (
    <div className="map-host">
      <div ref={container} className="map-canvas" />
    </div>
  );
}
