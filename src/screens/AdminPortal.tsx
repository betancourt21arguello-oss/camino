import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { WORKER_API_BASE } from "../config";
import { defaultTasks, type TaskCategory } from "../rule/tasks";

export function AdminPortal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"garden" | "gemini" | "upload" | "telegram" | "tasks">("gemini");

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#0e0e10] text-white">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <button onClick={onClose} className="text-sm text-white/50">← Cerrar</button>
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[var(--gold)]">ADMIN</span>
        <span className="w-14" />
      </header>

      <nav className="flex shrink-0 gap-1 px-3 pt-3">
        {(["gemini", "upload", "tasks", "garden", "telegram"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-2 py-2 text-[11px] font-medium capitalize transition ${
              tab === t ? "bg-[var(--gold)] text-black" : "bg-white/[0.06] text-white/60"
            }`}
          >
            {t === "gemini" ? "Gemini" : t === "upload" ? "Subir audio" : t === "tasks" ? "Tareas" : t === "garden" ? "Jardín" : "Telegram"}
          </button>
        ))}
      </nav>

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        {tab === "gemini" && <GeminiPanel />}
        {tab === "upload" && <UploadPanel />}
        {tab === "tasks" && <TasksPanel />}
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
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

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

  const fetchContent = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/daily?date=${date}`, {
        method: "GET",
      });
      const data = await res.json();
      if (res.ok && data) {
        setContent(JSON.stringify(data, null, 2));
        setEditing(true);
        setResult(`✅ Contenido cargado para ${date}`);
      } else {
        setResult(`❌ Error ${res.status}: ${data?.error || "Contenido no encontrado"}`);
      }
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  const saveContent = async () => {
    setBusy(true);
    setResult("");
    try {
      const parsedContent = JSON.parse(content);
      const res = await fetch(`${WORKER_API_BASE}/daily`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, ...parsedContent }),
      });
      const text = await res.text();
      setResult(res.ok ? `✅ Guardado para ${date}` : `❌ Error ${res.status}: ${text}`);
      if (res.ok) setEditing(false);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error al parsear JSON"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Push manual de Gemini API</h2>
      <p className="text-sm text-white/60">Genera o edita el contenido litúrgico para una fecha específica.</p>

      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />
        <button
          onClick={trigger}
          disabled={busy}
          className="h-12 w-32 rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
        >
          {busy ? "Generando…" : "Generar"}
        </button>
        <button
          onClick={fetchContent}
          disabled={busy}
          className="h-12 w-32 rounded-2xl bg-white/10 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Cargando…" : "Cargar"}
        </button>
      </div>

      {editing && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30"
            rows={15}
            placeholder="Contenido en formato JSON"
          />
          <button
            onClick={saveContent}
            disabled={busy}
            className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}

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

