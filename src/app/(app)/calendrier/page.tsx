import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonthCalendar } from "@/components/calendar/month-calendar";

export default async function CalendrierPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color")
    .order("name", { ascending: true });

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, subject_id, title, event_date, coefficient");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold">Calendrier</h1>
      <p className="mt-1 text-muted">Clique sur un jour pour ajouter une évaluation.</p>

      <div className="mt-6">
        <MonthCalendar
          userId={user.id}
          subjects={subjects ?? []}
          initialEvents={events ?? []}
        />
      </div>
    </div>
  );
}
