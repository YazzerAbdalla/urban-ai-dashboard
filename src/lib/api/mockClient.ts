/**
 * Mock API client.
 *
 * Endpoints simulated:
 *  - POST /classify        → progressive batches via callback (replaces WebSocket)
 *  - GET  /graph-topology  → nodes + edges (sourced from `cairo.graphml` in production,
 *                            produced via `ox.save_graphml('cairo.graphml')` in Step 2 §Phase 3)
 *  - POST /evaluate        → accuracy / F1 / confusion matrix
 *
 * Swap this module for a real fetch-based client when the FastAPI backend is ready.
 */
import grid from "@/mocks/cairo-grid.json";
import graph from "@/mocks/cairo-graph.json";
import type { CellDatum, ClassifyRequest, EvaluateResponse, LoadingStep } from "./types";
import { poisForCell, type PoiPin } from "@/mocks/cairoPois";

export const cairoBbox = (grid as any).bbox as { north: number; south: number; east: number; west: number };
export const allCells = (grid as any).cells as CellDatum[];
export const graphTopology = graph as unknown as {
  nodes: { id: string; lng: number; lat: number }[];
  edges: { from: string; to: string; coords: [number, number][] }[];
};

// PARTIAL-4 startup assertion
(function validateBbox() {
  const { north, south, east, west } = cairoBbox;
  for (const c of allCells) {
    const [lng, lat] = c.centroid;
    if (lat < south || lat > north || lng < west || lng > east) {
      throw new Error(`[mock] Cell ${c.id} centroid out of Step 2 bbox`);
    }
  }
})();

type ProgressEvent = {
  type: "step" | "batch" | "done" | "cancelled";
  step?: LoadingStep;
  progress?: number;
  cells?: CellDatum[];
};

export class ClassifyJob {
  private listeners = new Set<(e: ProgressEvent) => void>();
  private timers: number[] = [];
  private cancelled = false;

  constructor(private req: ClassifyRequest) {}

  on(cb: (e: ProgressEvent) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(e: ProgressEvent) {
    this.listeners.forEach((l) => l(e));
  }

  start() {
    const steps: LoadingStep[] = ["downloading_poi", "mapping_poi_to_nodes", "building_graph", "classifying"];
    let t = 0;
    steps.forEach((step, i) => {
      this.timers.push(
        window.setTimeout(() => {
          if (this.cancelled) return;
          this.emit({ type: "step", step, progress: (i + 1) / steps.length });
        }, t)
      );
      t += 600;
    });

    const cells = [...allCells];
    const adjusted = cells.map((c) => {
      const boost = this.req.model_type === "gnn" ? Math.min(0.05, c.degree_centrality * 0.1) : 0;
      const conf = Math.min(0.99, c.confidence + boost);
      return { ...c, confidence: conf };
    });
    const batchSize = 18;
    let idx = 0;
    const tick = () => {
      if (this.cancelled) return;
      const batch = adjusted.slice(idx, idx + batchSize);
      idx += batchSize;
      this.emit({ type: "batch", cells: batch, progress: Math.min(1, idx / adjusted.length) });
      if (idx < adjusted.length) {
        this.timers.push(window.setTimeout(tick, 220));
      } else {
        this.emit({ type: "done" });
      }
    };
    this.timers.push(window.setTimeout(tick, t + 200));
  }

  cancel() {
    this.cancelled = true;
    this.timers.forEach((id) => clearTimeout(id));
    this.emit({ type: "cancelled" });
  }
}

/** POST /classify — returns a job handle */
export function classify(req: ClassifyRequest): ClassifyJob {
  return new ClassifyJob(req);
}

/** Ray-casting point-in-polygon test for a single linear ring [[lng,lat],...]. */
export function pointInPolygon(pt: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Filter cells whose centroid falls inside a drawn polygon. */
export function cellsInGeometry(geom: { coordinates: number[][][] } | null): CellDatum[] {
  if (!geom) return allCells;
  const ring = geom.coordinates[0];
  return allCells.filter((c) => pointInPolygon(c.centroid, ring));
}

/** GET /api/v1/grid/{grid_id}/details — mock implementation */
export async function getCellDetails(gridId: string): Promise<{
  cell: CellDatum;
  pois: PoiPin[];
} | null> {
  await new Promise((r) => setTimeout(r, 120));
  const cell = allCells.find((c) => c.id === gridId);
  if (!cell) return null;
  return { cell, pois: poisForCell(cell) };
}

/** GET /graph-topology — nodes + edges from Cairo OSMnx graph (mock of cairo.graphml) */
export function getGraphTopology() {
  return graphTopology;
}

/** POST /evaluate — synthetic ground-truth evaluation */
export async function evaluate(_groundTruthFile: File | null): Promise<EvaluateResponse> {
  await new Promise((r) => setTimeout(r, 500));
  return {
    accuracy: 0.842,
    macro_f1: 0.781,
    weighted_f1: 0.831,
    spatial_accuracy: 0.793,
    per_class_f1: { Residential: 0.85, Commercial: 0.74, Industrial: 0.69 },
    confusion_matrix: [
      [82, 8, 2],
      [5, 44, 6],
      [3, 4, 26],
    ],
    class_labels: ["Residential", "Commercial", "Industrial"],
  };
}

export function estimateCells(bbox: { north: number; south: number; east: number; west: number }, gridSizeM: number) {
  const latM = (bbox.north - bbox.south) * 111_000;
  const lngM = (bbox.east - bbox.west) * 111_000 * Math.cos(((bbox.north + bbox.south) / 2) * Math.PI / 180);
  return Math.max(0, Math.ceil(latM / gridSizeM) * Math.ceil(lngM / gridSizeM));
}