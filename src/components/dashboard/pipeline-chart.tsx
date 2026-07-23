import { cn } from "@/lib/utils";

export type PipelineStage = { label: string; count: number };

const W = 640;
const ROW = 38;
const BAR_H = 12;
const LABEL_X = 0;
const BAR_X = 150;
const COUNT_W = 40;
const BAR_MAX = W - BAR_X - COUNT_W;

/** Horizontal bar with only its right (data) end rounded. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h / 2, Math.max(w, 0));
  if (w <= 0) return "";
  return `M${x},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x},${y + h} Z`;
}

/**
 * Where every order currently sits. Each stage is directly labeled with its name
 * and count, so identity never depends on color — the single hue only encodes
 * magnitude (bar length).
 */
export function PipelineChart({
  stages,
  subtitle,
}: {
  stages: PipelineStage[];
  subtitle: string;
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  const total = stages.reduce((s, x) => s + x.count, 0);
  const H = stages.length * ROW;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Pipeline</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-lg font-semibold tabular-nums">{total}</div>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
          Nothing in the pipeline yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-4 h-auto w-full"
          role="img"
          aria-label="Orders by pipeline stage"
        >
          <title>Orders by pipeline stage</title>
          {stages.map((s, i) => {
            const y = i * ROW;
            const barY = y + (ROW - BAR_H) / 2;
            const w = (s.count / max) * BAR_MAX;
            return (
              <g key={s.label} className="group">
                <text
                  x={LABEL_X}
                  y={y + ROW / 2}
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[12px]"
                >
                  {s.label}
                </text>
                {/* Track, so empty stages still read as a row */}
                <path
                  d={barPath(BAR_X, barY, BAR_MAX, BAR_H)}
                  className="fill-muted"
                  pointerEvents="none"
                />
                <path
                  d={barPath(BAR_X, barY, w, BAR_H)}
                  className={cn("fill-primary transition-opacity group-hover:opacity-80")}
                  pointerEvents="none"
                />
                <text
                  x={W}
                  y={y + ROW / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-foreground text-[12px] tabular-nums"
                >
                  {s.count}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
