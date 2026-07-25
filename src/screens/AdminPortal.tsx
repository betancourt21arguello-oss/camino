import { useState } from "react";
import { supabase } from "../lib/supabase";
import { WORKER_API_BASE } from "../config";

export function AdminPortal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"garden" | "gemini" | "upload" | "telegram">("gemini");

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#0e0e10] text-white">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <button onClick={onClose} className="text-sm text-white/50">← Cerrar</button>
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[var(--gold)]">ADMIN</span>
        <span className="w-14" />
      </header>

      <nav className="flex shrink-0 gap-1 px-3 pt-3">
        {(["gemini", "upload", "garden", "telegram"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-2 py-2 text-[11px] font-medium capitalize transition ${
              tab === t ? "bg-[var(--gold)] text-black" : "bg-white/[0.06] text-white/60"
            }`}
          >
            {t === "gemini" ? "Gemini" : t === "upload" ? "Subir audio" : t === "garden" ? "Jardín" : "Telegram"}
          </button>
        ))}
      </nav>

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        {tab === "gemini" && <GeminiPanel />}
        {tab === "upload" && <UploadPanel />}
        {tab === "garden" && <GardenEditor />}
        {tab === "telegram" && <TelegramPanel />}
      </div>
    </div>
  );
}

// Gemini manual trigger
function GeminiPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const date = new Date().toISOString().slice(0, 10);

  const trigger = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/daily/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const text = await res.text();
      setResult(res.ok ? `✅ Generado para ${date}` : `❌ Error ${res.status}: ${text}`);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Push manual de Gemini API</h2>
      <p className="text-sm text-white/60">Genera el contenido litúrgico para hoy ({date}).</p>
      <button
        onClick={trigger}
        disabled={busy}
        className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
      >
        {busy ? "Generando…" : "Generar contenido del día"}
      </button>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}

// Upload manual — fallback de WhatsApp
function UploadPanel() {
  const [tag, setTag] = useState("canto");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const tags = ["laudes", "angelus", "evangelio", "salmo", "reflexion", "canto"];

  const upload = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    setResult("");
    try {
      // Upload to Worker → R2
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tag", tag);
      formData.append("title", title.trim());
      formData.append("author", author.trim() || "Admin");

      const res = await fetch(`${WORKER_API_BASE}/admin/upload-audio`, {
        method: "POST",
        body: formData,
      });
      setResult(res.ok ? "✅ Audio publicado" : `❌ Error ${res.status}`);
      if (res.ok) { setTitle(""); setFile(null); }
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Subir audio manualmente</h2>
      <p className="text-sm text-white/60">Fallback directo sin WhatsApp ni Telegram.</p>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              tag === t ? "bg-[var(--gold)] text-black" : "bg-white/10 text-white/70"
            }`}
          >
            #{t}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del audio"
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
      />
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Autor (opcional)"
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
      />
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-white/60"
      />

      <button
        onClick={upload}
        disabled={busy || !file || !title.trim()}
        className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
      >
        {busy ? "Subiendo…" : "Publicar audio"}
      </button>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}

// Garden editor
function GardenEditor() {
  const [userId, setUserId] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const loadUser = async () => {
    if (!supabase || !userId.trim()) return;
    setBusy(true);
    const { data } = await supabase
      .from("garden_events")
      .select("id,event_type,value")
      .eq("user_id", userId.trim())
      .order("created_at");
    if (data) {
      const summary: Record<string, string> = {};
      data.forEach((row: { event_type: string; value: number }) => {
        summary[row.event_type] = String(
          (Number(summary[row.event_type] ?? 0)) + row.value,
        );
      });
      setFields(summary);
      setLoaded(true);
    }
    setBusy(false);
  };

  const save = async () => {
    setResult("Los valores del jardín se derivan de garden_events (append-only). Para corregir, inserta eventos compensatorios desde la tabla directamente.");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Editor de Jardín</h2>
      <p className="text-sm text-white/60">Visualiza los eventos acumulados de un usuario.</p>
      <div className="flex gap-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UUID del usuario"
          className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />
        <button onClick={loadUser} disabled={busy} className="h-11 rounded-xl bg-white/10 px-4 text-sm">
          {busy ? "…" : "Cargar"}
        </button>
      </div>
      {loaded && (
        <div className="space-y-2">
          {Object.entries(fields).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-white/50 w-40 truncate">{key}</span>
              <input
                value={val}
                onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-sm text-white"
              />
            </div>
          ))}
          <button onClick={save} className="h-10 w-full rounded-xl bg-white/10 text-sm">
            Nota sobre edición
          </button>
          {result && <p className="text-xs text-white/60">{result}</p>}
        </div>
      )}
    </div>
  );
}

// Telegram integration panel
function TelegramPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Integración Telegram</h2>
      <p className="text-sm text-white/60">
        Tercer canal para subir acompañamiento. Funciona igual que WhatsApp:
        el admin envía un audio con caption <code className="text-[var(--gold)]">#tag | Autor | Título</code> al bot.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80 space-y-2">
        <p><strong>1.</strong> Crea un bot con @BotFather en Telegram.</p>
        <p><strong>2.</strong> Copia el token del bot → <code>TELEGRAM_BOT_TOKEN</code> en el Worker.</p>
        <p><strong>3.</strong> Configura el webhook:</p>
        <code className="block rounded bg-black/40 px-2 py-1 text-xs">
          curl -X POST "https://api.telegram.org/bot{'<TOKEN>'}/setWebhook?url=https://camino-api.byp.workers.dev/telegram"
        </code>
        <p><strong>4.</strong> Define <code>TELEGRAM_ADMIN_CHAT_ID</code> con tu chat ID.</p>
        <p><strong>5.</strong> El Worker procesa el audio igual que WhatsApp: descarga → R2 → Supabase → Realtime.</p>
      </div>
      <p className="text-xs text-white/40">
        El endpoint <code>/telegram</code> usa la misma lógica que <code>/whatsapp</code>. Ver whatsapp.md.
      </p>
    </div>
  );
}
