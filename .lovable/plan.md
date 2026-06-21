# Backend Integration Plan

Migrate the dashboard from local mocks to the live FastAPI backend. UI/UX unchanged.

## 1. Dependencies & config

- `bun add axios @tanstack/react-query`
- Wrap app in `QueryClientProvider` in `src/App.tsx`
- Add `.env.example` with `VITE_API_URL=http://localhost:8000`
- Add `VITE_WS_URL` (derived if missing: replace http→ws on `VITE_API_URL`)

## 2. New API layer (`src/api/`)

```text
src/api/
  client.ts          # axios instance, interceptors (404/413/415/500/501 -> typed errors + toast)
  types.ts           # request/response interfaces for all 10 endpoints
  loadArea.ts        # POST /api/v1/load-area
  areaStatus.ts      # GET  /api/v1/area-status/{job_id}
  classify.ts        # POST /api/v1/classify
  classificationResult.ts  # GET /api/v1/classification-result/{job_id}
  graphTopology.ts   # GET /api/v1/grid/{grid_id}/graph-topology
  evaluate.ts        # POST /api/v1/evaluate (multipart) + GET export
  exportJob.ts       # GET /api/v1/export/{job_id}?format=
  cancelJob.ts       # DELETE /api/v1/jobs/{job_id}
```

## 3. React Query hooks (`src/hooks/api/`)

- `useLoadArea()` — mutation → returns `jobId`
- `useAreaStatus(jobId)` — query, `refetchInterval: 2000`, stops when status === `done`/`failed`/`cancelled`
- `useJobProgress(jobId)` — WebSocket hook to `ws://…/api/v1/ws/progress/{job_id}`; on disconnect or error, falls back to `useAreaStatus`
- `useClassify()` — mutation → returns `jobId`, primes `useJobProgress`
- `useClassificationResult(jobId)` — query, enabled when job done; returns `FeatureCollection`
- `useGraphTopology(gridId, {maxNodes, simplify})`
- `useEvaluate()` — mutation, multipart `FormData`
- `useEvaluationExport(jobId)` — returns download URL
- `useCancelJob()` — mutation; invalidates job queries
- `useExport(jobId, format)` — opens blob download

All hooks return `{ data, isLoading, isError, error }`; errors surface via shadcn `useToast`.

## 4. Component wiring (no UI redesign)

| Component | Change |
|---|---|
| `src/pages/Index.tsx` | Replace `setTimeout` load + mock `classify()` with `useLoadArea` → `useJobProgress` → `useClassify` → `useClassificationResult` |
| `src/components/dashboard/Sidebar.tsx` | "Load area" calls `useLoadArea`; "Classify" calls `useClassify`; "Cancel" calls `useCancelJob` (hidden if no active job) |
| `src/components/dashboard/MapView.tsx` | Consume real `FeatureCollection` from `useClassificationResult`; graph layer from `useGraphTopology`; keep existing MapLibre source/layer code (data shape mapped in adapter) |
| `src/components/dashboard/LoadingOverlay.tsx` | Read step/progress from `useJobProgress` (WS) with polling fallback |
| `src/components/dashboard/StatusBar.tsx` | Counts derived from real features |
| `src/components/dashboard/CellDetailPanel.tsx` | Reads from `feature.properties` (cell_id, confidences, top_poi, road_density, node_count, embedding norms) |
| `src/components/dashboard/EvaluationPanel.tsx` | `useEvaluate` mutation with file upload; render real metrics + 3×3 matrix; CSV export button → `useEvaluationExport` |
| `src/pages/GridDetails.tsx` | Switch route param to backend `cell_id`; show "Detail endpoint coming soon" banner until backend exposes per-cell route |

## 5. Store changes (`src/store/dashboardStore.ts`)

- Replace `cells: CellDatum[]` with `featureCollection: GeoJSON.FeatureCollection | null`
- Add `loadJobId`, `classifyJobId`, `jobStatus`, `jobStep`, `jobProgress`
- Remove progressive `appendCells`, `classifyProgress` simulation
- Selection uses `cell_id` from feature properties

## 6. Feature flags for not-yet-built endpoints

`src/config/features.ts`:
```ts
export const FEATURES = {
  mllmTrain: false,    // POST /api/v1/mllm/train
  digitalTwin: false,  // POST /api/v1/query
};
```
Stub pages (`MllmBuilder`, `DigitalTwin`, `TrainingLab`, `Ablation`) keep "Coming Soon" — no API calls. Interceptor maps 501 → "Coming Soon" toast.

## 7. Error handling (axios interceptor)

| Status | UX |
|---|---|
| 404 | toast "Resource not found" |
| 413 | toast "File too large" (evaluation CSV) |
| 415 | toast "Unsupported file type" |
| 500 | toast "Server error — try again" |
| 501 | toast "Feature coming soon" |
| network | toast + retry button on relevant panel |

## 8. Removals

Delete after migration compiles cleanly:
- `src/mocks/cairo-grid.json`
- `src/mocks/cairo-graph.json`
- `src/mocks/cairoPois.ts`
- `src/lib/api/mockClient.ts`
- `src/lib/api/types.ts` (replaced by `src/api/types.ts`)

Keep Step-2 bbox constant in `src/config/area.ts` (used as default `bbox` payload for `/load-area`).

## 9. Verification

- `bun run build` passes typecheck
- Manual smoke via preview: load Cairo → progress bar advances via WS → classify → cells render → click cell → details panel shows real props → upload GT CSV → metrics render → export downloads file → cancel mid-job clears UI
- Network tab confirms no requests to mock paths; all hits go to `VITE_API_URL`

## 10. Out of scope

- No visual redesign
- No backend changes
- No auth (add later if backend requires)
- GridDetails per-cell page stays as placeholder until backend ships the endpoint
