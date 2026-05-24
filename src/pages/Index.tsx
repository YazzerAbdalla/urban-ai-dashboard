import { useCallback, useRef } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MapView } from "@/components/dashboard/MapView";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { LoadingOverlay } from "@/components/dashboard/LoadingOverlay";
import { useDash } from "@/store/dashboardStore";
import { classify, ClassifyJob } from "@/lib/api/mockClient";
import { useUrlLayers } from "@/hooks/useUrlLayers";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Modality } from "@/lib/api/types";

const Index = () => {
  useUrlLayers();
  const jobRef = useRef<ClassifyJob | null>(null);

  const {
    setLoaded, setLoadingStep, setClassifying, setClassifyProgress,
    appendCells, resetCells, modalities, modelType, fusion, setActiveTab,
  } = useDash();

  const handleLoadArea = useCallback(() => {
    if (useDash.getState().loaded) return;
    setLoadingStep("downloading_poi");
    let i = 0;
    const steps = ["downloading_poi", "mapping_poi_to_nodes", "building_graph"] as const;
    const tick = () => {
      i++;
      if (i < steps.length) {
        setLoadingStep(steps[i]);
        setTimeout(tick, 700);
      } else {
        setLoadingStep(null);
        setLoaded(true);
      }
    };
    setTimeout(tick, 700);
  }, [setLoaded, setLoadingStep]);

  const handleClassify = useCallback(() => {
    const state = useDash.getState();
    if (!state.loaded || state.classifying) return;
    const mods = (Object.keys(state.modalities) as Modality[]).filter((k) => state.modalities[k]);
    if (mods.length === 0) return;
    resetCells();
    setClassifying(true);
    setLoadingStep("classifying");
    const job = classify({
      grid_id: "cairo",
      modalities: mods,
      model_type: modelType,
      fusion_method: fusion,
      area_geometry: state.drawnGeometry,
    });
    jobRef.current = job;
    job.on((e) => {
      if (e.type === "step" && e.step === "classifying") {
        setLoadingStep(null);
      }
      if (e.type === "batch" && e.cells) {
        appendCells(e.cells);
        if (typeof e.progress === "number") setClassifyProgress(e.progress);
      }
      if (e.type === "done" || e.type === "cancelled") {
        setClassifying(false);
        setLoadingStep(null);
        jobRef.current = null;
      }
    });
    job.start();
  }, [appendCells, fusion, modelType, resetCells, setClassifying, setClassifyProgress, setLoadingStep]);

  const handleCancel = useCallback(() => {
    jobRef.current?.cancel();
  }, []);

  useKeyboardShortcuts({
    onDraw: handleLoadArea,
    onClassify: handleClassify,
    onEvaluation: () => setActiveTab("evaluation"),
    onCancel: handleCancel,
  });

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onLoadArea={handleLoadArea} onClassify={handleClassify} onCancel={handleCancel} />
        <main className="flex-1 relative">
          <MapView />
          <LoadingOverlay />
          <MapLegend />
        </main>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
};

function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 bg-card/95 backdrop-blur border border-border rounded-md px-3 py-2 text-xs space-y-1 shadow-lg">
      <div className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Land use</div>
      {[
        ["Residential", "#FFD966"],
        ["Commercial", "#E63946"],
        ["Industrial", "#9B5DE5"],
      ].map(([l, c]) => (
        <div key={l} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

export default Index;
