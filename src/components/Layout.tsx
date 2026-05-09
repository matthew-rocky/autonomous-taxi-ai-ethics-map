import { BarChart3, FileText, GitCompareArrows, MapPinned, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeNavItem = navItems.find((item) => item.id === activeView) ?? navItems[0];

  const changeView = (view: ViewMode) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-40">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => changeView("map")}
            className="app-brand flex min-w-0 items-center gap-2 rounded-lg text-left"
            aria-label="Go to live map"
          >
            <span className="app-brand-icon flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Robo-Cab Ottawa</span>
              <span className="block truncate text-xs text-[var(--soft-text)]">{activeNavItem.label}</span>
            </span>
          </button>

          <div className="relative flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="nav-button nav-button-idle min-w-11 px-0"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
            </button>

            {mobileMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg-strong)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--soft-text)]">Settings</div>
                <div className="mt-3 grid gap-3">
                  <ReplayTourButton onClick={onReplayTour} />
                  <ThemeSwitcher />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:flex lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => changeView("map")}
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
                    onClick={() => changeView(item.id)}
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

      <main className="app-main w-full min-w-0 overflow-x-hidden px-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-7 lg:pb-12 2xl:px-10">{children}</main>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 gap-1 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-strong)] p-1.5 shadow-[0_18px_64px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeView(item.id)}
              data-tour={tourAttributeForView(item.id)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[0.68rem] font-bold transition",
                active
                  ? "border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-text)] shadow-[0_12px_30px_rgba(34,211,238,0.12)]"
                  : "border-transparent text-[var(--muted-text)] hover:bg-[var(--subtle-bg)] hover:text-[var(--panel-text)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="w-full truncate text-center">{item.label.replace("Design Tools", "Design")}</span>
            </button>
          );
        })}
      </nav>
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
