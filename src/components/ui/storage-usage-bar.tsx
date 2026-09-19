import { formatFileSize } from "@/lib/utils/format";
import type { StorageUsage } from "@/lib/storage/usage";
import { clsx } from "@/lib/utils/clsx";

export function StorageUsageBar({ usage }: { usage: StorageUsage }) {
  const isNearLimit = usage.percent >= 80;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Espace de stockage utilisé</span>
        <span className={clsx("font-medium", isNearLimit ? "text-danger" : "text-muted")}>
          {formatFileSize(usage.usedBytes)} / {formatFileSize(usage.quotaBytes)}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={clsx("h-full rounded-full", isNearLimit ? "bg-danger" : "gradient-accent")}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {isNearLimit && (
        <p className="mt-2 text-xs text-danger">
          Tu approches de la limite de 1 Go du plan gratuit Supabase — pense à supprimer les
          documents que tu n&apos;utilises plus.
        </p>
      )}
    </div>
  );
}
