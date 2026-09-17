"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SubjectActionState {
  error: string | null;
}

const PRESET_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
];

export async function createSubject(
  _prevState: SubjectActionState,
  formData: FormData
): Promise<SubjectActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? PRESET_COLORS[0]);

  if (!name) {
    return { error: "Donne un nom à la matière." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée, reconnecte-toi." };
  }

  const { error } = await supabase
    .from("subjects")
    .insert({ user_id: user.id, name, color });

  if (error) {
    return { error: "Impossible de créer la matière." };
  }

  revalidatePath("/matieres");
  return { error: null };
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: documents } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("subject_id", subjectId)
    .not("storage_path", "is", null);

  const paths = (documents ?? [])
    .map((d) => d.storage_path)
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from("course-documents").remove(paths);
  }

  await supabase.from("subjects").delete().eq("id", subjectId);
  revalidatePath("/matieres");
}

export async function renameSubject(
  subjectId: string,
  name: string
): Promise<void> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return;

  await supabase.from("subjects").update({ name: trimmed }).eq("id", subjectId);
  revalidatePath("/matieres");
  revalidatePath(`/matieres/${subjectId}`);
}

export { PRESET_COLORS };
