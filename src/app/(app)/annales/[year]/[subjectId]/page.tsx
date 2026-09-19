import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnnalesPanel } from "@/components/annales/annales-panel";

export default async function AnnalesSubjectPage({
  params,
}: {
  params: Promise<{ year: string; subjectId: string }>;
}) {
  const { year: yearParam, subjectId } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, color")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { data: annales } = await supabase
    .from("annales")
    .select("id, file_name, file_path, file_size, created_at")
    .eq("subject_id", subjectId)
    .eq("year", year)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/annales/${year}`} className="text-sm text-muted hover:text-foreground">
        ← Annales {year}
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
        <h1 className="text-3xl font-semibold">{subject.name}</h1>
      </div>

      <div className="mt-6">
        <AnnalesPanel
          userId={user.id}
          subjectId={subject.id}
          year={year}
          initialAnnales={annales ?? []}
        />
      </div>
    </div>
  );
}