// Assign tasks to user(s)
function TasksPanel() {
  const [target, setTarget] = useState<"user" | "all">("user");
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; full_name?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedTasks, setSelectedTasks] = useState<{ title: string; category: TaskCategory; cadence: string; time?: string }[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<TaskCategory>("custom");
  const [customCadence, setCustomCadence] = useState<"daily" | "weekly" | "monthly">("daily");
  const [customTime, setCustomTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`${WORKER_API_BASE}/admin/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleTask = (t: (typeof defaultTasks)[number]) => {
    setSelectedTasks((prev) => {
      const exists = prev.find((p) => p.title === t.title && p.category === t.category);
      if (exists) return prev.filter((p) => p !== exists);
      return [...prev, { title: t.title, category: t.category, cadence: t.cadence, time: t.time }];
    });
  };

  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    setSelectedTasks((prev) => {
      if (prev.find((p) => p.title === title)) return prev;
      return [...prev, { title, category: customCategory, cadence: customCadence, time: customTime || undefined }];
    });
    setCustomTitle("");
    setCustomTime("");
  };

  const removeTask = (index: number) =>
    setSelectedTasks((prev) => prev.filter((_, i) => i !== index));

  const assign = async () => {
    if (target === "user" && !userId.trim()) return;
    if (selectedTasks.length === 0) return;
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/admin/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target === "all" ? "all" : "single",
          userId: target === "user" ? userId.trim() : undefined,
          taskDate: selectedDate,
          tasks: selectedTasks.map((t) => ({
            title: t.title,
            category: t.category,
            cadence: t.cadence,
            time: t.time || null,
            required: true,
          })),
        }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? `✅ Asignadas ${data.inserted} tareas a ${target === "all" ? "todos los usuarios" : "1 usuario"}`
          : `❌ Error: ${data.error || res.status}`
      );
      if (res.ok) setSelectedTasks([]);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Asignar tareas de vida</h2>
      <p className="text-sm text-white/60">Crea reglas de vida para un usuario específico o para toda la comunidad.</p>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Destinatario</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTarget("user")}
            className={`flex-1 rounded-xl border py-2.5 text-sm capitalize transition ${
              target === "user" ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 text-white/70"
            }`}
          >
            Usuario específico
          </button>
          <button
            onClick={() => setTarget("all")}
            className={`flex-1 rounded-xl border py-2.5 text-sm capitalize transition ${
              target === "all" ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 text-white/70"
            }`}
          >
            Todos los usuarios
          </button>
        </div>

        {target === "user" && (
          <div className="space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por email o nombre…"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
            />
            {searching && <p className="text-xs text-white/40">Buscando…</p>}
            {!searching && searchResults.length > 0 && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04]">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUserId(u.id);
                      setQuery("");
                      setSearchResults([]);
                    }}
                    className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition ${
                      userId === u.id ? "bg-[var(--gold)]/20" : "hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{u.full_name || u.email}</span>
                    <span className="text-[10px] text-white/50">{u.email}</span>
                    <span className="text-[10px] text-white/30 font-mono">{u.id}</span>
                  </button>
                ))}
              </div>
            )}
            {userId && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2">
                <span className="text-xs text-[var(--gold)]">Seleccionado:</span>
                <span className="flex-1 truncate text-sm text-white">{searchResults.find((u) => u.id === userId)?.full_name || searchResults.find((u) => u.id === userId)?.email || userId}</span>
                <span className="max-w-[120px] truncate text-[10px] text-white/40 font-mono">{userId}</span>
                <button onClick={() => setUserId("")} className="text-xs text-white/60 hover:text-white">Cambiar</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Fecha de tareas</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Tareas a asignar</label>
        <p className="text-xs text-white/40">Selecciona las tareas base y agrega las personalizadas que necesites.</p>
        <div className="grid grid-cols-2 gap-2">
          {defaultTasks.map((t) => {
            const active = selectedTasks.some((p) => p.title === t.title && p.category === t.category);
            return (
              <button
                key={`${t.category}-${t.title}`}
                onClick={() => toggleTask(t)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                  active ? "border-[var(--gold)] bg-[var(--gold)]/15 text-white" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
                }`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <span>{t.icon}</span>
                  <span className="truncate">{t.title}</span>
                </span>
                <span className="text-[10px] text-white/40">{t.cadence === "daily" ? "diaria" : t.cadence === "weekly" ? "semanal" : "mensual"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">Agregar tarea personalizada</p>
        <input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Título de la tarea"
          className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30"
        />
        <div className="flex gap-2">
          <select
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value as TaskCategory)}
            className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
          >
            <option value="custom">Personalizada</option>
            <option value="ofrecimiento">Ofrecimiento</option>
            <option value="laudes">Laudes</option>
            <option value="angelus">Ángelus</option>
            <option value="rosary">Rosario</option>
            <option value="gospel">Evangelio</option>
            <option value="psalm">Salmo</option>
            <option value="silence">Silencio</option>
            <option value="mass">Misa</option>
            <option value="examen">Examen</option>
            <option value="fasting">Ayuno</option>
            <option value="confession">Confesión</option>
            <option value="vespers">Vísperas</option>
          </select>
          <select
            value={customCadence}
            onChange={(e) => setCustomCadence(e.target.value as "daily" | "weekly" | "monthly")}
            className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
          >
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
          <input
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            placeholder="HH:MM (opcional)"
            className="h-11 w-28 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <button
          onClick={addCustom}
          disabled={!customTitle.trim()}
          className="h-10 w-full rounded-xl bg-white/10 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-40"
        >
          Agregar a la lista
        </button>
      </div>

      {selectedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Lista seleccionada ({selectedTasks.length})</p>
          <div className="space-y-1">
            {selectedTasks.map((t, i) => (
              <div key={`${t.category}-${t.title}-${i}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm text-white">{t.title}</span>
                  <span className="text-[10px] text-white/40">{t.category} · {t.cadence} {t.time ? `· ${t.time}` : ""}</span>
                </div>
                <button onClick={() => removeTask(i)} className="text-xs text-white/50 hover:text-white">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={assign}
        disabled={busy || selectedTasks.length === 0 || (target === "user" && !userId)}
        className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
      >
        {busy ? "Asignando…" : "Asignar tareas"}
      </button>
      <p className="text-xs text-white/40">Si es diaria, se crea para la fecha indicada. El usuario verá las tareas en su Regla de Vida.</p>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}

// Garden editor
function GardenEditor() {
  const [userId, setUserId] = useState("");
  const [eventType, setEventType] = useState("ROSARY_COMPLETED");
  const [value, setValue] = useState("1");
  const [intention, setIntention] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const eventTypes = [
    "ROSARY_COMPLETED",
    "NOVENA_COMPLETED",
    "CORONILLA_COMPLETED",
    "SILENCE_TIME",
    "WATER_GARDEN",
    "COMMUNITY_PRAYER",
    "STREAK_MAINTAINED",
    "TASK_COMPLETED",
    "SEED_RECEIVED",
    "WATER_RECEIVED",
    "CANDLE_LIT",
    "REFLECTION_COMPLETED",
  ];

  const insertEvent = async () => {
    if (!supabase || !userId.trim()) return;
    setBusy(true);
    setResult("");
    try {
      const { error } = await supabase.rpc("admin_insert_compensatory_event", {
        p_target_user_id: userId.trim(),
        p_event_type: eventType,
        p_value: Number(value) || 0,
        p_intention: intention || null,
        p_created_at: new Date().toISOString(),
      });
      setResult(error ? `❌ Error: ${error.message}` : "✅ Evento compensatorio insertado");
      if (!error) {
        setValue("1");
        setIntention("");
      }
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Editor de Jardín</h2>
      <p className="text-sm text-white/60">Inserta eventos compensatorios para corregir el historial de un usuario.</p>

      <div className="space-y-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UUID del usuario"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />

        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        >
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valor"
          type="number"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />

        <input
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Intención (opcional)"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
        />

        <button onClick={insertEvent} disabled={busy || !userId.trim()} className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50">
          {busy ? "Insertando…" : "Insertar evento compensatorio"}
        </button>
      </div>

      <p className="text-xs text-white/40">
        Esta operación requiere rol admin en Supabase. Para correcciones históricas con fecha pasada, usa el endpoint service_role directamente.
      </p>
      {result && <p className="text-sm">{result}</p>}
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
