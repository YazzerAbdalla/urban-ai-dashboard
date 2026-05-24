import { useState } from "react";
import { Search, Square, Play, AlertTriangle, Lock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDash } from "@/store/dashboardStore";
import { useI18n } from "@/lib/i18n";
import { estimateCells } from "@/lib/api/mockClient";
import { cn } from "@/lib/utils";
import type { Modality } from "@/lib/api/types";

const PRESETS: Record<string, Record<Modality, boolean>> = {
  poi_only: { poi: true, image: false, graph: false, text: false },
  poi_image: { poi: true, image: true, graph: false, text: false },
  poi_image_graph: { poi: true, image: true, graph: true, text: false },
  all: { poi: true, image: true, graph: true, text: true },
};

interface Props { onLoadArea: () => void; onClassify: () => void; onCancel: () => void; }

export function Sidebar({ onLoadArea, onClassify, onCancel }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { bbox, gridSize, setGridSize, modalities, setModality, modelType, setModelType, fusion, setFusion, loaded, classifying, layers, setLayer, drawMode, setDrawMode, drawnGeometry, setDrawnGeometry } = useDash();
  const cellEstimate = bbox ? estimateCells(bbox, gridSize) : 0;
  const tooMany = cellEstimate > 500;
  const warn = cellEstimate > 300 && !tooMany;
  const anyModality = Object.values(modalities).some(Boolean);

  return (
    <aside className="w-[320px] shrink-0 border-r border-border bg-card overflow-y-auto">
      <div className="p-4 space-y-5">
        <Section title={t("area_selection")}>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search_place")} className="pl-8 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9" title={t("draw_bbox")} onClick={onLoadArea}><Square className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={drawMode ? "default" : "outline"}
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => setDrawMode(!drawMode)}
              title={t("draw_area")}
            >
              <Pencil className="h-3.5 w-3.5" /> {t("draw_area")}
            </Button>
            {drawnGeometry && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDrawnGeometry(null)} title={t("clear_area")}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {drawMode && <p className="text-[11px] text-accent">{t("drawing_mode")}</p>}
          {drawnGeometry && !drawMode && <p className="text-[11px] text-primary">● {t("custom_area_active")}</p>}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("cells_estimate")}</span>
            <span className={cn("mono font-semibold", tooMany && "text-destructive", warn && "text-accent")}>{cellEstimate}</span>
          </div>
          {warn && <p className="text-[11px] text-accent flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("warn_300")}</p>}
          {tooMany && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("block_500")}</p>}
          <Button className="w-full h-9" onClick={onLoadArea} disabled={tooMany || loaded}>{t("load_area")}</Button>
        </Section>

        <Section title={t("grid_config")}>
          <Label className="text-xs text-muted-foreground">{t("grid_size")}</Label>
          <div className="grid grid-cols-3 gap-1">
            {[200, 500, 1000].map((n) => (
              <button key={n} onClick={() => setGridSize(n as 200 | 500 | 1000)}
                className={cn("h-8 text-xs rounded border mono", gridSize === n ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary hover:bg-muted")}>{n}m</button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mono pt-1">{t("projection_label")}</p>
        </Section>

        <Section title={t("modalities")}>
          <div className="space-y-2">
            <ModRow id="poi" label="POI" dim="64-d MiniLM" checked={modalities.poi} onCheck={(v) => setModality("poi", v)} />
            <ModRow id="image" label="Image" dim="64-d ResNet" checked={modalities.image} onCheck={(v) => setModality("image", v)} />
            <ModRow id="graph" label="Graph" dim="32-d OSMnx" checked={modalities.graph} locked={modelType === "gnn"} onCheck={(v) => setModality("graph", v)} />
            <ModRow id="text" label="Text" dim="64-d BERT" checked={modalities.text} onCheck={(v) => setModality("text", v)} />
          </div>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">{t("ablation_preset")}</Label>
            <Select onValueChange={(v) => { const p = PRESETS[v]; if (p) (Object.keys(p) as Modality[]).forEach((k) => setModality(k, p[k])); }}>
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder={t("preset_custom")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="poi_only">{t("preset_poi_only")}</SelectItem>
                <SelectItem value="poi_image">{t("preset_poi_image")}</SelectItem>
                <SelectItem value="poi_image_graph">{t("preset_poi_image_graph")}</SelectItem>
                <SelectItem value="all">{t("preset_all")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title={t("model")}>
          <div className="grid grid-cols-2 gap-1">
            {(["mlp", "gnn"] as const).map((m) => (
              <button key={m} onClick={() => setModelType(m)}
                className={cn("h-8 text-xs rounded border", modelType === m ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary hover:bg-muted")}>
                {m === "mlp" ? t("model_mlp") : t("model_gnn")}
              </button>
            ))}
          </div>
          <Label className="text-xs text-muted-foreground pt-1">{t("fusion")}</Label>
          <Select value={fusion} onValueChange={(v) => setFusion(v as any)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="concat">{t("fusion_concat")}</SelectItem>
              <SelectItem value="weighted">{t("fusion_weighted")}</SelectItem>
              <SelectItem value="attention">{t("fusion_attention")}</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <div>
          {classifying
            ? <Button variant="destructive" className="w-full h-10" onClick={onCancel}>{t("cancel")}</Button>
            : <Button className="w-full h-10" onClick={onClassify} disabled={!loaded || !anyModality}><Play className="h-4 w-4" /> {t("classify")}</Button>}
        </div>

        <Section title={t("layers")}>
          <LayerRow label={t("layer_classification")} value={layers.classification} onChange={(v) => setLayer("classification", v)} />
          <LayerRow label={t("layer_poi")} value={layers.poi} onChange={(v) => setLayer("poi", v)} />
          <LayerRow label={t("layer_roads")} value={layers.roads} onChange={(v) => setLayer("roads", v)} />
          <LayerRow label={t("layer_graph")} value={layers.graph} onChange={(v) => setLayer("graph", v)} />
          <LayerRow label={t("layer_satellite")} value={layers.satellite} onChange={(v) => setLayer("satellite", v)} />
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<section className="space-y-2"><h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</h3>{children}</section>);
}
function ModRow({ id, label, dim, checked, onCheck, locked }: { id: string; label: string; dim: string; checked: boolean; onCheck: (v: boolean) => void; locked?: boolean }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50">
      <Checkbox id={id} checked={checked} disabled={locked} onCheckedChange={(v) => onCheck(!!v)} />
      <span className="flex-1">{label}</span>
      <span className="mono text-[10px] text-muted-foreground">{dim}</span>
      {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
    </label>
  );
}
function LayerRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (<div className="flex items-center justify-between text-sm py-0.5"><span>{label}</span><Switch checked={value} onCheckedChange={onChange} /></div>);
}
