import { twMerge } from "tailwind-merge";
import type { ConfidenceLevel, DisplayRiskLevel, RiskLabel } from "@/types";

export const cn = (...classes: Array<string | false | null | undefined>) =>
  twMerge(classes.filter(Boolean).join(" "));

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const riskLevelTone: Record<DisplayRiskLevel, string> = {
  Low: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  Moderate: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  High: "border-rose-300/[0.35] bg-rose-400/10 text-rose-200",
  Critical: "border-fuchsia-300/[0.35] bg-fuchsia-400/10 text-fuchsia-100",
};

export const riskLabelTone: Record<RiskLabel, string> = {
  Normal: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  Caution: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  Danger: "border-rose-300/[0.35] bg-rose-400/10 text-rose-200",
};

export const confidenceLevelTone: Record<ConfidenceLevel, string> = {
  white: "border-white/40 bg-white/[0.12] text-white",
  orange: "border-orange-200/40 bg-orange-300/[0.16] text-orange-100",
  red: "border-rose-200/45 bg-rose-300/[0.16] text-rose-100",
};

export const confidenceMapColor: Record<ConfidenceLevel, string> = {
  white: "#f8fafc",
  orange: "#fb923c",
  red: "#fb7185",
};

export const categoryTone = {
  violet: "from-violet-400 to-fuchsia-300 text-violet-100",
  cyan: "from-cyan-300 to-sky-300 text-cyan-100",
  emerald: "from-emerald-300 to-teal-300 text-emerald-100",
  amber: "from-amber-300 to-orange-300 text-amber-100",
  rose: "from-rose-300 to-pink-300 text-rose-100",
  blue: "from-blue-300 to-indigo-300 text-blue-100",
} as const;

export const formatDistance = (distance: number | null | undefined) => {
  if (distance === null || distance === undefined) return "No nearby report";
  if (distance < 0.1) return "<0.10 km";
  return `${distance.toFixed(2)} km`;
};
