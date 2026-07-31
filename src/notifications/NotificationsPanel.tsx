import { useOneSignal } from "../onesignal/OneSignalProvider";

export function NotificationsPanel() {
  const push = useOneSignal();

  return (
    <div className="mt-5 rounded-2xl border border-[#e6e3db] bg-white p-4">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
        NOTIFICACIONES
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[#77736b]">
        Activa las notificaciones para recibir avisos de la Coronilla de la Divina Misericordia
        (3:00 PM), recordatorios de riego del jardín (8:00 PM), oraciones comunitarias y tareas pendientes.
      </p>

      {!push.iossupported && (
        <p className="mt-2 rounded-xl bg-[#f6efdd] px-3 py-2 text-xs leading-relaxed text-[#8a6f34]">
          En iPhone, primero instala Camino como app (Añadir a pantalla de inicio desde Safari).
          Después podrás activar notificaciones push.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={push.subscribe}
          disabled={push.busy || push.subscribed || !push.iossupported}
          className="h-11 rounded-full bg-[#1c1c1e] text-sm font-medium text-white disabled:opacity-50"
        >
          {push.subscribed ? "✓ Push activo" : !push.iossupported ? "Instalar primero" : "Activar push"}
        </button>
        <button
          onClick={push.unsubscribe}
          disabled={push.busy || !push.subscribed}
          className="h-11 rounded-full border border-[#ddd8cc] text-sm font-medium text-[#1c1c1e] disabled:opacity-50"
        >
          Desactivar
        </button>
      </div>
      {push.error && <p className="mt-2 text-xs text-[#a95353]">{push.error}</p>}
    </div>
  );
}