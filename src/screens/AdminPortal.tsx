import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { WORKER_API_BASE } from "../config";
import { defaultTasks, type TaskCategory } from "../rule/tasks";
import { computeDna, deriveDnaTraits } from "../garden/dna";
import { aggregateGardenState } from "../garden/events";
import { derivePersonalTraits, type PersonalTraits, type PersonalInput } from "../garden/personal";
import type { DnaTraits, GardenState } from "../garden/types";
import { caracasDate } from "../utils/caracas";

export function AdminPortal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"garden" | "gemini" | "upload" | "telegram" | "tasks" | "images" | "oraciones">("gemini");

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#0e0e10] text-white">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <button onClick={onClose} className="text-sm text-white/50">← Cerrar</button>
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[var(--gold)]">ADMIN</span>
        <span className="w-14" />
      </header>

      <nav className="flex shrink-0 gap-1 px-3 pt-3">
        {(["gemini", "upload", "tasks", "garden", "telegram", "images", "oraciones"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-2 py-2 text-[11px] font-medium capitalize transition ${
              tab === t ? "bg-[var(--gold)] text-black" : "bg-white/[0.06] text-white/60"
            }`}
          >
            {t === "gemini" ? "Gemini" : t === "upload" ? "Subir audio" : t === "tasks" ? "Tareas" : t === "garden" ? "Jardín" : t === "telegram" ? "Telegram" : t === "images" ? "Imágenes" : "Oraciones"}
          </button>
        ))}
      </nav>

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        {tab === "gemini" && <GeminiPanel />}
        {tab === "upload" && <UploadPanel />}
        {tab === "tasks" && <TasksPanel />}
        {tab === "garden" && <GardenEditor />}
        {tab === "telegram" && <TelegramPanel />}
        {tab === "images" && <ImagePanel />}
        {tab === "oraciones" && <OracionesPanel />}
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
  const [date, setDate] = useState(caracasDate());

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
            id="admin-content"
            name="admin-content"
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
      if (res.ok) {
        setTitle("");
        setFile(null);
        try {
          const bc = new BroadcastChannel("camino-assets");
          bc.postMessage({ type: "refresh-assets" });
          bc.close();
        } catch {
          // BroadcastChannel not supported
        }
      }
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
  const [selectedDate, setSelectedDate] = useState(() => caracasDate());
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
  // Helper function to clamp numbers
  const clampNumber = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; full_name: string | null; name: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; full_name: string | null; name: string | null } | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGarden, setLoadingGarden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  // Garden data state
  const [dnaTraits, setDnaTraits] = useState<DnaTraits | null>(null);
  const [gardenState, setGardenState] = useState<Partial<GardenState> | null>(null);
  const [personalInput, setPersonalInput] = useState<PersonalInput | null>(null);
  const [personalTraits, setPersonalTraits] = useState<PersonalTraits | null>(null);

  // Fetch all users
  const fetchUsers = async () => {
    if (!supabase) return;
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, name")
        .order("email")
        .limit(100);
      if (!error && data) {
        setSearchResults(data);
      }
    } catch (e) {
      setResult(`❌ Error al cargar usuarios: ${e instanceof Error ? e.message : "Error"}`);
    }
    setLoadingUsers(false);
  };

  // Search users
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0 && searchQuery.trim().length < 2) return;
      if (!supabase) return;
      
      if (searchQuery.trim() === "") {
        fetchUsers();
        return;
      }
      
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, full_name, name")
          .or(`(email.ilike.%${searchQuery}%),(full_name.ilike.%${searchQuery}%),(name.ilike.%${searchQuery}%)`)
          .order("email")
          .limit(50);
        if (!error && data) {
          setSearchResults(data);
        }
      } catch (e) {
        setResult(`❌ Error al buscar: ${e instanceof Error ? e.message : "Error"}`);
      }
      setLoadingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load garden data for selected user
  const loadGardenData = async () => {
    if (!supabase || !selectedUser) return;
    setLoadingGarden(true);
    setResult("");
    
    try {
      // Calculate DNA traits from user ID
      const dna = computeDna(selectedUser.id);
      const traits = deriveDnaTraits(dna);
      setDnaTraits({ ...traits, dna });

      // Get garden events
      const { data: events } = await supabase
        .from("garden_events")
        .select("*")
        .eq("user_id", selectedUser.id)
        .order("created_at", { ascending: true });

      // Get active candles
      const { data: candles } = await supabase
        .from("candles")
        .select("*")
        .eq("owner_id", selectedUser.id)
        .gte("expires_at", new Date().toISOString());

      const activeCandles = candles?.length || 0;

      // Calculate garden state
      const state = aggregateGardenState(
        events?.map(e => ({ ...e, created_at: e.created_at })) || [],
        activeCandles
      );
      setGardenState(state);

      // Get profile data for personal input
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, registered_at, points, last_seen_at")
        .eq("id", selectedUser.id)
        .single();

      // Get fruits data
      const { data: fruits } = await supabase
        .from("fruits")
        .select("*")
        .eq("profile_id", selectedUser.id)
        .single();

      if (profile) {
        const fruitsData = fruits as { semilla?: number; vela?: number; agua?: number } | null;
        const personalInputData: PersonalInput = {
          name: profile.name || selectedUser.full_name || selectedUser.email || "",
          registeredAt: new Date(profile.registered_at || selectedUser.id.slice(0, 10)),
          points: fruitsData?.semilla || profile.points || 0,
          lastSeenAt: profile.last_seen_at ? new Date(profile.last_seen_at) : new Date(),
        };
        setPersonalInput(personalInputData);
        
        const personalTraitsData = derivePersonalTraits(personalInputData);
        setPersonalTraits(personalTraitsData);
      }
    } catch (e) {
      setResult(`❌ Error al cargar datos del jardín: ${e instanceof Error ? e.message : "Error"}`);
    }
    setLoadingGarden(false);
  };

  // Load garden data when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadGardenData();
    }
  }, [selectedUser]);

  // Store original state for comparison
  const [originalGardenState, setOriginalGardenState] = useState<Partial<GardenState> | null>(null);
  const [originalPersonalInput, setOriginalPersonalInput] = useState<PersonalInput | null>(null);

  // Handle field changes
  const handleDnaChange = (field: string, value: any) => {
    setDnaTraits((prev: DnaTraits | null) => prev ? { ...prev, [field]: value } : null);
  };

  const handleStateChange = (field: string, value: any) => {
    setGardenState((prev: Partial<GardenState> | null) => prev ? { ...prev, [field]: value } : null);
  };

  const handlePersonalInputChange = (field: string, value: any) => {
    setPersonalInput((prev: PersonalInput | null) => prev ? { ...prev, [field]: value } : null);
  };

  // Save original state when data is loaded
  useEffect(() => {
    if (gardenState) {
      setOriginalGardenState({ ...gardenState });
    }
  }, [gardenState]);

  useEffect(() => {
    if (personalInput) {
      setOriginalPersonalInput({ ...personalInput });
    }
  }, [personalInput]);

  // Save changes
  const saveChanges = async () => {
    if (!supabase || !selectedUser || !personalInput) return;
    setBusy(true);
    setResult("");

    try {
      const results: string[] = [];

      // 1. Update profile data
      if (personalInput && originalPersonalInput) {
        const profileUpdates: any = {};
        
        if (personalInput.name !== originalPersonalInput.name) {
          profileUpdates.name = personalInput.name;
        }
        
        if (personalInput.points !== originalPersonalInput.points) {
          profileUpdates.points = personalInput.points;
        }
        
        if (personalInput.lastSeenAt && 
            (!originalPersonalInput.lastSeenAt || 
             personalInput.lastSeenAt.getTime() !== originalPersonalInput.lastSeenAt.getTime())) {
          profileUpdates.last_seen_at = personalInput.lastSeenAt.toISOString();
        }
        
        if (personalInput.registeredAt &&
            personalInput.registeredAt.getTime() !== originalPersonalInput.registeredAt.getTime()) {
          profileUpdates.registered_at = personalInput.registeredAt.toISOString();
        }
        
        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdates)
            .eq("id", selectedUser.id);
          
          if (profileError) {
            results.push(`❌ Error al actualizar perfil: ${profileError.message}`);
          } else {
            results.push("✅ Perfil actualizado");
          }
        }
      }

      // 2. Update fruits (vela, semilla, agua) based on personalInput.points
      // Fruits affect the garden state calculation
      if (personalInput && personalInput.points !== originalPersonalInput?.points) {
        // Update fruits - assuming points come from semilla (seeds)
        const { error: fruitsError } = await supabase
          .from("fruits")
          .upsert({
            profile_id: selectedUser.id,
            semilla: personalInput.points,
            vela: 0,
            agua: 0,
            updated_at: new Date().toISOString(),
          })
          .select();
        
        if (fruitsError) {
          results.push(`❌ Error al actualizar frutas: ${fruitsError.message}`);
        } else {
          results.push("✅ Frutas actualizadas");
        }
      }

      // 3. Insert compensatory events for garden state changes
      if (gardenState && originalGardenState) {
        // Insert events for changed values
        const eventMap: Record<string, { type: string; valueField?: string }> = {
          totalRosaries: { type: "ROSARY_COMPLETED", valueField: "value" },
          totalNovenas: { type: "NOVENA_COMPLETED", valueField: "value" },
          totalCoronillas: { type: "CORONILLA_COMPLETED", valueField: "value" },
          totalWaterings: { type: "WATER_GARDEN", valueField: "value" },
          totalCandles: { type: "CANDLE_LIT", valueField: "value" },
          totalSilence: { type: "SILENCE_TIME", valueField: "value" },
          streak: { type: "STREAK_MAINTAINED", valueField: "value" },
        };

        // Check each field that can be adjusted with events
        for (const [field, config] of Object.entries(eventMap)) {
          const currentValue = (gardenState as any)[field] || 0;
          const originalValue = (originalGardenState as any)[field] || 0;
          
          if (currentValue > originalValue) {
            const diff = currentValue - originalValue;
            if (diff > 0) {
              // Insert compensatory events
              const { error: eventError } = await supabase.rpc("admin_insert_compensatory_event", {
                p_target_user_id: selectedUser.id,
                p_event_type: config.type,
                p_value: diff,
                p_intention: `Ajuste manual por admin - ${field}`,
                p_created_at: new Date().toISOString(),
              });
              
              if (eventError) {
                results.push(`❌ Error al insertar evento ${config.type}: ${eventError.message}`);
              } else {
                results.push(`✅ ${diff} eventos ${config.type} insertados`);
              }
            }
          }
        }

        // For waterLevel and lightLevel, we can insert WATER_GARDEN events
        if ((gardenState.waterLevel || 0) > (originalGardenState.waterLevel || 0)) {
          const waterDiff = Math.ceil(((gardenState.waterLevel || 0) - (originalGardenState.waterLevel || 0)) / 22);
          if (waterDiff > 0) {
            const { error: waterError } = await supabase.rpc("admin_insert_compensatory_event", {
              p_target_user_id: selectedUser.id,
              p_event_type: "WATER_GARDEN",
              p_value: waterDiff,
              p_intention: "Ajuste manual de nivel de agua por admin",
              p_created_at: new Date().toISOString(),
            });
            
            if (waterError) {
              results.push(`❌ Error al ajustar agua: ${waterError.message}`);
            } else {
              results.push(`✅ ${waterDiff} riegos compensatorios insertados`);
            }
          }
        }
      }

       const errorResults = results.filter(r => r.startsWith("❌"));
       const successResults = results.filter(r => r.startsWith("✅"));
       setResult(errorResults.length > 0 
         ? errorResults.join(" \n ") 
         : (successResults.length > 0 ? successResults.join(" \n ") : "✅ Cambios guardados correctamente"));
      
      // Reload garden data to reflect changes
      await loadGardenData();
    } catch (e) {
      setResult(`❌ Error al guardar: ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  // Type options for dropdowns
  const terrainOptions = ["meadow", "forest", "hill", "desert", "coast", "highland"];
  const pathShapeOptions = ["serpentine", "straight", "spiral", "forked", "circular"];
  const treeSpeciesOptions = ["cedar", "oak", "olive", "palm", "pine", "jacaranda"];
  const rockPatternOptions = ["scattered", "clustered", "cairn", "ring", "sparse"];
  const paletteVariantOptions = ["dawn", "verdant", "amber", "azure", "rose", "dusk"];
  const flowerSpeciesBiasOptions = ["rose", "lily", "lavender", "daisy", "marigold", "iris"];
  const maturityTierOptions = ["seed", "sprout", "tree", "forest"];
  const growthPhaseOptions = [1, 2, 3, 4];
  const gardenSeasonOptions = ["advent", "christmas", "lent", "easter", "pentecost", "ordinary"];
  const timeOfDayOptions = ["madrugada", "manana", "mediodia", "noche"];

  // Label mappings
  const TERRAIN_LABEL: Record<string, string> = {
    meadow: "Pradera", forest: "Bosque", hill: "Colina",
    desert: "Desierto", coast: "Costa", highland: "Altiplano",
  };
  const TREE_LABEL: Record<string, string> = {
    cedar: "Cedro", oak: "Roble", olive: "Olivo",
    palm: "Palma", pine: "Pino", jacaranda: "Jacaranda",
  };
  const MATURITY_LABEL: Record<string, string> = {
    seed: "Semilla", sprout: "Brote", tree: "Árbol", forest: "Bosque",
  };
  const SEASON_LABEL: Record<string, string> = {
    advent: "Adviento", christmas: "Navidad", lent: "Cuaresma",
    easter: "Pascua", pentecost: "Pentecostés", ordinary: "Tiempo Ordinario",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Editor de Jardín</h2>
      <p className="text-sm text-white/60">Selecciona un usuario para editar los datos de su jardín.</p>

      {/* User search and selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Buscar usuario</label>
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 pr-10"
          />
          <button
            onClick={() => fetchUsers()}
            disabled={loadingUsers}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
          >
            {loadingUsers ? "Buscando..." : "🔍"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04]">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition ${
                  selectedUser?.id === u.id ? "bg-[var(--gold)]/20" : "hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-medium text-white">{u.full_name || u.name || u.email}</span>
                <span className="text-[10px] text-white/50">{u.email}</span>
                <span className="text-[10px] text-white/30 font-mono">{u.id.slice(0, 24)}...</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2">
            <span className="text-xs text-[var(--gold)]">Seleccionado:</span>
            <span className="flex-1 truncate text-sm text-white">{selectedUser.full_name || selectedUser.name || selectedUser.email}</span>
            <span className="max-w-[120px] truncate text-[10px] text-white/40 font-mono">{selectedUser.id.slice(0, 8)}...</span>
            <button onClick={() => setSelectedUser(null)} className="text-xs text-white/60 hover:text-white">Cambiar</button>
          </div>
        )}
      </div>

      {/* Garden data display and editing */}
      {selectedUser && (
        <div className="space-y-4">
          {loadingGarden ? (
            <p className="text-sm text-white/60">Cargando datos del jardín...</p>
          ) : (
            <>
              {dnaTraits && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">DNA del Jardín (Inmutable)</h3>
                  <p className="text-xs text-white/40">Estos valores se derivan del ID del usuario y no deberían modificarse.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Terreno</label>
                      <select
                        value={dnaTraits.terrain}
                        onChange={(e) => handleDnaChange("terrain", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {terrainOptions.map((t) => (
                          <option key={t} value={t}>{TERRAIN_LABEL[t] || t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.terrain}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Forma del Camino</label>
                      <select
                        value={dnaTraits.pathShape}
                        onChange={(e) => handleDnaChange("pathShape", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {pathShapeOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.pathShape}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Especie del Árbol</label>
                      <select
                        value={dnaTraits.treeSpecies}
                        onChange={(e) => handleDnaChange("treeSpecies", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {treeSpeciesOptions.map((t) => (
                          <option key={t} value={t}>{TREE_LABEL[t] || t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.treeSpecies}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Patrón de Rocas</label>
                      <select
                        value={dnaTraits.rockPattern}
                        onChange={(e) => handleDnaChange("rockPattern", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {rockPatternOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.rockPattern}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Ángulo del Río</label>
                      <input
                        type="number"
                        value={dnaTraits.riverAngle}
                        onChange={(e) => handleDnaChange("riverAngle", Number(e.target.value))}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      />
                      <span className="text-[10px] text-white/30">-40 a 40 grados</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Paleta de Colores</label>
                      <select
                        value={dnaTraits.paletteVariant}
                        onChange={(e) => handleDnaChange("paletteVariant", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {paletteVariantOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.paletteVariant}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Flor Dominante</label>
                      <select
                        value={dnaTraits.flowerSpeciesBias}
                        onChange={(e) => handleDnaChange("flowerSpeciesBias", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      >
                        {flowerSpeciesBiasOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-white/30">{dnaTraits.flowerSpeciesBias}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Matiz Base</label>
                      <input
                        type="number"
                        value={dnaTraits.baseHue}
                        onChange={(e) => handleDnaChange("baseHue", Number(e.target.value))}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                        disabled
                      />
                      <span className="text-[10px] text-white/30">0-360 grados</span>
                    </div>
                  </div>
                </div>
              )}

              {gardenState && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Estado del Jardín (Editable)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nivel de Agua</label>
                      <input
                        type="number"
                        value={gardenState.waterLevel ?? 0}
                        onChange={(e) => handleStateChange("waterLevel", clampNumber(Number(e.target.value), 0, 100))}
                        min="0"
                        max="100"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                      <span className="text-[10px] text-white/30">0-100</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nivel de Luz</label>
                      <input
                        type="number"
                        value={gardenState.lightLevel ?? 0}
                        onChange={(e) => handleStateChange("lightLevel", clampNumber(Number(e.target.value), 0, 100))}
                        min="0"
                        max="100"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                      <span className="text-[10px] text-white/30">0-100</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Salud</label>
                      <input
                        type="number"
                        value={gardenState.health ?? 0}
                        onChange={(e) => handleStateChange("health", clampNumber(Number(e.target.value), 0, 100))}
                        min="0"
                        max="100"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                      <span className="text-[10px] text-white/30">0-100</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Puntos</label>
                      <input
                        type="number"
                        value={gardenState.pointsScore ?? 0}
                        onChange={(e) => handleStateChange("pointsScore", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nivel</label>
                      <input
                        type="number"
                        value={gardenState.level ?? 0}
                        onChange={(e) => handleStateChange("level", clampNumber(Number(e.target.value), 1, 10))}
                        min="1"
                        max="10"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                      <span className="text-[10px] text-white/30">1-10</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Madurez</label>
                      <select
                        value={gardenState.maturityTier ?? ""}
                        onChange={(e) => handleStateChange("maturityTier", e.target.value as any)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      >
                        {maturityTierOptions.map((t) => (
                          <option key={t} value={t}>{MATURITY_LABEL[t] || t}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Fase de Crecimiento</label>
                      <select
                        value={gardenState.growthPhase ?? 1}
                        onChange={(e) => handleStateChange("growthPhase", Number(e.target.value) as 1 | 2 | 3 | 4)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      >
                        {growthPhaseOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Temporada</label>
                      <select
                        value={gardenState.season ?? ""}
                        onChange={(e) => handleStateChange("season", e.target.value as any)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      >
                        {gardenSeasonOptions.map((t) => (
                          <option key={t} value={t}>{SEASON_LABEL[t] || t}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Hora del Día</label>
                      <select
                        value={gardenState.timeOfDay ?? ""}
                        onChange={(e) => handleStateChange("timeOfDay", e.target.value as any)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      >
                        {timeOfDayOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Rosarios Totales</label>
                      <input
                        type="number"
                        value={gardenState.totalRosaries ?? 0}
                        onChange={(e) => handleStateChange("totalRosaries", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Novenas Totales</label>
                      <input
                        type="number"
                        value={gardenState.totalNovenas ?? 0}
                        onChange={(e) => handleStateChange("totalNovenas", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Coronillas Totales</label>
                      <input
                        type="number"
                        value={gardenState.totalCoronillas ?? 0}
                        onChange={(e) => handleStateChange("totalCoronillas", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Riegos Totales</label>
                      <input
                        type="number"
                        value={gardenState.totalWaterings ?? 0}
                        onChange={(e) => handleStateChange("totalWaterings", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Velas Totales</label>
                      <input
                        type="number"
                        value={gardenState.totalCandles ?? 0}
                        onChange={(e) => handleStateChange("totalCandles", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Racha</label>
                      <input
                        type="number"
                        value={gardenState.streak ?? 0}
                        onChange={(e) => handleStateChange("streak", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Puntos de Rocío</label>
                      <input
                        type="number"
                        value={gardenState.dewPoints ?? 0}
                        onChange={(e) => handleStateChange("dewPoints", clampNumber(Number(e.target.value), 0, 7))}
                        min="0"
                        max="7"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Mariposas</label>
                      <input
                        type="number"
                        value={gardenState.butterflyCount ?? 0}
                        onChange={(e) => handleStateChange("butterflyCount", clampNumber(Number(e.target.value), 0, 3))}
                        min="0"
                        max="3"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Pájaros</label>
                      <input
                        type="number"
                        value={gardenState.birdCount ?? 0}
                        onChange={(e) => handleStateChange("birdCount", clampNumber(Number(e.target.value), 0, 2))}
                        min="0"
                        max="2"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Velas Activas</label>
                      <input
                        type="number"
                        value={gardenState.activeCandles ?? 0}
                        onChange={(e) => handleStateChange("activeCandles", clampNumber(Number(e.target.value), 0, 5))}
                        min="0"
                        max="5"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {personalInput && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Datos Personales (Editable)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nombre</label>
                      <input
                        type="text"
                        value={personalInput.name}
                        onChange={(e) => handlePersonalInputChange("name", e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Puntos</label>
                      <input
                        type="number"
                        value={personalInput.points}
                        onChange={(e) => handlePersonalInputChange("points", Math.max(0, Number(e.target.value)))}
                        min="0"
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Fecha de Registro</label>
                      <input
                        type="date"
                        value={personalInput.registeredAt ? formatDateForInput(personalInput.registeredAt) : ""}
                        onChange={(e) => handlePersonalInputChange("registeredAt", new Date(e.target.value))}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wider text-white/50">Última Conexión</label>
                      <input
                        type="datetime-local"
                        value={personalInput.lastSeenAt ? formatDateTimeForInput(personalInput.lastSeenAt) : ""}
                        onChange={(e) => handlePersonalInputChange("lastSeenAt", new Date(e.target.value))}
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                      />
                    </div>
                  </div>

                  {personalTraits && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                      <h4 className="col-span-2 text-xs font-medium uppercase tracking-wider text-white/50">Rasgos Calculados</h4>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nº Pétalos</label>
                        <input
                          type="number"
                          value={personalTraits.petalCount}
                          readOnly
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/60"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Matiz Dominante</label>
                        <input
                          type="number"
                          value={personalTraits.dominantHue}
                          readOnly
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/60"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Curvatura del Tronco</label>
                        <input
                          type="number"
                          value={personalTraits.trunkCurve}
                          readOnly
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/60"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Especie Floral</label>
                        <input
                          type="text"
                          value={personalTraits.flowerSpecies}
                          readOnly
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/60"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={saveChanges}
                disabled={busy || !selectedUser}
                className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
              >
                {busy ? "Guardando…" : "Guardar todos los cambios"}
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-white/40">
        Los campos de DNA son inmutables y se calculan a partir del ID del usuario.
        Los campos de Estado y Datos Personales pueden editarse directamente.
      </p>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );

  // Helper functions
  function formatDateForInput(date: Date): string {
    return caracasDate(date);
  }

  function formatDateTimeForInput(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
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

// Image management panel — override saint and daily images
function ImagePanel() {
  const [date, setDate] = useState(() => caracasDate());
  const [saintUrl, setSaintUrl] = useState<string>("");
  const [dailyUrl, setDailyUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const fetchImages = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/admin/daily-images?date=${encodeURIComponent(date)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSaintUrl(data.saintImageUrl ?? "");
      setDailyUrl(data.dailyImageUrl ?? "");
      setResult(`✅ Imágenes cargadas para ${date}`);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  const saveImages = async () => {
    if (!saintUrl && !dailyUrl) {
      setResult("⚠️ No hay imágenes para guardar. Ingresa al menos una URL.");
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/admin/daily-images`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, saintImageUrl: saintUrl || null, dailyImageUrl: dailyUrl || null }),
      });
      const text = await res.text();
      setResult(res.ok ? `✅ Imágenes guardadas para ${date}` : `❌ Error ${res.status}: ${text}`);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Gestionar imágenes del día</h2>
      <p className="text-sm text-white/60">Ingresa las URLs de imágenes publicadas para el santo del día y la imagen principal del evangelio.</p>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Fecha</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
          />
          <button
            onClick={fetchImages}
            disabled={busy}
            className="h-11 w-32 rounded-2xl bg-white/10 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Cargando…" : "Cargar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Imagen del Santo</p>
          {saintUrl ? (
            <img src={saintUrl} alt="Santo del día" className="h-24 w-24 rounded-xl object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-white/5 text-white/30">Sin imagen</div>
          )}
          <input
            value={saintUrl}
            onChange={(e) => setSaintUrl(e.target.value)}
            placeholder="URL de la imagen del santo"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Imagen del Evangelio</p>
          {dailyUrl ? (
            <img src={dailyUrl} alt="Evangelio del día" className="h-24 w-24 rounded-xl object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-white/5 text-white/30">Sin imagen</div>
          )}
          <input
            value={dailyUrl}
            onChange={(e) => setDailyUrl(e.target.value)}
            placeholder="URL de la imagen del día"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {(saintUrl || dailyUrl) && (
        <button
          onClick={saveImages}
          disabled={busy}
          className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar imágenes"}
        </button>
      )}

      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}

function OracionesPanel() {
  const [date, setDate] = useState(() => caracasDate());
  const [laudes, setLaudes] = useState("");
  const [visperas, setVisperas] = useState("");
  const [completas, setCompletas] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const fetchRss = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch(`${WORKER_API_BASE}/youtube/prayer-videos`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLaudes(data.laudes || "");
      setVisperas(data.visperas || "");
      setCompletas(data.completas || "");
      setResult(`✅ RSS cargado para ${data.date || date}`);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    setResult("");
    try {
      const body: Record<string, any> = { date };
      if (laudes && !/^https?:\/\//i.test(laudes)) {
        setResult("❌ Laudes debe ser una URL válida (ej. https://www.youtube.com/watch?v=...)");
        setBusy(false);
        return;
      }
      if (visperas && !/^https?:\/\//i.test(visperas)) {
        setResult("❌ Vísperas debe ser una URL válida");
        setBusy(false);
        return;
      }
      if (completas && !/^https?:\/\//i.test(completas)) {
        setResult("❌ Completas debe ser una URL válida");
        setBusy(false);
        return;
      }
      body.laudes = laudes || null;
      body.visperas = visperas || null;
      body.completas = completas || null;
      const res = await fetch(`${WORKER_API_BASE}/youtube/prayer-videos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      setResult(res.ok ? `✅ Oraciones guardadas para ${date}` : `❌ Error ${res.status}: ${text}`);
    } catch (e) {
      setResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Oraciones del día (YouTube RSS)</h2>
      <p className="text-sm text-white/60">Gestiona las URLs de video de Laudes, Vísperas y Completas. Fallback manual de emergencia.</p>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/50">Fecha</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
          />
          <button
            onClick={fetchRss}
            disabled={busy}
            className="h-11 w-40 rounded-2xl bg-white/10 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Cargando…" : "Cargar del RSS"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-white/50">Laudes (07:00)</label>
          <input
            value={laudes}
            onChange={(e) => setLaudes(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-white/50">Vísperas (18:00)</label>
          <input
            value={visperas}
            onChange={(e) => setVisperas(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-white/50">Completas (21:00)</label>
          <input
            value={completas}
            onChange={(e) => setCompletas(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="h-12 w-full rounded-2xl bg-[var(--gold)] font-medium text-black disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar URLs"}
      </button>

      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}
