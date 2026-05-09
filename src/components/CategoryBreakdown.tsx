import { motion } from "framer-motion";
import { ClipboardCheck, Eye, LockKeyhole, Scale, Shield, Users } from "lucide-react";
import type { CategoryScore } from "@/types";
import { categoryTone } from "@/lib/utils";

const icons: Record<CategoryScore["key"], typeof Shield> = {
  fairness: Scale,
  privacy: LockKeyhole,
  transparency: Eye,
  accountability: ClipboardCheck,
  safety: Shield,
  societal: Users,
};

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <section className="glass-panel min-w-0 p-4 sm:p-5">
      <div>
        <div className="metric-label">Category breakdown</div>
        <h2 className="mt-1 text-xl font-semibold text-white">Ethical pressure points</h2>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {categories.map((category, index) => {
          const Icon = icons[category.key];

          return (
            <motion.article
              key={category.key}
              className="subtle-panel card-hover min-w-0 p-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${categoryTone[category.tone]}`}
                  >
                    <Icon className="size-5 text-slate-950" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{category.summary}</p>
                  </div>
                </div>
                <span className="text-xl font-semibold text-white">{category.score}</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${categoryTone[category.tone]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${category.score}%` }}
                  transition={{ duration: 0.7, delay: 0.08 + index * 0.04, ease: "easeOut" }}
                />
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
