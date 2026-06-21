import type { ClassificationFeature } from "@/api/types";
import type { CellDatum } from "@/lib/api/types";

function centroidOf(polygon: GeoJSON.Polygon): [number, number] {
  const ring = polygon.coordinates[0];
  let x = 0, y = 0;
  for (const [lng, lat] of ring) { x += lng; y += lat; }
  const n = ring.length || 1;
  return [x / n, y / n];
}

/** Map a backend classification Feature into the existing CellDatum shape so UI keeps working. */
export function featureToCell(f: ClassificationFeature): CellDatum {
  const p = f.properties;
  const confidences = p.confidences ?? ({ Residential: 0, Commercial: 0, Industrial: 0 } as Record<string, number>);
  const confidence = Math.max(...Object.values(confidences));
  return {
    id: p.cell_id,
    row: 0,
    col: 0,
    class: p.class,
    confidence,
    confidences: confidences as CellDatum["confidences"],
    top5_poi: p.top_poi ?? [],
    road_density: p.road_density ?? 0,
    node_count: p.node_count ?? 0,
    degree_centrality: p.degree_centrality ?? 0,
    clustering_coeff: p.clustering_coeff ?? 0,
    total_road_length_m: p.total_road_length_m ?? 0,
    graph_embedding_norm: p.graph_embedding_norm ?? 0,
    text_embedding_norm: p.text_embedding_norm ?? 0,
    satellite_thumb: p.satellite_thumb ?? "",
    geometry: f.geometry as CellDatum["geometry"],
    centroid: centroidOf(f.geometry),
  };
}