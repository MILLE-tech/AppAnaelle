"use client";

import { useState } from "react";
import { clsx } from "@/lib/utils/clsx";

interface CollapsibleCardProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleCard({
  title,
  count,
  defaultOpen = true,
  headerExtra,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          {count != null && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {count}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {headerExtra}
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Replier" : "Déplier"}>
            <ChevronIcon className={clsx("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>
      {open && <div className="border-t border-surface-border p-5 pt-4">{children}</div>}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
