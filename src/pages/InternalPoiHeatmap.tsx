import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, Database, Layers, Hash, ZoomIn, Crosshair, MapPin, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInternalPoiHeatmap } from "@/hooks/api/useInternalPoiHeatmap";
import { useI18n } from "@/lib/i18n";
import { cairoBbox } from "@/lib/api/mockClient";
import type { InternalPoiHeatmapPoiProperties } from "@/api/types";

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm-bg", type: "raster", source: "osm" }],
};

export default function InternalPoiHeatmap() {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [zoom, setZoom] = useState(10.4);
  const [mouseCoords, setMouseCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [poiSearch, setPoiSearch] = useState("");
  const [cairoOnly, setCairoOnly] = useState(false);

  const { data, isLoading, isError } = useInternalPoiHeatmap();

  const metadata = data?.metadata;

  const pois = useMemo(() => data?.features ?? [], [data]);
  const isEmpty = !isLoading && !isError && pois.length === 0;

  const isInsideCairo = useCallback((coords: [number, number]) => {
    const [lng, lat] = coords;
    return (
      lat >= cairoBbox.south && lat <= cairoBbox.north &&
      lng >= cairoBbox.west && lng <= cairoBbox.east
    );
  }, []);

  const poiCairoFlags = useMemo(() => {
    const inside = new Set<string>();
    const outside = new Set<string>();
    pois.forEach((f) => {
      const coords = (f.geometry as GeoJSON.Point).coordinates;
      const key = f.properties.osm_id || `${coords[0]}_${coords[1]}`;
      if (isInsideCairo(coords as [number, number])) {
        inside.add(key);
      } else {
        outside.add(key);
      }
    });
    return { inside, outside };
  }, [pois, isInsideCairo]);

  const insideCount = poiCairoFlags.inside.size;
  const outsideCount = poiCairoFlags.outside.size;

  const categorySet = useMemo(() => {
    const cats = new Set<string>();
    pois.forEach((f) => cats.add(f.properties.category));
    return cats;
  }, [pois]);

  const filteredPois = useMemo(() => {
    let list = pois;
    if (cairoOnly) {
      list = list.filter((f) => {
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        return isInsideCairo(coords as [number, number]);
      });
    }
    if (poiSearch) {
      const q = poiSearch.toLowerCase();
      list = list.filter((f) => f.properties.name.toLowerCase().includes(q));
    }
    return list;
  }, [pois, cairoOnly, poiSearch, isInsideCairo]);

  const mapData = useMemo(() => {
    if (!data) return null;
    if (!cairoOnly) return data as unknown as GeoJSON.FeatureCollection;
    return {
      type: "FeatureCollection" as const,
      features: data.features.filter((f) => {
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        return isInsideCairo(coords as [number, number]);
      }),
    };
  }, [data, cairoOnly, isInsideCairo]);

  const flyToPoi = (coords: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: coords, zoom: 16, essential: true });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [(cairoBbox.east + cairoBbox.west) / 2, (cairoBbox.north + cairoBbox.south) / 2],
      zoom: 10.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("internal-poi-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "internal-poi-heatmap",
        type: "heatmap",
        source: "internal-poi-source",
        paint: {
          "heatmap-weight": [
            "case",
            ["has", "weight"],
            ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
            1,
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            8, 40,
            18, 5,
          ],
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            8, 1,
            18, 0.5,
          ],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(255,255,178,0)",
            0.25, "rgb(254,204,92)",
            0.5, "rgb(253,141,60)",
            0.75, "rgb(240,59,32)",
            1, "rgb(153,0,0)",
          ],
          "heatmap-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "internal-poi-circle",
        type: "circle",
        source: "internal-poi-source",
        paint: {
          "circle-radius": [
            "case",
            [">=", ["zoom"], 12],
            9,
            0,
          ],
          "circle-color": "#e63946",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });

      map.on("click", "internal-poi-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as unknown as InternalPoiHeatmapPoiProperties;
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        const html = `
          <div style="font-size:12px;line-height:1.6;color:#000;max-width:260px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${props.name}</div>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="opacity:.6;padding-right:8px;white-space:nowrap">Category</td><td style="font-family:monospace">${props.category}</td></tr>
              <tr><td style="opacity:.6;padding-right:8px;white-space:nowrap">Place Type</td><td style="font-family:monospace">${props.place_type}</td></tr>
              <tr><td style="opacity:.6;padding-right:8px;white-space:nowrap">OSM ID</td><td style="font-family:monospace">${props.osm_id}</td></tr>
              <tr><td style="opacity:.6;padding-right:8px;white-space:nowrap">Label</td><td style="font-family:monospace">${props.label}</td></tr>
              <tr><td style="opacity:.6;padding-right:8px;white-space:nowrap">Coords</td><td style="font-family:monospace">${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}</td></tr>
            </table>
          </div>
        `;
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "300px" })
          .setLngLat(coords as [number, number])
          .setHTML(html)
          .addTo(map);
        popupRef.current = popup;
      });

      map.on("mouseenter", "internal-poi-circle", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "internal-poi-circle", () => (map.getCanvas().style.cursor = ""));

      map.on("zoom", () => setZoom(map.getZoom()));
      map.on("mousemove", (e) => setMouseCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !mapData) return;
    const src = map.getSource("internal-poi-source") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(mapData);
    }
  }, [mapData]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-muted-foreground">Failed to load POI dataset.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> {t("back_to_dashboard")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="h-12 border-b border-border flex items-center px-3 gap-3 bg-card shrink-0">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> {t("back_to_dashboard")}</Link>
        </Button>
        <h1 className="text-sm font-semibold flex-1">POI Heatmap</h1>
        <span className="text-[10px] font-bold mono uppercase tracking-widest px-2 py-0.5 rounded bg-secondary text-muted-foreground">Internal</span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 relative">
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
              <p className="text-muted-foreground">No POIs were found in the dataset.</p>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />
        </main>

        <aside className="w-[260px] shrink-0 border-l border-border bg-card overflow-y-auto p-3 space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Statistics</h2>

          <Stat icon={<Database className="h-3.5 w-3.5" />} label="Total POIs" value={metadata?.total_pois?.toLocaleString() ?? pois.length.toLocaleString()} />
          <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Categories" value={metadata?.num_categories?.toLocaleString() ?? categorySet.size.toLocaleString()} />
          <Stat icon={<Hash className="h-3.5 w-3.5" />} label="Dataset Source" value={metadata?.dataset_source ?? "project.csv"} />
          <Stat icon={<ZoomIn className="h-3.5 w-3.5" />} label="Current Zoom" value={zoom.toFixed(1)} />

          {mouseCoords && (
            <Stat
              icon={<Crosshair className="h-3.5 w-3.5" />}
              label="Mouse Coords"
              value={`${mouseCoords.lat.toFixed(4)}, ${mouseCoords.lng.toFixed(4)}`}
              mono
            />
          )}

          <div className="pt-2 border-t border-border">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Legend</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(to right, rgb(254,204,92), rgb(253,141,60), rgb(240,59,32))" }} />
                <span className="text-muted-foreground">Density</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full border border-white bg-[#e63946]" />
                <span className="text-muted-foreground">Point (zoom &ge; 15)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filter</h3>
            <div className="flex items-center justify-between rounded border border-border bg-secondary/40 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Cairo bbox only</span>
              </div>
              <button
                onClick={() => setCairoOnly(!cairoOnly)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cairoOnly ? "bg-primary" : "bg-border"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${cairoOnly ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="rounded border border-border bg-secondary/40 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Inside</div>
                <div className="font-semibold mono">{insideCount.toLocaleString()}</div>
              </div>
              <div className="rounded border border-border bg-secondary/40 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outside</div>
                <div className="font-semibold mono">{outsideCount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex-1 flex flex-col min-h-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              POIs
              <span className="font-mono text-[10px] text-muted-foreground/60">({filteredPois.length})</span>
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search POIs…"
                value={poiSearch}
                onChange={(e) => setPoiSearch(e.target.value)}
                className="w-full h-7 rounded border border-border bg-secondary/40 pl-6 pr-2 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
              {filteredPois.map((f, i) => {
                const p = f.properties;
                const coords = (f.geometry as GeoJSON.Point).coordinates;
                return (
                  <button
                    key={p.osm_id || i}
                    onClick={() => flyToPoi(coords as [number, number])}
                    className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-secondary/60 transition-colors space-y-0.5"
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.category} · {p.place_type}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border border-border bg-secondary/40 px-2.5 py-2 space-y-0.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm font-semibold ${mono ? "mono" : ""}`}>{value}</div>
    </div>
  );
}
