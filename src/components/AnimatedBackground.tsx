import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="animated-background pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="animated-background-base absolute inset-0" />
      <motion.div
        className="animated-background-aura absolute inset-x-[-22%] top-[-34rem] h-[58rem] blur-3xl"
        animate={{ rotate: [0, 4, -3, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="animated-background-grid absolute inset-0" />
      <div className="animated-background-depth absolute inset-0" />
    </div>
  );
}
