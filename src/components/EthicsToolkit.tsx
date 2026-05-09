import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Compass,
  Eye,
  GitBranch,
  Handshake,
  Info,
  Lightbulb,
  MapPinned,
  Network,
  Route,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

type ToolkitToolId = "value-map" | "metaphor" | "failure-mode";

interface ToolkitTool {
  id: ToolkitToolId;
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  summary: string;
  why: string;
  tone: string;
  accent: string;
}

const tools: ToolkitTool[] = [
  {
    id: "value-map",
    title: "Value Map",
    eyebrow: "Stakeholders",
    icon: Network,
    summary: "Connect who is affected to the values the cab must protect.",
    why: "It shows that trust is earned through visible accountability, not hidden automation confidence.",
    tone: "from-cyan-300 to-sky-300",
    accent: "text-cyan-100",
  },
  {
    id: "metaphor",
    title: "Metaphor Hacking",
    eyebrow: "Mental model",
    icon: Compass,
    summary: "Replace autopilot certainty with a cautious guide model.",
    why: "The interface teaches riders that uncertainty changes behavior before harm becomes obvious.",
    tone: "from-amber-300 to-orange-300",
    accent: "text-amber-100",
  },
  {
    id: "failure-mode",
    title: "Social Failure Mode Analysis",
    eyebrow: "Failure logic",
    icon: ShieldAlert,
    summary: "Identify when technically correct routing becomes socially wrong.",
    why: "A Robo-Cab can reach the point and still fail if it hides weak evidence or risk.",
    tone: "from-rose-300 to-fuchsia-300",
    accent: "text-rose-100",
  },
];

const stakeholders = ["Tourists", "Pedestrians", "Emergency responders", "Engineers", "Tech companies"];
const values = ["Trust", "Accountability", "Safety", "Reliability", "Efficiency", "Reputation", "Accessibility"];

const valueLinks = [
  ["Tourists", "Trust"],
  ["Tourists", "Safety"],
  ["Pedestrians", "Safety"],
  ["Pedestrians", "Accountability"],
  ["Emergency responders", "Reliability"],
  ["Emergency responders", "Efficiency"],
  ["Engineers", "Transparency"],
  ["Engineers", "Accountability"],
  ["Tech companies", "Reputation"],
  ["Tech companies", "Trust"],
] as const;

const radarData = [
  { subject: "Safety", priority: 96 },
  { subject: "Accountability", priority: 92 },
  { subject: "Transparency", priority: 88 },
  { subject: "Fairness", priority: 74 },
  { subject: "Privacy", priority: 68 },
  { subject: "Societal", priority: 84 },
];

const flowStates = [
  {
    label: "White confidence",
    action: "Proceed normally",
    icon: CheckCircle2,
    className: "border-white/30 bg-white/[0.08] text-slate-100",
  },
  {
    label: "Orange uncertainty",
    action: "Proceed with caution",
    icon: Eye,
    className: "border-amber-200/35 bg-amber-300/[0.13] text-amber-100",
  },
  {
    label: "Red confidence",
    action: "Recommend safer handoff",
    icon: Route,
    className: "border-rose-200/35 bg-rose-300/[0.13] text-rose-100",
  },
  {
    label: "Critical",
    action: "Human override",
    icon: AlertTriangle,
    className: "border-fuchsia-200/35 bg-fuchsia-300/[0.13] text-fuchsia-100",
  },
];

const metaphorSteps = [
  "Uncertainty must be visible.",
  "Low confidence triggers cautious behavior.",
  "Decisions must be explained.",
  "Safer handoff is preferred when evidence is weak.",
];

const failureRows = [
  ["Social context", "Autonomous public transportation in a fast-changing city environment.", Users],
  ["Failure mode", "Norm transgression", AlertTriangle],
  ["System norm", "Destination is normal unless explicit evidence says otherwise.", Bot],
  ["User norm", "When safety is uncertain, the system should become cautious.", Handshake],
  ["Harms", "Physical harm, lost trust, and socially unacceptable automation.", ShieldAlert],
  ["Design response", "Slow down, explain uncertainty, and recommend a safer nearby handoff.", Sparkles],
] as const;

