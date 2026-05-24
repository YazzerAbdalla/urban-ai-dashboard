import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";
import { useDash } from "@/store/dashboardStore";
import { allCells, cairoBbox, getGraphTopology } from "@/lib/api/mockClient";
import { classHex, opacityFromConfidence } from "@/lib/colors";

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

  // FeatureCollection for current classified cells
  const cellsFC = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: cells.map((c) => ({
        type: "Feature" as const,
        id: c.id,
        properties: {
          id: c.id,
          class: c.class,
          confidence: c.confidence,
          fill: classHex[c.class],
          opacity: opacityFromConfidence(c.confidence),
        },
        geometry: c.geometry,
      })),
    };
  }, [cells]);

  // empty grid outline FC (always visible after load)
  const gridFC = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: allCells.map((c) => ({
        type: "Feature" as const,
        id: c.id,
        properties: { id: c.id },
        geometry: c.geometry,
      })),
    };
  }, []);

  // graph topology
  const graph = useMemo(() => {
    const g = getGraphTopology();
    return {
      nodes: {
        type: "FeatureCollection" as const,
        features: g.nodes.map((n) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
        })),
      },
      edges: {
        type: "FeatureCollection" as const,
        features: g.edges.map((e) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "LineString" as const, coordinates: e.coords },
        })),
      },
    };
  }, []);

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

      // Empty grid
      map.addSource("grid", { type: "geojson", data: gridFC });
      map.addLayer({
        id: "grid-outline",
        type: "line",
        source: "grid",
        paint: { "line-color": "#64748b", "line-width": 0.4, "line-opacity": 0.7 },
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
      map.addSource("graph-edges", { type: "geojson", data: graph.edges });
      map.addLayer({
        id: "graph-edges",
        type: "line",
        source: "graph-edges",
        paint: { "line-color": "#22d3ee", "line-width": 0.6, "line-opacity": 0.55 },
        layout: { visibility: "none" },
      });
      map.addSource("graph-nodes", { type: "geojson", data: graph.nodes });
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
    src?.setData(cellsFC as any);
  }, [cellsFC]);

  // Sync drawn-area source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("drawn") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: drawnGeometry
        ? [{ type: "Feature", properties: {}, geometry: drawnGeometry as any }]
        : [],
    } as any);
  }, [drawnGeometry]);

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
    map.setLayoutProperty("grid-outline", "visibility", loaded ? "visible" : "none");
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