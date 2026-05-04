# Urban AI Dashboard — Implementation Plan v1.1

> Revised from MVP v1 incorporating alignment report against Step 2 objectives.
> All gaps (GAP-1–4), partials (PARTIAL-1–5), and recommendations (REC-1–3) from the alignment report are addressed inline.

---

## Summary

| Status | Count |
|---|---|
| Tasks total | 23 |
| Gaps resolved | 4 |
| Partials resolved | 5 |
| Recommendations applied | 3 |

**Priority legend:** `P1` = blocking · `P2` = important UX · `P3` = alignment fix · `P4` = academic polish

---

## Phase 0 — Project Scaffolding

> Set up routing, mock layer, design tokens, and i18n dictionary before any feature work. Everything else depends on this.

### T-01 · P1 · Vite + React bootstrap

Init project with:

- `maplibre-gl`, `@mapbox/mapbox-gl-draw`
- `recharts`, `react-router-dom`
- `@tanstack/react-query`, `zustand`

Configure Tailwind with HSL design tokens in `index.css`. Add stub routes: `/`, `/mllm-builder`, `/digital-twin`, `/training-lab`, `/ablation`.

---

### T-02 · P1 · Mock API layer — `src/lib/api/`

Thin module returning Promises + `EventEmitter` for WebSocket-style classify progress.

**Endpoints to mock:**

| Endpoint | Purpose |
|---|---|
| `POST /classify` | Returns progressive cell batches via EventEmitter |
| `GET /graph-topology` | Returns nodes + edges for Cairo graph |
| `POST /evaluate` | Returns metrics + confusion matrix |

> **GAP-4 fix:** Document in code comments that `GET /graph-topology` is sourced from a preloaded `cairo.graphml`, matching the `ox.save_graphml("cairo.graphml")` step in Step 2 §Phase 3.

---

### T-03 · P1 · Cairo mock dataset — `cairo-grid.json`

~144 cells strictly within the Step 2 study area bbox:

```
north=30.10  south=29.90  east=31.30  west=31.10
```

Grid: EPSG:32636, 500m default. Each cell object must include:

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `"CAI-0042"` |
| `class` | string | Residential / Commercial / Industrial |
| `confidence` | float | Range 0.51–0.97 |
| `confidences` | object | Per-class scores summing to 1 |
| `top5_poi` | array | Top 5 POI names |
| `road_density` | float | Roads per km² |
| `node_count` | int | OSMnx graph nodes in cell |
| `degree_centrality` | float | **GAP-1 fix** |
| `clustering_coeff` | float | **GAP-1 fix** |
| `total_road_length_m` | float | **GAP-1 + REC-2 fix** |
| `graph_embedding_norm` | float | L2 norm of 32-dim graph vector |
| `text_embedding_norm` | float | L2 norm of 64-dim text vector |
| `satellite_thumb` | string | URL or base64 thumbnail |
| `geometry` | GeoJSON | Cell polygon, WGS84 |

> **PARTIAL-4 fix:** Coordinates must fall inside the Step 2 bbox above — do not use arbitrary Cairo extents.

---

### T-04 · P1 · i18n dictionary — `useI18n` hook

In-house dictionary, no external dep. Must cover all sidebar and panel strings in both EN and AR. New keys required by alignment fixes:

- `"Cell Story (POI semantic vector)"` — REC-3
- `"Graph metrics"` — REC-2
- `"mapping_poi_to_nodes"` — REC-1
- `"Projection: EPSG:32636 (metric)"` — PARTIAL-5

RTL auto-flip: toggle sets `dir="rtl"` and `lang="ar"` on `<html>`.

---

## Phase 1 — Layout & Map Shell

### T-05 · P1 · GIS layout shell

Single-screen layout:

```
┌─ Top bar (logo, lang toggle, MOCK MODE banner) ──────────┐
├─ Left sidebar ──┬─ MapLibre center ──┬─ Right panel ─────┤
│ (controls)      │ (map fills space)  │ (hidden until      │
│                 │                    │  classify done)    │
├─────────────────┴────────────────────┴────────────────────┤
│ Bottom status bar (histogram)                             │
└───────────────────────────────────────────────────────────┘
```

- Amber `MOCK MODE` banner always visible in top bar
- Right panel starts hidden; appears after first classify run
- Layer state synced to URL query string (FR-32–33)

---

### T-06 · P1 · MapLibre GL map

