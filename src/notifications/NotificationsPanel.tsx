import { usePushNotifications } from "./usePushNotifications";

export function NotificationsPanel() {
  const push = usePushNotifications();

  return (
    <div className="mt-5 rounded-2xl border border-[#e6e3db] bg-white p-4">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
        RECORDATORIOS
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[#77736b]">
        Recibe avisos para Ofrecimiento, Laudes, Rosario y tareas pendientes.
      </p>

      {push.iosNeedsInstall && (
        <p className="mt-2 rounded-xl bg-[#f6efdd] px-3 py-2 text-xs leading-relaxed text-[#8a6f34]">
          En iPhone, primero instala Camino como app (Añadir a pantalla de inicio desde Safari).
          Después podrás activar notificaciones push.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={push.enable}
          disabled={push.busy || push.enabled || push.iosNeedsInstall}
          className="h-11 rounded-full bg-[#1c1c1e] text-sm font-medium text-white disabled:opacity-50"
        >
          {push.enabled ? "✓ Push activo" : push.iosNeedsInstall ? "Instalar primero" : "Activar push"}
        </button>
        <button
          onClick={push.enableEmail}
          disabled={push.busy}
          className="h-11 rounded-full border border-[#ddd8cc] text-sm font-medium text-[#1c1c1e] disabled:opacity-50"
        >
          Avisos por correo
        </button>
      </div>
      {push.error && <p className="mt-2 text-xs text-[#a95353]">{push.error}</p>}
    </div>
  );
}
