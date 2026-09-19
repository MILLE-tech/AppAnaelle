"use client";

import Link from "next/link";
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
  time: string | null;
  description: string | null;
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

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

interface FormState {
  eventId: string | null; // null = création
  date: string;
  subjectId: string;
  title: string;
  time: string;
  description: string;
  coefficient: string;
}

function emptyForm(dateKey: string, defaultSubjectId: string): FormState {
  return {
    eventId: null,
    date: dateKey,
    subjectId: defaultSubjectId,
    title: "",
    time: "",
    description: "",
    coefficient: "",
  };
}

interface MonthCalendarProps {
  userId: string;
  subjects: SubjectOption[];
  initialEvents: CalendarEvent[];
}

export function MonthCalendar({ userId, subjects, initialEvents }: MonthCalendarProps) {
  const [events, setEvents] = useState(initialEvents);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
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
    for (const list of Object.values(map)) {
      list.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const today = toDateKey(new Date());
  const detailEvent = detailEventId ? (events.find((e) => e.id === detailEventId) ?? null) : null;

  function openCreateForm(dateKey: string) {
    setForm(emptyForm(dateKey, subjects[0]?.id ?? ""));
    setError(null);
  }

  function openEditForm(event: CalendarEvent) {
    setDetailEventId(null);
    setForm({
      eventId: event.id,
      date: event.event_date,
      subjectId: event.subject_id,
      title: event.title,
      time: event.time ?? "",
      description: event.description ?? "",
      coefficient: event.coefficient != null ? String(event.coefficient) : "",
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !form.subjectId || !form.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const payload = {
        subject_id: form.subjectId,
        title: form.title.trim(),
        event_date: form.date,
        time: form.time || null,
        description: form.description.trim() || null,
        coefficient: form.coefficient ? Number(form.coefficient) : null,
      };

      if (form.eventId) {
        const { data, error: updateError } = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", form.eventId)
          .select("id, subject_id, title, event_date, time, description, coefficient")
          .single();
        if (updateError || !data) throw new Error("Impossible de modifier l'évaluation.");
        setEvents((prev) => prev.map((ev) => (ev.id === data.id ? data : ev)));
      } else {
        const { data, error: insertError } = await supabase
          .from("calendar_events")
          .insert({ user_id: userId, ...payload })
          .select("id, subject_id, title, event_date, time, description, coefficient")
          .single();
        if (insertError || !data) throw new Error("Impossible d'ajouter l'évaluation.");
        setEvents((prev) => [...prev, data]);
      }
      setForm(null);
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
    setDetailEventId(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold capitalize">{MONTH_FORMATTER.format(month)}</h2>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => openCreateForm(today)} className="ml-1 !px-3 !py-2">
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter une évaluation</span>
          </Button>
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
                onClick={() => openCreateForm(dateKey)}
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
                        setDetailEventId(event.id);
                      }}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: subjectsById[event.subject_id]?.color ?? "#8b5cf6" }}
                      title={event.title}
                    >
                      {event.time && <span className="mr-1 opacity-80">{formatTime(event.time)}</span>}
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

      {detailEvent && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setDetailEventId(null)}
        >
          <div
            className="glass-panel w-full max-w-sm rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: subjectsById[detailEvent.subject_id]?.color ?? "#8b5cf6" }}
              />
              <p className="text-sm font-medium text-muted">
                {subjectsById[detailEvent.subject_id]?.name ?? "Matière"}
              </p>
            </div>
            <h3 className="mt-1 text-xl font-semibold">{detailEvent.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {new Date(detailEvent.event_date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {detailEvent.time && ` à ${formatTime(detailEvent.time)}`}
              {detailEvent.coefficient != null && ` · coefficient ${detailEvent.coefficient}`}
            </p>
            {detailEvent.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {detailEvent.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => openEditForm(detailEvent)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => handleDelete(detailEvent.id)}>
                Supprimer
              </Button>
              <Link href={`/matieres/${detailEvent.subject_id}`} className="ml-auto">
                <Button variant="ghost">Voir la matière →</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <form onSubmit={handleSubmit} className="glass-panel w-full max-w-sm rounded-2xl p-5">
            <h3 className="mb-4 text-lg font-semibold">
              {form.eventId ? "Modifier l'évaluation" : "Ajouter une évaluation"}
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="subject">Matière</Label>
                <select
                  id="subject"
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
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
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Contrôle de gestion"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Heure (optionnel)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Sur quoi porte cette évaluation ?"
                  className="w-full rounded-xl border border-surface-border bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none focus:border-accent/60"
                />
              </div>
              <div>
                <Label htmlFor="coefficient">Coefficient (optionnel)</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.coefficient}
                  onChange={(e) => setForm({ ...form, coefficient: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving || subjects.length === 0}>
                {isSaving ? "Enregistrement..." : form.eventId ? "Enregistrer" : "Ajouter"}
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
