// Admin overview as a two-column kanban board:
//   • Offen — spots that aren't live (readiness open) + manual tasks (add via +)
//   • Fertig / Review — tasks dragged over from the left; review and dismiss (×)
// Drag a task between columns to change its status (native HTML5 drag & drop).

import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  createBoardTask,
  deleteBoardTask,
  getAdminOverview,
  getBoardTasks,
  updateBoardTask,
  type AdminOverview,
  type BoardTask,
} from "../lib/api";
import { gapLabel } from "../lib/labels";

export default function AdminHome() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<"open" | "done" | null>(null);

  const load = () =>
    Promise.all([getAdminOverview(), getBoardTasks()])
      .then(([o, t]) => {
        setData(o);
        setTasks(t);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Laden fehlgeschlagen.")
      );

  useEffect(() => {
    void load();
  }, []);

  const move = async (id: string, status: "open" | "done") => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t))); // optimistic
    try {
      await updateBoardTask(id, { status });
    } catch {
      await load();
    }
  };

  const remove = async (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    await deleteBoardTask(id).catch(() => load());
  };

  const onDrop = (col: "open" | "done") => (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) void move(id, col);
  };

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  if (error) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return <div className="text-[14px] text-muted">Lädt…</div>;

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-navy">Übersicht</h1>
      <p className="mt-1 text-[14px] text-muted">
        Board: links Offenes (nicht-live Spots + Aufgaben), rechts Fertig/Review.
        Aufgaben per Drag-and-Drop verschieben.
      </p>

      {data.era5_queued > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-brand-orange/5 p-3 text-[13px] text-muted">
          {data.era5_queued} Spot(s): Klimatologie wird im Hintergrund berechnet —
          Windmonate erscheinen automatisch, sobald sie fertig ist.
        </div>
      )}

      {data.team_notes.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.team_notes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-line bg-brand-teal/5 p-4">
              <p className="whitespace-pre-wrap text-[14px] text-navy">{n.body}</p>
              <p className="mt-2 text-[12px] text-muted">
                {n.author ?? "—"} · {new Date(n.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Status tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Entwürfe" value={data.spots.draft} to="/admin/spots?status=draft" />
        <Tile label="Veröffentlicht" value={data.spots.published} to="/admin/spots?status=published" accent="green" />
        <Tile label="Archiviert" value={data.spots.archived} to="/admin/spots?status=archived" />
        <Tile label="Regionen" value={data.regions} to="/admin/regions" />
      </div>

      {/* Kanban board */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Left: Offen */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("open");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onDrop("open")}
          className={`rounded-2xl border p-4 ${
            dragOver === "open" ? "border-navy bg-navy/5" : "border-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-navy">
              Offen{" "}
              <span className="text-[13px] font-normal text-muted">
                ({data.not_live.length + openTasks.length})
              </span>
            </h2>
          </div>

          <AddTask
            onAdd={async (title, body) => {
              await createBoardTask(title, body);
              await load();
            }}
            onError={setError}
          />

          {/* Not-live spots (auto, info) */}
          {data.not_live.map((s) => (
            <div key={s.id} className="mt-2 rounded-xl bg-cream p-3">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/admin/spot/${s.id}/edit`} className="text-[14px] font-medium text-navy hover:underline">
                  {s.name}
                </Link>
                <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-[11px] text-navy/60">
                  Spot
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-muted">
                Fehlt: {s.gaps.map(gapLabel).join(", ")}
              </div>
            </div>
          ))}

          {/* Open tasks (draggable) */}
          {openTasks.map((t) => (
            <TaskCard key={t.id} task={t} onDelete={() => remove(t.id)} />
          ))}

          {data.not_live.length === 0 && openTasks.length === 0 && (
            <p className="mt-3 text-[13px] text-muted">Nichts offen. 🎉</p>
          )}
        </section>

        {/* Right: Fertig / Review */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("done");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onDrop("done")}
          className={`rounded-2xl border p-4 ${
            dragOver === "done" ? "border-brand-green bg-brand-green/5" : "border-line bg-white"
          }`}
        >
          <h2 className="text-[15px] font-semibold text-navy">
            Fertig / Review{" "}
            <span className="text-[13px] font-normal text-muted">({doneTasks.length})</span>
          </h2>
          {doneTasks.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">
              Erledigte Aufgaben hierher ziehen, prüfen und mit × wegklicken.
            </p>
          ) : (
            doneTasks.map((t) => (
              <TaskCard key={t.id} task={t} done onDelete={() => remove(t.id)} />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  done,
  onDelete,
}: {
  task: BoardTask;
  done?: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={`mt-2 cursor-grab rounded-xl border p-3 active:cursor-grabbing ${
        done ? "border-brand-green/30 bg-brand-green/5" : "border-line bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-medium text-navy">{task.title}</p>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-[14px] text-muted hover:text-red-600"
          aria-label="Aufgabe entfernen"
        >
          ×
        </button>
      </div>
      {task.body && <p className="mt-1 whitespace-pre-wrap text-[13px] text-navy/75">{task.body}</p>}
      {task.author && <p className="mt-1 text-[11px] text-muted">{task.author}</p>}
    </div>
  );
}

function AddTask({
  onAdd,
  onError,
}: {
  onAdd: (title: string, body?: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onAdd(title.trim(), body.trim() || undefined);
      setTitle("");
      setBody("");
      setOpen(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-[14px] text-navy outline-none focus:border-navy/40";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-xl border border-dashed border-navy/25 px-3 py-2 text-[13px] font-medium text-navy hover:bg-navy/5"
      >
        + Aufgabe
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 rounded-xl bg-navy/5 p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        className={input}
        required
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Beschreibung (optional)"
        className={`mt-2 ${input}`}
        rows={2}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-navy px-3 py-1.5 text-[13px] font-medium text-white hover:bg-navy-dark disabled:opacity-50"
        >
          Hinzufügen
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[13px] text-muted hover:text-navy">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function Tile({
  label,
  value,
  to,
  accent,
}: {
  label: string;
  value: number;
  to: string;
  accent?: "green";
}) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-card">
      <div className={`text-[28px] font-semibold ${accent === "green" ? "text-brand-green" : "text-navy"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[13px] text-muted">{label}</div>
    </Link>
  );
}
