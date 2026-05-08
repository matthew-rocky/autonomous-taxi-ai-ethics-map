import { AlertTriangle, Circle, ShieldQuestion } from "lucide-react";
import type { ConfidenceAssessment, ConfidenceLevel } from "@/types";
import { cn, confidenceLevelTone } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: ConfidenceAssessment;
  compact?: boolean;
  className?: string;
}

const icons: Record<ConfidenceLevel, typeof Circle> = {
  white: Circle,
  orange: ShieldQuestion,
  red: AlertTriangle,
};

export function ConfidenceBadge({ confidence, compact = false, className }: ConfidenceBadgeProps) {
  const Icon = icons[confidence.level];

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold",
        confidenceLevelTone[confidence.level],
        className,
      )}
      title={confidence.headline}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {compact ? `${confidence.label} Confidence` : `Confidence Level: ${confidence.label} - ${confidence.status}`}
      </span>
    </span>
  );
}
