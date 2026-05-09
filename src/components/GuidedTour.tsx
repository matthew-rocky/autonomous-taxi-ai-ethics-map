import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, HelpCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ViewMode } from "@/types";
import { cn } from "@/lib/utils";

export const GUIDED_TOUR_STORAGE_KEY = "robo-cab-guided-tour-complete";

type TourPlacement = "center" | "top" | "bottom" | "left" | "right";

interface TourStep {
  target?: string;
  view?: ViewMode;
  title: string;
  description: string;
  placement?: TourPlacement;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to Robo-Cab Ottawa",
    description:
      "This prototype shows uncertainty-aware navigation. It does not pretend danger detection is perfect. It makes low confidence visible.",
  },
  {
    target: '[data-tour="live-map-tab"]',
    title: "Start with the Live Map",
    description: "Choose pickup and drop-off points, then review how the system handles uncertainty along the route.",
    placement: "bottom",
  },
  {
    target: '[data-tour="pickup-dropoff-controls"]',
    view: "map",
    title: "Set the route",
    description: "Use the pickup, drop-off, and current location controls to define a trip.",
    placement: "bottom",
  },
  {
    target: '[data-tour="directions-card"]',
    view: "map",
    title: "Review the recommendation",
    description: "The system explains whether it can proceed normally, act cautiously, or recommend a safer handoff.",
    placement: "top",
  },
  {
    target: '[data-tour="report-panel"]',
    view: "map",
    title: "Add reports",
    description: "You can report route or area concerns. These reports influence uncertainty and confidence.",
    placement: "right",
  },
  {
    target: '[data-tour="assessment-tab"]',
    title: "Check the assessment",
    description: "The assessment view summarizes confidence, reports, uncertainty overlays, and ethical pressure points.",
    placement: "bottom",
  },
  {
    target: '[data-tour="compare-tab"]',
    title: "Compare scenarios",
    description: "Use comparison to understand how different confidence conditions change the system's behavior.",
    placement: "bottom",
  },
  {
    target: '[data-tour="design-tools-tab"]',
    title: "Explore the ethics toolkit",
    description:
      "This tab explains the design reasoning behind the prototype, including value mapping, metaphor hacking, and social failure mode analysis.",
    placement: "bottom",
  },
  {
    title: "Main idea",
    description:
      "The Robo-Cab should slow down, explain uncertainty, and recommend safer handoff when confidence is low.",
  },
];

