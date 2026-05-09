import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryScore } from "@/types";

interface RiskRadarChartProps {
  categories: CategoryScore[];
}

export function RiskRadarChart({ categories }: RiskRadarChartProps) {
  const data = categories.map((category) => ({
    subject: category.name.replace("Societal Impact", "Societal"),
    pressure: category.score,
  }));

  return (
    <section className="glass-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Ethics lens</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Category radar</h2>
        </div>
        <span className="rounded-lg border border-violet-200/25 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
          Weighted pressure
        </span>
      </div>

      <div className="mt-4 h-[260px] w-full sm:h-[320px]">
        <ResponsiveContainer>
          <RechartsRadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--subtle-border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-text)", fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--soft-text)", fontSize: 10 }} />
            <Radar
              name="Ethical pressure"
              dataKey="pressure"
              stroke="#67e8f9"
              fill="url(#riskGradient)"
              fillOpacity={0.52}
              isAnimationActive
              animationDuration={850}
            />
            <Tooltip
              contentStyle={{
                background: "var(--panel-bg-strong)",
                border: "1px solid var(--panel-border)",
                borderRadius: 8,
                color: "var(--panel-text)",
              }}
              labelStyle={{ color: "var(--panel-text)" }}
            />
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="52%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
