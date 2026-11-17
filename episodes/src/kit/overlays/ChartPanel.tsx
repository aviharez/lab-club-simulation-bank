// Bottom "notebook" panel with a live chart: series drawn up to the current x (time, trials, steps...).
// Pure SVG, every point computed from the series functions on each frame (Series rule 3: no sampled data).
//
//   <ChartPanel title="height vs time" subtitle="v = 3.13 m/s" legend={[...]} x={{ max: 4, ticks: [0,1,2,3,4] }}
//     y={{ max: 3.2, ticks: [1,2,3], label: (m) => `${m} m` }} series={[{ key, color, fn, liveUntil }]} progress={t} />
//
// Place it with `style` (translate in/out is the episode's choreography). Defaults match EP01's panel.
import React from "react";
import { FONT, INK, INK_SOFT } from "../theme";

export type ChartSeries = {
  key: string;
  color: string;
  /** y at x; return NaN to leave a gap */
  fn: (x: number) => number;
  /** the series' head dot is big while progress < liveUntil, small afterwards */
  liveUntil?: number;
  /** dash pattern (px) for a curve drawn on top of an identical one, so both stay visible */
  dash?: number[];
};

export type ChartAxis = {
  max: number;
  /** log axes need min > 0 */
  min?: number;
  ticks: number[];
  label?: (v: number) => string;
  log?: boolean;
};

export type ChartLegendItem = { label: string; sub?: string; color: string };

export type ChartPanelProps = {
  title: string;
  subtitle?: string;
  legend?: ChartLegendItem[];
  x: ChartAxis;
  y: ChartAxis;
  series: ChartSeries[];
  /** current x; the curves are drawn from x.min to here (clamped to the axis) */
  progress: number;
  /** false: draw axes only (before the experiment starts) */
  started?: boolean;
  /** sampling step in x units */
  step?: number;
  box?: { left: number; top: number; width: number; height: number };
  plot?: { x0: number; x1: number; y0: number; y1: number };
  legendAt?: { x: number; y: number; step: number; width: number };
  style?: React.CSSProperties;
};

const BOX = { left: 60, top: 1322, width: 960, height: 290 };
const PLOT = { x0: 120, x1: 930, y0: 246, y1: 112 };
const LEGEND = { x: 372, y: 62, step: 142, width: 132 };

/** Axis value → 0..1 along the axis (linear or log10). */
const unit = (a: ChartAxis, v: number) => {
  const lo = a.min ?? 0;
  if (a.log)
    return (
      (Math.log10(Math.max(v, 1e-12)) - Math.log10(lo)) /
      (Math.log10(a.max) - Math.log10(lo))
    );
  return (v - lo) / (a.max - lo);
};

