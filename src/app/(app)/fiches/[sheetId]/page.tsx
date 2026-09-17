import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SheetEditor } from "@/components/sheets/sheet-editor";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("revision_sheets")
    .select("id, title, content_markdown, subject_id")
    .eq("id", sheetId)
    .single();

  if (!sheet) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", sheet.subject_id)
    .single();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/matieres/${sheet.subject_id}`}
        className="print-hidden text-sm text-muted hover:text-foreground"
      >
        ← {subject?.name ?? "Matière"}
      </Link>

      <div className="mt-4">
        <SheetEditor
          sheetId={sheet.id}
          initialTitle={sheet.title}
          initialContent={sheet.content_markdown}
        />
      </div>
    </div>
  );
}
