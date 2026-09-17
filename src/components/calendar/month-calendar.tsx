"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { clsx } from "@/lib/utils/clsx";

export interface CalendarEvent {
  id: string;
  subject_id: string;
  title: string;
  event_date: string;
  coefficient: number | null;
}

export interface SubjectOption {
  id: string;
  name: string;
  color: string;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // lundi = 0
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

interface MonthCalendarProps {
  userId: string;
  subjects: SubjectOption[];
  initialEvents: CalendarEvent[];
}

export function MonthCalendar({ userId, subjects, initialEvents }: MonthCalendarProps) {
  const [events, setEvents] = useState(initialEvents);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [formDate, setFormDate] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [coefficient, setCoefficient] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectsById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      (map[event.event_date] ??= []).push(event);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const today = toDateKey(new Date());

  function openForm(dateKey: string) {
    setFormDate(dateKey);
    setTitle("");
    setCoefficient("");
    setSubjectId(subjects[0]?.id ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formDate || !subjectId || !title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("calendar_events")
        .insert({
          user_id: userId,
          subject_id: subjectId,
          title: title.trim(),
          event_date: formDate,
          coefficient: coefficient ? Number(coefficient) : null,
        })
        .select("id, subject_id, title, event_date, coefficient")
        .single();

      if (insertError || !data) throw new Error("Impossible d'ajouter l'évaluation.");
      setEvents((prev) => [...prev, data]);
      setFormDate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Supprimer cette évaluation ?")) return;
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">{MONTH_FORMATTER.format(month)}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="rounded-lg border border-surface-border p-2 text-muted hover:text-foreground"
            aria-label="Mois précédent"
          >
            <ChevronIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="rounded-lg border border-surface-border p-2 text-muted hover:text-foreground"
            aria-label="Mois suivant"
          >
            <ChevronIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-surface-border text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((date) => {
            const dateKey = toDateKey(date);
            const inMonth = date.getMonth() === month.getMonth();
            const dayEvents = eventsByDay[dateKey] ?? [];
            return (
              <button
                key={dateKey}
                onClick={() => openForm(dateKey)}
                className={clsx(
                  "flex min-h-20 flex-col items-start gap-1 border-b border-r border-surface-border p-1.5 text-left transition-colors hover:bg-white/5 sm:p-2",
                  !inMonth && "opacity-30"
                )}
              >
                <span
                  className={clsx(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    dateKey === today && "gradient-accent text-white"
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex w-full flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(event.id);
                      }}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: subjectsById[event.subject_id]?.color ?? "#8b5cf6" }}
                      title={`${event.title} — clique pour supprimer`}
                    >
                      {event.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted">+{dayEvents.length - 2}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {formDate && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <form
            onSubmit={handleSubmit}
            className="glass-panel w-full max-w-sm rounded-2xl p-5"
          >
            <h3 className="mb-4 text-lg font-semibold">
              Ajouter une évaluation — {new Date(formDate).toLocaleDateString("fr-FR")}
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="subject">Matière</Label>
                <select
                  id="subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface-border bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none focus:border-accent/60"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="title">Intitulé</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Contrôle de gestion"
                  required
                />
              </div>
              <div>
                <Label htmlFor="coefficient">Coefficient (optionnel)</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min={0}
                  step={0.5}
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFormDate(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving || subjects.length === 0}>
                {isSaving ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
            {subjects.length === 0 && (
              <p className="mt-2 text-xs text-danger">
                Crée d&apos;abord une matière avant d&apos;ajouter une évaluation.
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