export const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  subtitle,
  legend = [],
  x,
  y,
  series,
  progress,
  started = true,
  step = 0.01,
  box = BOX,
  plot = PLOT,
  legendAt = LEGEND,
  style,
}) => {
  const xMin = x.min ?? 0;
  const t = Math.min(x.max, Math.max(xMin, progress));
  const sx = (v: number) => plot.x0 + unit(x, v) * (plot.x1 - plot.x0);
  const sy = (v: number) => plot.y0 - unit(y, v) * (plot.y0 - plot.y1);
  const xLabel = x.label ?? ((v: number) => String(v));
  const yLabel = y.label ?? ((v: number) => String(v));
  const H = box.height;
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: H,
        rotate: "-0.6deg",
        ...style,
      }}
    >
      <svg
        width={box.width}
        height={H}
        viewBox={`0 0 ${box.width} ${H}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <pattern
            id="grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0 L0 0 0 24"
              fill="none"
              stroke="#cfe0f3"
              strokeWidth={1.5}
            />
          </pattern>
        </defs>
        {/* paper */}
        <rect
          x={0}
          y={10}
          width={box.width}
          height={H - 10}
          rx={26}
          fill={INK}
        />
        <rect
          x={0}
          y={0}
          width={box.width}
          height={H - 10}
          rx={26}
          fill="#fffdf6"
          stroke={INK}
          strokeWidth={5}
        />
        <rect
          x={6}
          y={40}
          width={box.width - 12}
          height={H - 56}
          fill="url(#grid)"
        />
        <line
          x1={92}
          y1={36}
          x2={92}
          y2={H - 18}
          stroke="#f2a3b3"
          strokeWidth={3}
        />
        {/* spiral binding */}
        {Array.from({ length: Math.floor((box.width - 20) / 62) }, (_, k) => (
          <g key={k}>
            <circle
              cx={50 + k * 62}
              cy={22}
              r={9}
              fill="#f4ede3"
              stroke={INK}
              strokeWidth={3.5}
            />
            <path
              d={`M ${50 + k * 62} 22 L ${50 + k * 62} -8`}
              stroke={INK_SOFT}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* title + legend */}
        <text
          x={110}
          y={78}
          fontFamily={FONT}
          fontWeight={700}
          fontSize={30}
          fill={INK}
        >
          {title}
        </text>
        {subtitle ? (
          <text
            x={110}
            y={102}
            fontFamily={FONT}
            fontWeight={500}
            fontSize={20}
            fill={INK_SOFT}
          >
            {subtitle}
          </text>
        ) : null}
        {legend.map((l, i) => (
          <g
            key={l.label}
            transform={`translate(${legendAt.x + i * legendAt.step}, ${legendAt.y})`}
          >
            <rect
              x={0}
              y={0}
              width={legendAt.width}
              height={44}
              rx={22}
              fill={l.color}
              stroke={INK}
              strokeWidth={3}
            />
            <text
              x={legendAt.width / 2}
              y={l.sub ? 20 : 29}
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={700}
              fontSize={18}
              fill="#fff"
            >
              {l.label}
            </text>
            {l.sub ? (
              <text
                x={legendAt.width / 2}
                y={38}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={600}
                fontSize={17}
                fill="#fff"
              >
                {l.sub}
              </text>
            ) : null}
          </g>
        ))}
        {/* axes */}
        <line
          x1={plot.x0}
          y1={plot.y0}
          x2={plot.x1 + 10}
          y2={plot.y0}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <line
          x1={plot.x0}
          y1={plot.y0}
          x2={plot.x0}
          y2={plot.y1 + 12}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        {x.ticks.map((v) => (
          <text
            key={v}
            x={sx(v)}
            y={plot.y0 + 26}
            textAnchor="middle"
            fontFamily={FONT}
            fontWeight={600}
            fontSize={20}
            fill={INK_SOFT}
          >
            {xLabel(v)}
          </text>
        ))}
        {y.ticks.map((v) => (
          <g key={v}>
            <line
              x1={plot.x0 - 6}
              y1={sy(v)}
              x2={plot.x0 + 6}
              y2={sy(v)}
              stroke={INK}
              strokeWidth={3}
            />
            <text
              x={plot.x0 - 12}
              y={sy(v) + 7}
              textAnchor="end"
              fontFamily={FONT}
              fontWeight={600}
              fontSize={20}
              fill={INK_SOFT}
            >
              {yLabel(v)}
            </text>
          </g>
        ))}
        {/* curves, drawn up to the current x */}
        {started
          ? series.map((s) => {
              const pts: string[] = [];
              for (let v = xMin; v <= t + 1e-9; v += step) {
                const yv = s.fn(v);
                if (Number.isFinite(yv))
                  pts.push(`${sx(v).toFixed(1)},${sy(yv).toFixed(1)}`);
              }
              const yt = s.fn(t);
              if (Number.isFinite(yt))
                pts.push(`${sx(t).toFixed(1)},${sy(yt).toFixed(1)}`);
              const live = s.liveUntil === undefined || t < s.liveUntil;
              return (
                <g key={s.key}>
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={INK}
                    strokeWidth={9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={s.dash?.join(" ")}
                    opacity={0.18}
                  />
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={6}
                    strokeLinejoin="round"
                    strokeLinecap={s.dash ? "butt" : "round"}
                    strokeDasharray={s.dash?.join(" ")}
                  />
                  {(live || progress < x.max) && Number.isFinite(yt) ? (
                    <circle
                      cx={sx(t)}
                      cy={sy(yt)}
                      r={live ? 10 : 6}
                      fill={s.color}
                      stroke={INK}
                      strokeWidth={3}
                    />
                  ) : null}
                </g>
              );
            })
          : null}
      </svg>
    </div>
  );
};
