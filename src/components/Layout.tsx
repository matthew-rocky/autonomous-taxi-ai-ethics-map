import { BarChart3, FileText, GitCompareArrows, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { ViewMode } from "@/types";
import { cn } from "@/lib/utils";
import { ReplayTourButton } from "@/components/GuidedTour";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems: Array<{ id: ViewMode; label: string; icon: typeof BarChart3 }> = [
  { id: "map", label: "Live Map", icon: MapPinned },
  { id: "assessment", label: "Assessment", icon: BarChart3 },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "brief", label: "Brief", icon: FileText },
  { id: "framework", label: "Design Tools", icon: ShieldCheck },
];

interface LayoutProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onReplayTour: () => void;
  children: ReactNode;
}

export function Layout({ activeView, onViewChange, onReplayTour, children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-40">
        <div className="flex w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => onViewChange("map")}
            className="app-brand flex w-fit items-center gap-3 rounded-lg text-left"
            aria-label="Go to live map"
          >
            <span className="app-brand-icon flex size-10 items-center justify-center rounded-lg">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Robo-Cab Ottawa</span>
              <span className="block text-xs text-[var(--soft-text)]">Uncertainty-Aware Navigation</span>
            </span>
          </button>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
            <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    data-tour={tourAttributeForView(item.id)}
                    className={cn("nav-button", active ? "nav-button-active" : "nav-button-idle")}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <ReplayTourButton onClick={onReplayTour} />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="app-main w-full px-3 pb-12 sm:px-5 lg:px-7 2xl:px-10">{children}</main>
    </div>
  );
}

function tourAttributeForView(view: ViewMode) {
  if (view === "map") return "live-map-tab";
  if (view === "assessment") return "assessment-tab";
  if (view === "compare") return "compare-tab";
  if (view === "framework") return "design-tools-tab";
  return undefined;
}