export function EthicsToolkit() {
  const [selectedTool, setSelectedTool] = useState<ToolkitToolId>("value-map");
  const selected = tools.find((tool) => tool.id === selectedTool) ?? tools[0];
  const connectedValues = useMemo(
    () => new Set(valueLinks.filter(([stakeholder]) => stakeholders.includes(stakeholder)).map(([, value]) => value)),
    [],
  );

  return (
    <section className="grid gap-6">
      <ToolkitHero />

      <section className="grid gap-3 lg:grid-cols-3">
        {tools.map((tool, index) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            active={selectedTool === tool.id}
            index={index}
            onSelect={() => setSelectedTool(tool.id)}
          />
        ))}
      </section>

      <motion.section
        layout
        className="glass-panel-strong overflow-hidden p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="metric-label">{selected.eyebrow}</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">{selected.title}</h2>
          </div>
          <span className={cn("inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold", selected.accent)}>
            <selected.icon className="size-4" aria-hidden="true" />
            Active tool
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTool}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {selectedTool === "value-map" ? <ValueMap connectedValues={connectedValues} /> : null}
            {selectedTool === "metaphor" ? <MetaphorPanel /> : null}
            {selectedTool === "failure-mode" ? <FailureModePanel /> : null}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <EthicsPriorityRadar />
        <ConfidenceFlow />
      </section>
    </section>
  );
}

function ToolkitHero() {
  return (
    <motion.section
      className="glass-panel-strong relative overflow-hidden p-6"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center">
        <div>
          <div className="metric-label">Design Tools</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-white md:text-5xl">Ethics Design Toolkit</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            How the Robo-Cab makes uncertainty visible instead of pretending perfect detection.
          </p>
          <p className="mt-5 max-w-3xl rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] p-4 text-sm font-semibold leading-6 text-cyan-50">
            The system does not assume safety when evidence is incomplete. It slows down, explains uncertainty, and
            recommends safer handoff when needed.
          </p>
        </div>

        <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <motion.div
            className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15),transparent_58%)]" />
          <div className="relative z-10 flex h-full min-h-[180px] flex-col items-center justify-center text-center">
            <span className="flex size-16 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_45px_rgba(34,211,238,0.20)]">
              <BrainCircuit className="size-8" aria-hidden="true" />
            </span>
            <div className="mt-4 text-sm font-semibold text-white">Ethics brain online</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-slate-400">
              <span>Sense</span>
              <span>Explain</span>
              <span>Act</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ToolCard({
  tool,
  active,
  index,
  onSelect,
}: {
  tool: ToolkitTool;
  active: boolean;
  index: number;
  onSelect: () => void;
}) {
  const Icon = tool.icon;

  return (
    <motion.button
      type="button"
      layout
      className={cn(
        "group min-h-[230px] min-w-0 rounded-lg border p-5 text-left transition duration-200",
        "bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))]",
        active
          ? "border-cyan-200/35 shadow-[0_22px_70px_rgba(34,211,238,0.12)]"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.055]",
      )}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, scale: active ? 1.015 : 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: "easeOut" }}
      aria-pressed={active}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", tool.tone)}>
          <Icon className="size-5 text-slate-950" aria-hidden="true" />
        </span>
        <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-bold", active ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-400")}>
          {active ? "Selected" : "Explore"}
        </span>
      </div>
      <div className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{tool.eyebrow}</div>
      <h2 className="mt-1 text-xl font-semibold text-white">{tool.title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{tool.summary}</p>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
        <span className="font-bold text-slate-100">Why it matters: </span>
        {tool.why}
      </div>
    </motion.button>
  );
}