interface GuidedTourProps {
  open: boolean;
  activeView: ViewMode;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: ViewMode) => void;
}

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({ open, activeView, onOpenChange, onViewChange }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const step = tourSteps[stepIndex];
  const isLastStep = stepIndex === tourSteps.length - 1;

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step.view || activeView === step.view) return;
    onViewChange(step.view);
  }, [activeView, onViewChange, open, step.view]);

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    let timeout = 0;

    const measureTarget = () => {
      if (!step.target) {
        setTargetBox(null);
        return true;
      }

      const element = getVisibleTourTarget(step.target);
      if (!(element instanceof HTMLElement)) {
        setTargetBox(null);
        return false;
      }

      const rect = element.getBoundingClientRect();
      const inset = 10;
      setTargetBox({
        top: Math.max(8, rect.top - inset),
        left: Math.max(8, rect.left - inset),
        width: Math.min(window.innerWidth - 16, rect.width + inset * 2),
        height: Math.min(window.innerHeight - 16, rect.height + inset * 2),
      });
      return true;
    };

    const syncTarget = () => {
      const element = step.target ? getVisibleTourTarget(step.target) : null;
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      }
      let attempts = 0;
      const retryMeasure = () => {
        const found = measureTarget();
        attempts += 1;
        if (!found && attempts < 12) {
          timeout = window.setTimeout(retryMeasure, 90);
        }
      };
      timeout = window.setTimeout(retryMeasure, 180);
    };

    frame = window.requestAnimationFrame(syncTarget);
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [activeView, open, step.target, stepIndex]);

  const cardPosition = useMemo(() => getCardPosition(targetBox, step.placement), [step.placement, targetBox]);

  const closeTour = (completed: boolean) => {
    try {
      window.localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, completed ? "complete" : "skipped");
    } catch {
      // The tour should never trap the user if storage is unavailable.
    }
    onOpenChange(false);
  };

  const nextStep = () => {
    if (isLastStep) {
      closeTour(true);
      return;
    }
    setStepIndex((current) => Math.min(current + 1, tourSteps.length - 1));
  };

  const previousStep = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[2200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
        >
          <div className="absolute inset-0 bg-slate-950/62 backdrop-blur-[2px]" />

          {targetBox ? (
            <motion.div
              className="pointer-events-none absolute rounded-2xl border border-cyan-200/55 bg-cyan-300/[0.06] shadow-[0_0_0_9999px_rgba(2,6,23,0.54),0_0_48px_rgba(34,211,238,0.32)]"
              initial={false}
              animate={{
                top: targetBox.top,
                left: targetBox.left,
                width: targetBox.width,
                height: targetBox.height,
              }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_34%)]" />
          )}

          <motion.section
            className="map-dock map-dock-strong fixed w-[min(420px,calc(100vw-28px))] rounded-2xl border border-white/[0.14] bg-slate-950/90 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.5),0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-2xl"
            style={{ left: cardPosition.left, top: cardPosition.top }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="metric-label">Guided tour</div>
                <h2 id="guided-tour-title" className="mt-1 text-xl font-semibold text-white">
                  {step.title}
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => closeTour(false)}
                aria-label="Skip guided tour"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>

            <div className="mt-4 flex items-center gap-1.5">
              {tourSteps.map((item, index) => (
                <span
                  key={item.title}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition",
                    index <= stepIndex ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)]" : "bg-white/[0.10]",
                  )}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="ghost-button min-h-10 px-3 text-xs" onClick={() => closeTour(false)}>
                Skip
              </button>

              <div className="flex min-w-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="secondary-button min-h-10 px-3 text-xs"
                  onClick={previousStep}
                  disabled={stepIndex === 0}
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Back
                </button>
                <button type="button" className="primary-button min-h-10 px-3 text-xs" onClick={nextStep}>
                  {isLastStep ? (
                    <>
                      <Check className="size-3.5" aria-hidden="true" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ReplayTourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="nav-button nav-button-idle"
      data-tour="help-tour-button"
      onClick={onClick}
      aria-label="Replay guided tour"
      title="Replay tour"
    >
      <HelpCircle className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Help</span>
    </button>
  );
}

function getVisibleTourTarget(selector: string) {
  const elements = Array.from(document.querySelectorAll(selector));
  return elements.find((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }) ?? null;
}

function getCardPosition(targetBox: TargetBox | null, placement: TourPlacement = "center") {
  const margin = 14;
  const cardWidth = Math.min(420, window.innerWidth - 28);
  const estimatedHeight = 300;

  if (!targetBox || placement === "center") {
    return {
      left: Math.max(margin, (window.innerWidth - cardWidth) / 2),
      top: Math.max(margin, (window.innerHeight - estimatedHeight) / 2),
    };
  }

  const centeredLeft = targetBox.left + targetBox.width / 2 - cardWidth / 2;
  let left = centeredLeft;
  let top = targetBox.top + targetBox.height + margin;

  if (placement === "top") top = targetBox.top - estimatedHeight - margin;
  if (placement === "left") {
    left = targetBox.left - cardWidth - margin;
    top = targetBox.top + targetBox.height / 2 - estimatedHeight / 2;
  }
  if (placement === "right") {
    left = targetBox.left + targetBox.width + margin;
    top = targetBox.top + targetBox.height / 2 - estimatedHeight / 2;
  }

  if (top < margin || top + estimatedHeight > window.innerHeight - margin) {
    top = Math.max(margin, Math.min(window.innerHeight - estimatedHeight - margin, targetBox.top + targetBox.height + margin));
  }
  if (placement === "bottom" && top + estimatedHeight > window.innerHeight - margin) {
    top = Math.max(margin, targetBox.top - estimatedHeight - margin);
  }

  return {
    left: Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, left)),
    top: Math.max(margin, Math.min(window.innerHeight - estimatedHeight - margin, top)),
  };
}
