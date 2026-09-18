import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
