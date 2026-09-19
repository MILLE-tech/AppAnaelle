import { createClient } from "@/lib/supabase/server";

// Limite du plan gratuit Supabase Storage.
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percent: number;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Les policies RLS de storage.objects limitent déjà list() au dossier de
// l'utilisatrice courante ({user_id}/...), donc un parcours récursif à
// partir de la racine du bucket ne remonte jamais les fichiers d'un tiers.
async function walkFolder(
  supabase: SupabaseServerClient,
  bucket: string,
  path: string
): Promise<number> {
  const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
  if (error || !data) return 0;

  let total = 0;
  for (const entry of data) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.id === null) {
      total += await walkFolder(supabase, bucket, fullPath);
    } else {
      total += (entry.metadata?.size as number | undefined) ?? 0;
    }
  }
  return total;
}

const BUCKETS = ["course-documents", "annales"];

export async function getStorageUsage(): Promise<StorageUsage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { usedBytes: 0, quotaBytes: STORAGE_QUOTA_BYTES, percent: 0 };
  }

  const totals = await Promise.all(
    BUCKETS.map((bucket) => walkFolder(supabase, bucket, user.id))
  );
  const usedBytes = totals.reduce((sum, n) => sum + n, 0);

  return {
    usedBytes,
    quotaBytes: STORAGE_QUOTA_BYTES,
    percent: Math.min(100, Math.round((usedBytes / STORAGE_QUOTA_BYTES) * 100)),
  };
}
