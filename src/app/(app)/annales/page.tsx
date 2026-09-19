import { createClient } from "@/lib/supabase/server";
import { AnneesList } from "@/components/annales/annees-list";

export default async function AnnalesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("annales_years")
    .select("year")
    .order("year", { ascending: false });

  const customYears = (data ?? []).map((row) => row.year);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Annales</h1>
      <p className="mt-1 text-muted">Retrouve les sujets d&apos;examens précédents, classés par année.</p>

      <div className="mt-6">
        <AnneesList customYears={customYears} />
      </div>
    </div>
  );
}