- OSM raster tiles as default basemap
- Esri World Imagery for satellite layer (no token required)
- Bbox draw tool bound to key `D` via `@mapbox/mapbox-gl-draw`
- Nominatim geocoding search (`https://nominatim.openstreetmap.org/search`) with proper `User-Agent` header
- On search for "Cairo": auto-fill bbox to Step 2 study area coords

> **PARTIAL-5 display note:** Show `"Projection: EPSG:32636 (metric)"` label in the grid config section of the sidebar so students see the transformation is happening.

---

### T-07 · P1 · Stub pages

Four routes render a "Coming in v2" placeholder with nav links back to `/`:

- `/mllm-builder`
- `/digital-twin`
- `/training-lab`
- `/ablation`

---

## Phase 2 — Left Sidebar Controls

### T-08 · P1 · Area selection & cell-count estimate (FR-01–05)

- Bbox draw + Nominatim search
- Cell-count estimate displayed before submit
  - Amber warning: `> 300 cells`
  - Red block: `> 500 cells`
- Loading overlay with step labels cycling in order:

```
downloading_poi → mapping_poi_to_nodes → building_graph → classifying
```

> **GAP-2 + REC-1 fix:** `mapping_poi_to_nodes` added as an explicit loading step label, surfacing Step 2 §Phase 3 step 9 (nearest-node POI mapping) to the student.

---

### T-09 · P1 · Grid size radio (FR-06–08)

Radio group: `200m` / `500m` (default) / `1km`. Empty cell outlines render after load. Graph topology toggle layer (nodes + edges from mock API).

---

### T-10 · P1 · Modality checkboxes (FR-09–12)

Four independent checkboxes:

| Modality | Embedding dims | Notes |
|---|---|---|
| POI | 64 | paraphrase-multilingual-MiniLM-L12-v2 |
| Image | 64 | Sentinel-2 / GEE per Step 2 §5 |
| Graph | 32 | OSMnx per Step 2 §3 |
| Text | 64 | Optional per Step 2 §6 |

- At least one modality required to enable Classify button
- Ablation preset dropdown (POI only → POI+Image → +Graph → +Text per Step 2 recommendation)
- Note in UI/docs: full ablation comparison view deferred to `/ablation` in v2

---

### T-11 · P1 · Model selector (FR-13–16)

Toggle: `MLP` (default) / `GNN`.

- Selecting GNN: auto-enables + locks Graph checkbox, auto-shows graph topology layer
- `fusion_method` field exposed in classify request body: `concat` / `weighted` / `attention`

---

## Phase 3 — Classification Engine

### T-12 · P1 · Classify execution (FR-17–25)

- Classify button (`C`) triggers mock job via EventEmitter progressive batches
- Cells animate in with opacity `= 0.35 + confidence × 0.60`
- Class colors:
  - Residential `#FFD966`
  - Commercial `#E63946`
  - Industrial `#9B5DE5`
- Cancel button aborts EventEmitter stream
- Live distribution histogram updates in bottom status bar as batches arrive

---

### T-13 · P1 · Cell detail panel (FR-17–25)

Opens on cell click in right panel. Required fields:

**Header**
- Cell ID (monospace)
- Dominant class label + color swatch

**Confidence**
- Three confidence bars (one per class)

**Cell Story — POI semantic vector** *(REC-3 fix)*
- Section header: `"Cell Story (POI semantic vector)"`
- Subtitle: `"384-dim MLLM embedding (aggregated)"`
- Top-5 POI list

**Graph metrics** *(GAP-1 + REC-2 fix)*
- `degree_centrality`
- `clustering_coeff`
- `total_road_length_m`
- `node_count`
- `road_density`

**Imagery**
- Satellite thumbnail

**Embeddings**
- `graph_embedding_norm` (L2 scalar, 32-dim)
- `text_embedding_norm` (L2 scalar, 64-dim)

> **PARTIAL-2 note:** Full 224-dim vector breakdown (POI 64 + Image 64 + Graph 32 + Text 64) shown as a tooltip or expandable row for academic value.

Pin up to 3 cells for side-by-side comparison.

---

## Phase 4 — Evaluation Panel

### T-14 · P2 · Evaluation tab (FR-26–31)

Tab appears after classify (keyboard `E`).

**Without ground truth:**
- Dominant-class distribution chart
- Average confidence
- Confidence histogram (Recharts)

**With ground truth (CSV or GeoJSON upload):**

Mock returns:
- Accuracy
- Per-class F1
- Macro F1 + Weighted F1
- Spatial Accuracy

3×3 color-coded confusion matrix (SVG via Recharts).

---

## Phase 5 — Layer Controls & URL Persistence

### T-15 · P2 · Layer toggles (FR-32–33)

