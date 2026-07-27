import { motion } from "framer-motion";

export function ReglaScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-6 text-5xl">📋</div>
        <h2 className="font-serif-holy text-2xl font-semibold text-[#1c1c1e]">Regla de Vida</h2>
        <p className="mt-2 text-sm text-[#9a9a9f]">Tus compromisos espirituales</p>
        <div className="mt-8 h-px w-16 bg-[#e6e3db] mx-auto" />
        <p className="mt-6 text-xs text-[#a8a8ad] italic">Esta sección estará disponible próximamente</p>
      </motion.div>
    </div>
  );
}
