import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";
import { useDash } from "@/store/dashboardStore";
import { cairoBbox } from "@/lib/api/mockClient";
import { useGraphTopology } from "@/hooks/api/useGraphTopology";
import { classHex, opacityFromConfidence } from "@/lib/colors";
import { createSmallDefaultArea } from "@/lib/geoUtils";

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
    sat: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-bg", type: "raster", source: "osm" },
    { id: "sat-bg", type: "raster", source: "sat", layout: { visibility: "none" } },
  ],
};

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navigate = useNavigate();

  const cells = useDash((s) => s.cells);
  const layers = useDash((s) => s.layers);
  const loaded = useDash((s) => s.loaded);
  const selectedCellId = useDash((s) => s.selectedCellId);
  const setSelectedCellId = useDash((s) => s.setSelectedCellId);
  const drawnGeometry = useDash((s) => s.drawnGeometry);
  const setDrawnGeometry = useDash((s) => s.setDrawnGeometry);
  const drawMode = useDash((s) => s.drawMode);
  const setDrawMode = useDash((s) => s.setDrawMode);
  const searchLocation = useDash((s) => s.searchLocation);
  const gridId = useDash((s) => s.gridId);
  const graphQ = useGraphTopology(gridId, { enabled: !!gridId && layers.graph });

  // FeatureCollection for current classified cells
  const cellsFC = useMemo(() => {
    const features = cells.map((c) => {
      const fill = classHex[c.class as keyof typeof classHex] || classHex.Residential;
      const opacity = opacityFromConfidence(c.confidence);
      return {
        type: "Feature" as const,
        id: c.id,
        properties: { id: c.id, class: c.class, confidence: c.confidence, fill, opacity },
        geometry: c.geometry,
      };
    });
    if (import.meta.env.DEV) {
      console.log("[MapView] cellsFC features:", features.length);
      features.forEach((f) => console.log("  id:", f.id, "class:", f.properties.class, "fill:", f.properties.fill));
    }
    return { type: "FeatureCollection" as const, features };
  }, [cells]);

  // Split backend graph-topology FeatureCollection into nodes + edges
  const graphSplit = useMemo(() => {
    const empty = { type: "FeatureCollection" as const, features: [] };
    const fc = graphQ.data;
    if (!fc) return { nodes: empty, edges: empty };
    const nodes: any = { type: "FeatureCollection", features: [] };
    const edges: any = { type: "FeatureCollection", features: [] };
    for (const f of fc.features as any[]) {
      const t = f.geometry?.type;
      if (t === "Point") nodes.features.push(f);
      else if (t === "LineString" || t === "MultiLineString") edges.features.push(f);
    }
    return { nodes, edges };
  }, [graphQ.data]);

  // Init map
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
      // BBox outline
      map.addSource("bbox", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [cairoBbox.west, cairoBbox.south],
              [cairoBbox.east, cairoBbox.south],
              [cairoBbox.east, cairoBbox.north],
              [cairoBbox.west, cairoBbox.north],
              [cairoBbox.west, cairoBbox.south],
            ],
          },
        },
      });
      map.addLayer({
        id: "bbox-line",
        type: "line",
        source: "bbox",
        paint: { "line-color": "#22d3ee", "line-width": 1.5, "line-dasharray": [3, 2] },
      });

      // Classified cells
      map.addSource("cells", { type: "geojson", data: cellsFC });
      map.addLayer({
        id: "cells-fill",
        type: "fill",
        source: "cells",
        paint: {
          "fill-color": ["get", "fill"],
          "fill-opacity": ["get", "opacity"],
        },
      });
      map.addLayer({
        id: "cells-stroke",
        type: "line",
        source: "cells",
        paint: {
          "line-color": "#0f172a",
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.5, 0.4],
        },
      });

      // Graph topology
      map.addSource("graph-edges", { type: "geojson", data: graphSplit.edges });
      map.addLayer({
        id: "graph-edges",
        type: "line",
        source: "graph-edges",
        paint: { "line-color": "#22d3ee", "line-width": 0.6, "line-opacity": 0.55 },
        layout: { visibility: "none" },
      });
      map.addSource("graph-nodes", { type: "geojson", data: graphSplit.nodes });
      map.addLayer({
        id: "graph-nodes",
        type: "circle",
        source: "graph-nodes",
        paint: {
          "circle-radius": 1.6,
          "circle-color": "#22d3ee",
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 0.4,
        },
        layout: { visibility: "none" },
      });

      // Drawn custom area
      map.addSource("drawn", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "drawn-fill",
        type: "fill",
        source: "drawn",
        paint: { "fill-color": "#22d3ee", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "drawn-line",
        type: "line",
        source: "drawn",
        paint: { "line-color": "#22d3ee", "line-width": 2 },
      });

      // Click handler
      map.on("click", "cells-fill", (e) => {
        if (useDash.getState().drawMode) return;
        const f = e.features?.[0];
        if (f) {
          const id = f.properties?.id as string;
          setSelectedCellId(id);
          // double-click navigates to details page
        }
      });
      map.on("dblclick", "cells-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        e.preventDefault();
        navigate(`/grid/${f.properties?.id}/details`);
      });
      map.on("mouseenter", "cells-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "cells-fill", () => (map.getCanvas().style.cursor = ""));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update cell data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("cells") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(cellsFC as any);
      if (import.meta.env.DEV) {
        console.log("[MapView] setData on 'cells' source — features:", cellsFC.features.length);
        // Log first feature's properties to verify fill value
        if (cellsFC.features.length > 0) {
          console.log("  first feature props:", cellsFC.features[0].properties);
        }
      }
    }
  }, [cellsFC]);

  // Update graph data when backend returns it
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource("graph-edges") as maplibregl.GeoJSONSource | undefined)?.setData(graphSplit.edges as any);
    (map.getSource("graph-nodes") as maplibregl.GeoJSONSource | undefined)?.setData(graphSplit.nodes as any);
  }, [graphSplit]);

  // Compute active preview geometry (priority: drawnGeometry, fallback: searchLocation default area)
  const displayGeometry = useMemo(() => {
    if (drawnGeometry) return drawnGeometry;
    if (searchLocation) return createSmallDefaultArea(searchLocation.lng, searchLocation.lat);
    return null;
  }, [drawnGeometry, searchLocation]);

  // Sync drawn-area source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("drawn") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: displayGeometry
        ? [{ type: "Feature", properties: {}, geometry: displayGeometry as any }]
        : [],
    } as any);
  }, [displayGeometry]);

  // Center and zoom map when searchLocation changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchLocation) return;
    map.flyTo({
      center: [searchLocation.lng, searchLocation.lat],
      zoom: 13,
      essential: true
    });
  }, [searchLocation]);

  // Rectangle drawing mode (native MapLibre, no extra deps)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (!drawMode) {
      canvas.style.cursor = "";
      return;
    }
    canvas.style.cursor = "crosshair";
    map.dragPan.disable();
    map.boxZoom.disable();

    let start: maplibregl.LngLat | null = null;

    const onDown = (e: maplibregl.MapMouseEvent) => {
      start = e.lngLat;
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!start) return;
      const ring = rectRing(start, e.lngLat);
      const src = map.getSource("drawn") as maplibregl.GeoJSONSource | undefined;
      src?.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature", properties: {},
          geometry: { type: "Polygon", coordinates: [ring] },
        }],
      } as any);
    };
    const onUp = (e: maplibregl.MapMouseEvent) => {
      if (!start) return;
      const ring = rectRing(start, e.lngLat);
      setDrawnGeometry({ type: "Polygon", coordinates: [ring] });
      setDrawMode(false);
      map.dragPan.enable();
      map.boxZoom.enable();
      start = null;
    };
    map.on("mousedown", onDown);
    map.on("mousemove", onMove);
    map.on("mouseup", onUp);
    return () => {
      map.off("mousedown", onDown);
      map.off("mousemove", onMove);
      map.off("mouseup", onUp);
      map.dragPan.enable();
      map.boxZoom.enable();
    };
  }, [drawMode, setDrawnGeometry, setDrawMode]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setLayoutProperty("cells-fill", "visibility", layers.classification ? "visible" : "none");
    map.setLayoutProperty("cells-stroke", "visibility", layers.classification ? "visible" : "none");
    map.setLayoutProperty("graph-edges", "visibility", layers.graph ? "visible" : "none");
    map.setLayoutProperty("graph-nodes", "visibility", layers.graph ? "visible" : "none");
    map.setLayoutProperty("sat-bg", "visibility", layers.satellite ? "visible" : "none");
    map.setLayoutProperty("osm-bg", "visibility", layers.satellite ? "none" : "visible");
  }, [layers, loaded]);

  // Selection feature-state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    cellsFC.features.forEach((f) => {
      map.setFeatureState({ source: "cells", id: f.id as string }, { selected: f.id === selectedCellId });
    });
  }, [selectedCellId, cellsFC]);

  return <div ref={containerRef} className="absolute inset-0" aria-label="Map" />;
}

function rectRing(a: maplibregl.LngLat, b: maplibregl.LngLat): number[][] {
  const w = Math.min(a.lng, b.lng), e = Math.max(a.lng, b.lng);
  const s = Math.min(a.lat, b.lat), n = Math.max(a.lat, b.lat);
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}