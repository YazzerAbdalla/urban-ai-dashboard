import { Pin, X, Info } from "lucide-react";
import { useDash } from "@/store/dashboardStore";
import { allCells } from "@/lib/api/mockClient";
import { classHex } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LandUseClass } from "@/lib/api/types";

export function CellDetailPanel() {
  const id = useDash((s) => s.selectedCellId);
  const setId = useDash((s) => s.setSelectedCellId);
  const pinned = useDash((s) => s.pinned);
  const togglePin = useDash((s) => s.togglePin);
  const cells = useDash((s) => s.cells);
  const { t } = useI18n();
  const cell = (cells.find((c) => c.id === id) || allCells.find((c) => c.id === id)) ?? null;
  if (!cell) return <div className="p-6 text-sm text-muted-foreground text-center">Click a classified cell to inspect it.</div>;
  const isPinned = pinned.includes(cell.id);
  return (
    <div className="overflow-y-auto h-full"><div className="p-4 space-y-4">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded shrink-0" style={{ backgroundColor: classHex[cell.class] }} />
        <div className="flex-1">
          <div className="mono text-xs text-muted-foreground">{cell.id}</div>
          <div className="font-semibold">{cell.class}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(cell.id)} title={isPinned ? t("unpin") : t("pin_compare")}>
          <Pin className={isPinned ? "fill-primary text-primary" : ""} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setId(null)}><X /></Button>
      </div>

      <div className="space-y-1.5">
        {(["Residential", "Commercial", "Industrial"] as LandUseClass[]).map((k) => {
          const v = cell.confidences[k];
          return (
            <div key={k} className="text-xs">
              <div className="flex justify-between mb-0.5"><span>{k}</span><span className="mono text-muted-foreground">{(v * 100).toFixed(1)}%</span></div>
              <div className="h-1.5 bg-secondary rounded overflow-hidden"><div className="h-full" style={{ width: `${v * 100}%`, backgroundColor: classHex[k] }} /></div>
            </div>
          );
        })}
      </div>

      <div className="rounded border border-border bg-secondary/40 p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-semibold">{t("cell_story")}</h4>
          <Tooltip><TooltipTrigger asChild><button><Info className="h-3 w-3 text-muted-foreground" /></button></TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">Mean-pooled embedding from <span className="mono">paraphrase-multilingual-MiniLM-L12-v2</span> across all POI in this cell — a single 384-dim semantic fingerprint.</TooltipContent>
          </Tooltip>
        </div>
        <p className="text-[10px] mono text-muted-foreground">{t("cell_story_sub")}</p>
        <ul className="text-xs pt-1 space-y-0.5">
          {cell.top5_poi.map((p, i) => <li key={i} className="mono">{i + 1}. {p}</li>)}
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1.5">{t("graph_metrics")}</h4>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <Metric label="degree_centrality" value={cell.degree_centrality.toFixed(3)} />
          <Metric label="clustering_coeff" value={cell.clustering_coeff.toFixed(3)} />
          <Metric label="total_road_length_m" value={cell.total_road_length_m.toString()} />
          <Metric label="node_count" value={cell.node_count.toString()} />
          <Metric label="road_density" value={cell.road_density.toFixed(2)} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1.5">{t("satellite")}</h4>
        <img src={cell.satellite_thumb} alt="satellite" className="w-full rounded border border-border" />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <h4 className="text-xs font-semibold">{t("embeddings")}</h4>
          <Tooltip><TooltipTrigger asChild><button><Info className="h-3 w-3 text-muted-foreground" /></button></TooltipTrigger>
            <TooltipContent className="text-xs">{t("vector_breakdown")}</TooltipContent></Tooltip>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <Metric label="graph L2 (32-d)" value={cell.graph_embedding_norm.toFixed(3)} />
          <Metric label="text L2 (64-d)" value={cell.text_embedding_norm.toFixed(3)} />
        </div>
      </div>
    </div></div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-secondary/50 px-2 py-1.5 border border-border">
      <div className="text-[9px] uppercase mono text-muted-foreground tracking-wide">{label}</div>
      <div className="mono text-sm">{value}</div>
    </div>
  );
}
