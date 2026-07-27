import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { CaminoScreen } from "@/screens/CaminoScreen";
import { ReglaScreen } from "@/screens/ReglaScreen";
import { RosarioScreen } from "@/screens/RosarioScreen";
import { ComunidadScreen } from "@/screens/ComunidadScreen";
import { PerfilScreen } from "@/screens/PerfilScreen";
import { AuthPortal } from "@/screens/AuthPortal";
import { AuthProvider } from "@/auth/AuthProvider";
import { SpiritualProvider } from "@/fruits/store";

function Shell() {
  const [tab, setTab] = useState<Tab>("perfil");
  const [authOpen, setAuthOpen] = useState(false);

  const dark = tab === "rosario";

  const content: Record<Tab, React.ReactNode> = {
    camino: <CaminoScreen />,
    regla: <ReglaScreen />,
    rosario: <RosarioScreen />,
    comunidad: <ComunidadScreen />,
    perfil: <PerfilScreen onOpenAuth={() => setAuthOpen(true)} />,
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-0 sm:p-6"
      style={{ background: "radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)" }}
    >
      <div className="relative w-full max-w-[430px] sm:rounded-[3rem] sm:border-[10px] sm:border-black sm:shadow-2xl">
        <div
          className="relative overflow-hidden bg-[#f7f6f3] sm:h-[900px] sm:rounded-[2.4rem]"
          style={{ height: "100dvh" }}
        >
          {/* Simulated notch */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />

          {/* Screen content */}
          <div className="no-scrollbar h-full overflow-y-auto" style={{ background: dark ? "#0a0a0b" : "#f7f6f3" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-full"
              >
                {content[tab]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Nav */}
          <BottomNav active={tab} onChange={setTab} dark={dark} />

          {/* Auth portal overlay */}
          <AnimatePresence>
            {authOpen && (
              <div className="absolute inset-0 z-50">
                <AuthPortal onClose={() => setAuthOpen(false)} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isAuthCallback =
    typeof window !== "undefined" && window.location.pathname === "/auth/callback";

  if (isAuthCallback) {
    return (
      <AuthProvider>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-[#9a9a9f]">Cargando...</p>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <SpiritualProvider>
        <Shell />
      </SpiritualProvider>
    </AuthProvider>
  );
}

if (typeof window !== "undefined") {
  console.log("[camino] bundle loaded", { ts: Date.now(), deploy: "2026-07-26T07:20:00-06:00" });
}
