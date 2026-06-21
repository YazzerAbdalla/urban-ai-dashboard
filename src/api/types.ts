import type { FusionMethod, LandUseClass, LoadingStep, Modality, ModelType } from "@/lib/api/types";

export type { FusionMethod, LandUseClass, LoadingStep, Modality, ModelType };

export type JobStatus =
  | "queued"
  | "loading"
  | "running"
  | "processing"
  | "done"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobId { job_id: string }

export interface LoadAreaRequest {
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  place_name?: string;
}

export interface AreaStatusResponse {
  status: JobStatus;
  step?: LoadingStep | string;
  progress?: number;
  message?: string;
}

export interface ClassifyRequestBody {
  grid_id: string;
  cell_size: number;
  modalities: Modality[];
  model_type?: ModelType;
  fusion_method?: FusionMethod;
  area_geometry?: { type: "Polygon"; coordinates: number[][][] } | null;
}

export interface ClassificationFeatureProps {
  cell_id: string;
  class: LandUseClass;
  confidences: Record<LandUseClass, number>;
  road_density?: number;
  node_count?: number;
  top_poi?: string[];
  graph_embedding_norm?: number;
  text_embedding_norm?: number;
  degree_centrality?: number;
  clustering_coeff?: number;
  total_road_length_m?: number;
  satellite_thumb?: string;
}

export type ClassificationFeature = GeoJSON.Feature<GeoJSON.Polygon, ClassificationFeatureProps>;
export type ClassificationResult = GeoJSON.FeatureCollection<GeoJSON.Polygon, ClassificationFeatureProps>;

export interface EvaluateResponse {
  overall_accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  spatial_accuracy: number;
  per_class_f1: Record<LandUseClass, number>;
  confusion_matrix: number[][];
  class_labels?: LandUseClass[];
}

export interface CancelResponse {
  status: "cancelled";
  job_id: string;
}

export type ExportFormat = "geojson" | "csv" | "shapefile";

export const TERMINAL_STATUSES: JobStatus[] = ["done", "completed", "failed", "cancelled"];
export const isTerminal = (s?: JobStatus | string): boolean =>
  !!s && (TERMINAL_STATUSES as string[]).includes(s);
export const isSuccess = (s?: JobStatus | string): boolean =>
  s === "done" || s === "completed";