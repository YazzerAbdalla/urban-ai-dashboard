import { useCallback, useEffect } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MapView } from "@/components/dashboard/MapView";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { LoadingOverlay } from "@/components/dashboard/LoadingOverlay";
import { useDash } from "@/store/dashboardStore";
import { cairoBbox } from "@/lib/api/mockClient";
import { useLoadArea } from "@/hooks/api/useLoadArea";
import { useClassify } from "@/hooks/api/useClassify";
import { useCancelJob } from "@/hooks/api/useCancelJob";
import { useJobProgress } from "@/hooks/api/useJobProgress";
import { useClassificationResult } from "@/hooks/api/useClassificationResult";
import { isSuccess, isTerminal, type LoadingStep } from "@/api/types";
import { featureToCell } from "@/lib/adapters";
import { useUrlLayers } from "@/hooks/useUrlLayers";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Modality } from "@/lib/api/types";

const Index = () => {
  useUrlLayers();

  const {
    setLoaded, setLoadingStep, setClassifying, setClassifyProgress,
    resetCells, setCells, modelType, fusion, setActiveTab,
    bbox, gridSize, loadJobId, setLoadJobId, classifyJobId, setClassifyJobId,
    gridId, setGridId,
  } = useDash();

  const loadAreaM = useLoadArea();
  const classifyM = useClassify();
  const cancelM = useCancelJob();
  const loadProgress = useJobProgress(loadJobId);
  const classifyProgress = useJobProgress(classifyJobId);
  const resultQ = useClassificationResult(classifyJobId, isSuccess(classifyProgress.status));

  const handleLoadArea = useCallback(() => {
    if (useDash.getState().loaded || loadAreaM.isPending) return;
    const b = bbox ?? cairoBbox;
    setLoadingStep("downloading_poi");
    loadAreaM.mutate(
      { bbox: [b.west, b.south, b.east, b.north], place_name: "Cairo, Egypt" },
      {
        onSuccess: ({ job_id }) => setLoadJobId(job_id),
        onError: () => setLoadingStep(null),
      }
    );
  }, [bbox, loadAreaM, setLoadJobId, setLoadingStep]);

  const handleClassify = useCallback(() => {
    const state = useDash.getState();
    if (!state.loaded || state.classifying || !state.gridId) return;
    const mods = (Object.keys(state.modalities) as Modality[]).filter((k) => state.modalities[k]);
    if (mods.length === 0) return;
    resetCells();
    setClassifying(true);
    setLoadingStep("classifying");
    classifyM.mutate(
      {
        grid_id: state.gridId,
        cell_size: state.gridSize,
        modalities: mods,
        model_type: modelType,
        fusion_method: fusion,
        area_geometry: state.drawnGeometry,
      },
      {
        onSuccess: ({ job_id }) => setClassifyJobId(job_id),
        onError: () => { setClassifying(false); setLoadingStep(null); },
      }
    );
  }, [classifyM, fusion, modelType, resetCells, setClassifying, setClassifyJobId, setLoadingStep]);

  const handleCancel = useCallback(() => {
    const jid = classifyJobId || loadJobId;
    if (!jid) return;
    cancelM.mutate(jid, {
      onSuccess: () => {
        setClassifying(false);
        setLoadingStep(null);
        if (classifyJobId) setClassifyJobId(null);
        else setLoadJobId(null);
      },
    });
  }, [cancelM, classifyJobId, loadJobId, setClassifying, setClassifyJobId, setLoadJobId, setLoadingStep]);

  // React to load-area job progress
  useEffect(() => {
    if (!loadJobId) return;
    if (loadProgress.step) setLoadingStep(loadProgress.step as LoadingStep);
    if (isSuccess(loadProgress.status)) {
      setLoaded(true);
      setGridId(loadJobId);
      setLoadingStep(null);
    } else if (isTerminal(loadProgress.status)) {
      setLoadingStep(null);
    }
  }, [loadJobId, loadProgress.status, loadProgress.step, setGridId, setLoaded, setLoadingStep]);

  // React to classify job progress
  useEffect(() => {
    if (!classifyJobId) return;
    if (typeof classifyProgress.progress === "number") setClassifyProgress(classifyProgress.progress);
    if (classifyProgress.step) setLoadingStep(classifyProgress.step as LoadingStep);
    if (isSuccess(classifyProgress.status)) {
      setLoadingStep(null);
    } else if (isTerminal(classifyProgress.status)) {
      setClassifying(false);
      setLoadingStep(null);
    }
  }, [classifyJobId, classifyProgress.status, classifyProgress.step, classifyProgress.progress, setClassifying, setClassifyProgress, setLoadingStep]);

  // Populate cells when classification result arrives
  useEffect(() => {
    if (!resultQ.data) return;
    const mapped = resultQ.data.features.map(featureToCell);
    setCells(mapped);
    setClassifying(false);
  }, [resultQ.data, setCells, setClassifying]);

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
