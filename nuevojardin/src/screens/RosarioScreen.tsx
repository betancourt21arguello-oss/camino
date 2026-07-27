import { motion } from "framer-motion";

export function RosarioScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-20"
      style={{ background: "#0a0a0b" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-6 text-5xl">📿</div>
        <h2 className="font-serif-holy text-2xl font-semibold text-white">Rosario</h2>
        <p className="mt-2 text-sm text-white/50">Oración comunitaria</p>
        <div className="mt-8 h-px w-16 bg-white/10 mx-auto" />
        <p className="mt-6 text-xs text-white/30 italic">Esta sección estará disponible próximamente</p>
      </motion.div>
    </div>
  );
}
