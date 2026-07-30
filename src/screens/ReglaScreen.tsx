import { useMemo, useState } from "react";
import type { SpiritualTask, TaskCadence } from "../rule/tasks";
import { useSpiritual } from "../fruits/store";
import { NotificationsPanel } from "../notifications/NotificationsPanel";
import { useSpiritualTasks } from "../rule/useSpiritualTasks";
import type { DailyLiturgy } from "../liturgy/types";
import type { ReaderTarget } from "./CaminoScreen";
import { caracasDate } from "../utils/caracas";

type Props = {
  onOpenReader?: (t: ReaderTarget) => void;
  onStartRosary?: () => void;
  liturgy: DailyLiturgy | null;
};

export function ReglaScreen({ onOpenReader, onStartRosary, liturgy }: Props) {
  const { emit } = useSpiritual();
  const taskStore = useSpiritualTasks(liturgy);
  const tasks = taskStore.tasks;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskDate, setTaskDate] = useState(caracasDate());
  const [taskCadence, setTaskCadence] = useState<TaskCadence>("once");

  const daily = useMemo(() => tasks.filter((t) => t.cadence === "daily"), [tasks]);
  const weekly = useMemo(() => tasks.filter((t) => t.cadence === "weekly"), [tasks]);
  const doneCount = tasks.filter((t) => t.done).length;

  const toggle = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const ok = await taskStore.toggle(id, !task.done);
    if (ok && !task.done) {
      emit({ type: "task-complete" });
      if (task.category === "gospel") {
        emit({ type: "gospel-read" });
      }
    }
  };

  const openTask = (t: SpiritualTask) => {
    if (t.category === "laudes") onOpenReader?.("laudes");
    else if (t.category === "angelus") onOpenReader?.("angelus");
    else if (t.category === "gospel") onOpenReader?.("gospel");
    else if (t.category === "psalm") onOpenReader?.("psalm");
    else if (t.category === "first_reading") onOpenReader?.("first");
    else if (t.category === "second_reading") onOpenReader?.("second");
    else if (t.category === "rosary") onStartRosary?.();
  };

  const addCustom = async () => {
    if (!draft.trim()) return;
    await taskStore.add(draft, taskTime, taskDate, taskCadence);
    setDraft("");
    setTaskTime("");
    setTaskDate(caracasDate());
    setTaskCadence("once");
    setAdding(false);
  };

  return (
    <div className="min-h-full bg-[#f7f6f3] pb-28 text-[#1c1c1e]">
      <div className="px-6 pt-10">
        <h1 className="text-center text-2xl font-semibold">Regla de Vida</h1>
        <p className="mt-1 text-center text-sm text-[#8a8a90]">
          Tus propósitos espirituales de hoy
        </p>

        <NotificationsPanel />

        {!taskStore.authenticated && (
          <p className="mt-4 rounded-2xl border border-[#e5dcc3] bg-[#f6efdd] p-4 text-center text-sm text-[#766d5d]">
            Inicia sesión para crear y sincronizar tu Regla de Vida en todos tus dispositivos.
          </p>
        )}

        {/* Progress bar (semillas, no XP) */}
        <div className="mt-5 rounded-2xl border border-[#e6e3db] bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {doneCount} de {tasks.length} cumplidos
            </span>
            <span className="text-[#7a8a5c]">🌱 semillas al completar</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee9df]">
            <div
              className="h-full rounded-full bg-[#7a8a5c] transition-all"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Daily anchored tasks (Laudes, Ángelus, Rosario…) */}
        <SectionTitle>HOY · DIARIO</SectionTitle>
        <div className="space-y-2.5">
          {daily
            .slice()
            .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))
            .map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggle} onOpen={openTask} />
            ))}
        </div>

        {/* Weekly */}
        <SectionTitle>ESTA SEMANA</SectionTitle>
        <div className="space-y-2.5">
          {weekly.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={toggle} onOpen={openTask} />
          ))}
        </div>

        {/* Add custom */}
        {adding ? (
          <div className="mt-4 rounded-2xl border border-[#e6e3db] bg-white p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addCustom()}
              autoFocus
              placeholder="Nuevo compromiso…"
              className="h-11 w-full bg-transparent px-2 text-sm focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                className="h-10 flex-1 rounded-full border border-[#e0ddd4] bg-transparent px-3 text-xs text-[#1c1c1e]"
              />
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="h-10 flex-1 rounded-full border border-[#e0ddd4] bg-transparent px-3 text-xs text-[#1c1c1e]"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {[
                { value: "once", label: "Una sola vez" },
                { value: "daily", label: "Diaria" },
                { value: "weekly", label: "Semanal" },
                { value: "monthly", label: "Mensual" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTaskCadence(option.value as TaskCadence)}
                  className={`h-8 flex-1 rounded-full border text-xs ${
                    taskCadence === option.value
                      ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                      : "border-[#e0ddd4] text-[#8a8a90]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => void addCustom()}
                className="h-10 flex-1 rounded-full bg-[#1c1c1e] text-sm font-medium text-white"
              >
                Añadir
              </button>
              <button
                onClick={() => setAdding(false)}
                className="h-10 flex-1 rounded-full border border-[#e0ddd4] text-sm text-[#8a8a90]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d7d3c8] text-sm font-medium text-[#8a8a90]"
          >
            + Añadir compromiso personal
          </button>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#a8a8ad]">
          Laudes, Ángelus y el Rosario diario están siempre presentes a su hora
          para rezarlos en comunidad. Mínimo: 1 Rosario al día.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 text-[11px] font-semibold tracking-[0.18em] text-[#9a9a9f]">
      {children}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: SpiritualTask;
  onToggle: (id: string) => void;
  onOpen: (t: SpiritualTask) => void;
}) {
  const actionable = ["laudes", "angelus", "gospel", "rosary"].includes(
    task.category,
  );
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e6e3db] bg-white p-3.5">
      <button
        onClick={() => onToggle(task.id)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
          task.done
            ? "border-[#7a8a5c] bg-[#7a8a5c]"
            : "border-[#d0ccc0] bg-white"
        }`}
        aria-label="Completar"
      >
        {task.done && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <button
        onClick={() => actionable && onOpen(task)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span className="text-lg">{task.icon}</span>
        <div className="min-w-0">
          <div
            className={`truncate text-sm font-medium ${
              task.done ? "text-[#a8a8ad] line-through" : "text-[#1c1c1e]"
            }`}
          >
            {task.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9a9a9f]">
            {task.time && <span>🕐 {task.time}</span>}
            {task.required && (
              <span className="rounded-full bg-[#f2ede0] px-1.5 text-[10px] text-[#a08f5a]">
                obligatorio
              </span>
            )}
          </div>
        </div>
      </button>

      {actionable && (
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#c4c0b4]" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