Toggle switches for:

- Classification overlay
- POI heatmap
- Roads
- Graph topology
- Satellite basemap

All toggle states serialized to URL query string; restore on page reload.

---

## Phase 6 — Alignment Fixes (Gaps & Partials)

> These tasks exist purely to close issues identified in the alignment report.

### T-16 · P3 · GAP-1 — Graph metrics in cell detail panel

Add `degree_centrality`, `clustering_coeff`, `total_road_length_m` to the cell detail panel under a "Graph metrics" section header. Values come from `cairo-grid.json` (added in T-03).

---

### T-17 · P3 · GAP-2 — Loading step "mapping_poi_to_nodes"

Add `mapping_poi_to_nodes` as the second step in the loading overlay sequence (already specified in T-08). Confirm Arabic translation key is present in i18n dictionary (T-04).

---

### T-18 · P3 · GAP-3 — Cell Story badge in detail panel

In the cell detail panel POI section, replace generic "POI" header with:

```
Cell Story (POI semantic vector)
384-dim MLLM embedding (aggregated)
```

Tooltip or info icon explains: embeddings from `paraphrase-multilingual-MiniLM-L12-v2` were mean-pooled across all POI in the cell to produce a single 384-dim semantic fingerprint.

---

### T-19 · P3 · GAP-4 — GraphML reference in mock API docs

In `src/lib/api/README.md` (or inline JSDoc on the `/graph-topology` handler), document:

> "This endpoint simulates loading from `cairo.graphml`, produced by `ox.save_graphml('cairo.graphml')` in Step 2 §Phase 3. In production, swap to a FastAPI endpoint that reads this file."

---

### T-20 · P3 · PARTIAL-4 — Cairo bbox validation

Add a unit test or startup assertion that all cells in `cairo-grid.json` have centroid coordinates within:

```
29.90 ≤ lat ≤ 30.10
31.10 ≤ lng ≤ 31.30
```

Fail loudly in dev if any cell is out of bounds.

---

### T-21 · P3 · PARTIAL-5 — CRS display in sidebar

Below the Grid size radio, add a static info line:

```
Projection: EPSG:32636 (metric)
```

This makes the WGS84 → EPSG:32636 transformation visible to students even though it is backend-only.

---

## Phase 7 — Polish & Keyboard Shortcuts

### T-22 · P2 · Keyboard shortcuts (US-16)

| Key | Action |
|---|---|
| `D` | Activate bbox draw tool |
| `C` | Trigger Classify |
| `E` | Switch to Evaluation tab |
| `Esc` | Cancel classify / close detail panel |

---

### T-23 · P2 · Accessibility & responsive baseline

- All interactive elements keyboard-reachable
- Map controls have ARIA labels
- RTL layout tested at 1280px, 1440px, 1920px widths
- Monospace font for IDs and metrics throughout

---

## Deferred to v2

- Real ML classification
- Real WebSockets
- Export (CSV, GeoJSON, PNG)
- MLLM training flow (`/mllm-builder`)
- Digital Twin NL query execution (`/digital-twin`)
- Full ablation comparison runs (`/ablation`)
- Training lab fine-tune flow (`/training-lab`)
- Full 224-dim feature vector breakdown UI (PARTIAL-2 — tooltip only in v1)
- Full graph topology detail view (PARTIAL-1 — aggregate metrics only in v1)

---

## Acceptance Checklist (v1)

- [ ] User draws bbox or searches "Cairo" → auto-fills Step 2 study area coordinates
- [ ] Cell-count estimate shows amber/red warnings at 300/500
- [ ] Loading overlay cycles: `downloading_poi` → `mapping_poi_to_nodes` → `building_graph` → `classifying`
- [ ] Empty grid renders at 500m default after load
- [ ] Checking POI + Graph + selecting GNN → Graph locks, topology layer appears
- [ ] Classify → cells progressively colorize with confidence-based opacity
- [ ] Cell click opens detail panel with: class, confidence bars, Cell Story POI section, Graph metrics section, satellite thumb, embedding norms
- [ ] Evaluation tab shows distribution; GT CSV upload reveals metrics + confusion matrix
- [ ] Language toggle switches whole UI to Arabic RTL
- [ ] Layer toggles persist on reload via URL query string
- [ ] All 4 stub pages reachable from nav menu with "Coming in v2" placeholder
- [ ] Sidebar shows `"Projection: EPSG:32636 (metric)"` label
- [ ] Cairo grid cells fall within Step 2 bbox (validated by assertion)
- [ ] Mock API code references `cairo.graphml` in comments