function ValueMap({ connectedValues }: { connectedValues: Set<string> }) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.08fr]">
      <div className="grid gap-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Users className="size-4" aria-hidden="true" />
            Stakeholders
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stakeholders.map((stakeholder) => (
              <NodeChip key={stakeholder} label={stakeholder} icon={MapPinned} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
            <Scale className="size-4" aria-hidden="true" />
            Values
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {values.map((value) => (
              <NodeChip key={value} label={value} active={connectedValues.has(value)} icon={Sparkles} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200/25 bg-amber-300/[0.10] p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-100">
            <Zap className="size-4" aria-hidden="true" />
            Trust vs. Autopilot Certainty
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            The prototype prioritizes honest uncertainty over false confidence. Trust comes from explaining limits.
          </p>
        </div>
      </div>

      <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/45 p-4">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 360" preserveAspectRatio="none" aria-hidden="true">
          {networkLines.map((line, index) => (
            <motion.path
              key={`${line.from}-${line.to}`}
              d={`M ${line.x1} ${line.y1} C ${line.cx1} ${line.cy1}, ${line.cx2} ${line.cy2}, ${line.x2} ${line.y2}`}
              fill="none"
              stroke={line.tone}
              strokeWidth="1.3"
              strokeOpacity="0.42"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
            />
          ))}
        </svg>

        {networkNodes.map((node, index) => (
          <motion.div
            key={node.label}
            className={cn(
              "absolute max-w-[138px] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-3 py-2 text-center text-xs font-bold shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur",
              node.kind === "stakeholder"
                ? "border-cyan-200/25 bg-cyan-300/[0.13] text-cyan-50"
                : "border-violet-200/25 bg-violet-300/[0.13] text-violet-50",
              "featured" in node && node.featured && "border-amber-200/40 bg-amber-300/[0.16] text-amber-50",
            )}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: "featured" in node && node.featured ? 1.05 : 1 }}
            transition={{ duration: 0.32, delay: index * 0.04 }}
          >
            {node.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NodeChip({ label, icon: Icon, active = false }: { label: string; icon: LucideIcon; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 min-w-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold",
        active ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-300",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

const networkNodes = [
  { label: "Tourists", kind: "stakeholder", x: 17, y: 22 },
  { label: "Pedestrians", kind: "stakeholder", x: 16, y: 49 },
  { label: "Emergency responders", kind: "stakeholder", x: 22, y: 78 },
  { label: "Engineers", kind: "stakeholder", x: 76, y: 27 },
  { label: "Tech companies", kind: "stakeholder", x: 79, y: 72 },
  { label: "Trust", kind: "value", x: 48, y: 20, featured: true },
  { label: "Safety", kind: "value", x: 47, y: 43 },
  { label: "Accountability", kind: "value", x: 49, y: 63, featured: true },
  { label: "Reliability", kind: "value", x: 47, y: 82 },
  { label: "Transparency", kind: "value", x: 66, y: 48 },
] as const;

const networkLines = [
  { from: "Tourists", to: "Trust", x1: 105, y1: 78, cx1: 190, cy1: 62, cx2: 245, cy2: 70, x2: 298, y2: 72, tone: "#67e8f9" },
  { from: "Tourists", to: "Safety", x1: 105, y1: 78, cx1: 185, cy1: 92, cx2: 242, cy2: 132, x2: 292, y2: 154, tone: "#67e8f9" },
  { from: "Pedestrians", to: "Safety", x1: 100, y1: 176, cx1: 170, cy1: 174, cx2: 230, cy2: 162, x2: 292, y2: 154, tone: "#67e8f9" },
  { from: "Pedestrians", to: "Accountability", x1: 100, y1: 176, cx1: 180, cy1: 200, cx2: 242, cy2: 222, x2: 304, y2: 226, tone: "#a78bfa" },
  { from: "Emergency", to: "Reliability", x1: 136, y1: 281, cx1: 210, cy1: 286, cx2: 256, cy2: 296, x2: 292, y2: 295, tone: "#fbbf24" },
  { from: "Engineers", to: "Transparency", x1: 472, y1: 97, cx1: 425, cy1: 118, cx2: 405, cy2: 155, x2: 409, y2: 173, tone: "#a78bfa" },
  { from: "Engineers", to: "Accountability", x1: 472, y1: 97, cx1: 420, cy1: 150, cx2: 360, cy2: 205, x2: 304, y2: 226, tone: "#a78bfa" },
  { from: "Tech", to: "Trust", x1: 490, y1: 259, cx1: 440, cy1: 212, cx2: 360, cy2: 110, x2: 298, y2: 72, tone: "#fb7185" },
  { from: "Tech", to: "Accountability", x1: 490, y1: 259, cx1: 430, cy1: 258, cx2: 360, cy2: 235, x2: 304, y2: 226, tone: "#fb7185" },
];

function MetaphorPanel() {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="grid gap-3">
        <MetaphorCard
          label="Old metaphor"
          icon={Bot}
          title="Autopilot on fixed tracks"
          copy="The map behaves like the destination is normal unless explicit danger is proven."
          tone="border-rose-200/25 bg-rose-300/[0.08] text-rose-100"
        />
        <motion.div
          className="mx-auto flex size-11 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-300/[0.10] text-cyan-100"
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </motion.div>
        <MetaphorCard
          label="New metaphor"
          icon={Compass}
          title="Cautious human guide"
          copy="The map acknowledges uncertainty, explains what it knows, and changes behavior when evidence is weak."
          tone="border-cyan-200/25 bg-cyan-300/[0.08] text-cyan-100"
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Workflow className="size-4 text-cyan-100" aria-hidden="true" />
          Translation into interface behavior
        </div>
        <div className="mt-4 grid gap-3">
          {metaphorSteps.map((step, index) => (
            <motion.div
              key={step}
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-slate-950/35 p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: index * 0.08 }}
            >
              <span className="flex size-8 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-300/[0.10] text-xs font-bold text-cyan-100">
                {index + 1}
              </span>
              <div className="text-sm font-semibold leading-6 text-slate-100">{step}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaphorCard({
  label,
  icon: Icon,
  title,
  copy,
  tone,
}: {
  label: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  tone: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", tone)}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
    </div>
  );
}

function FailureModePanel() {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
      <div className="rounded-lg border border-rose-200/25 bg-rose-300/[0.09] p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-100">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Main failure mode
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-white">Norm transgression</h3>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          A Robo-Cab can technically reach the destination but still fail socially if it ignores uncertainty, hides risk,
          or acts with false confidence.
        </p>
        <details className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
          <summary className="cursor-pointer text-sm font-bold text-slate-100">Learn more</summary>
          <p className="mt-2 leading-6">
            This prototype treats uncertainty as design material. It changes the route decision, the explanation, and
            the handoff recommendation before the system overclaims safety.
          </p>
        </details>
      </div>

      <div className="relative grid gap-3">
        {failureRows.map(([label, value, Icon], index) => (
          <motion.div
            key={label}
            className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[42px_minmax(0,1fr)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: index * 0.05 }}
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-slate-950/40 text-cyan-100">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-semibold leading-6 text-slate-100">{value}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EthicsPriorityRadar() {
  return (
    <motion.section
      className="glass-panel p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Visual analytics</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Ethics priority radar</h2>
        </div>
        <span className="rounded-lg border border-violet-200/25 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
          Design weight
        </span>
      </div>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer>
          <RechartsRadarChart data={radarData} outerRadius="72%">
            <PolarGrid stroke="var(--subtle-border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--soft-text)", fontSize: 10 }} />
            <Radar
              name="Priority"
              dataKey="priority"
              stroke="#67e8f9"
              fill="url(#toolkitRadarGradient)"
              fillOpacity={0.5}
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
              <linearGradient id="toolkitRadarGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="54%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function ConfidenceFlow() {
  return (
    <motion.section
      className="glass-panel p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: 0.04, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Behavior policy</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Confidence behavior flow</h2>
        </div>
        <Info className="size-5 text-cyan-200" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {flowStates.map((state, index) => {
          const Icon = state.icon;
          return (
            <motion.div
              key={state.label}
              className={cn("relative rounded-lg border p-4", state.className)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.06 }}
            >
              {index < flowStates.length - 1 ? (
                <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 -translate-y-1/2 text-slate-500 md:block" aria-hidden="true" />
              ) : null}
              <Icon className="size-5" aria-hidden="true" />
              <div className="mt-3 text-sm font-bold text-white">{state.label}</div>
              <div className="mt-1 text-xs font-semibold leading-5 text-slate-300">{state.action}</div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] p-3 text-sm font-semibold leading-6 text-cyan-50">
        The system is not detecting perfect danger. It is detecting uncertainty and making that uncertainty actionable.
      </p>
    </motion.section>
  );
}
