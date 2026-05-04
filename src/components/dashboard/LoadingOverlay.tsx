import { useI18n } from "@/lib/i18n";
import type { LoadingStep } from "@/lib/api/types";
import { useDash } from "@/store/dashboardStore";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: LoadingStep[] = ["downloading_poi", "mapping_poi_to_nodes", "building_graph", "classifying"];

export function LoadingOverlay() {
  const step = useDash((s) => s.loadingStep);
  const { t } = useI18n();
  if (!step) return null;
  const idx = STEPS.indexOf(step);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-background/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg p-6 shadow-2xl w-[360px] space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />{t("loading_step")}…
        </h3>
        <ul className="space-y-1.5 text-sm">
          {STEPS.map((s, i) => {
            const done = i < idx, active = i === idx;
            return (
              <li key={s} className={cn("flex items-center gap-2", !done && !active && "text-muted-foreground")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> :
                  active ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> :
                  <span className="h-4 w-4 rounded-full border border-border" />}
                <span className={cn(active && "text-foreground font-medium")}>{t(`step_${s}` as any)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
