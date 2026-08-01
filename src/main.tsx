import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Registrar Service Worker para PWA (requerido para instalación en Android/Chrome)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[Camino] Service Worker registrado:", registration.scope);
      })
      .catch((error) => {
        console.warn("[Camino] Error al registrar Service Worker:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
