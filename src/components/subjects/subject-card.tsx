"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteSubject } from "@/lib/actions/subjects";

interface SubjectCardProps {
  id: string;
  name: string;
  color: string;
  documentCount: number;
}

export function SubjectCard({ id, name, color, documentCount }: SubjectCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Supprimer "${name}" et tous ses documents ?`)) return;
    startTransition(() => deleteSubject(id));
  }

  return (
    <Link
      href={`/matieres/${id}`}
      className="glass-card group relative flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <button
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Supprimer la matière"
          className="rounded-lg p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 disabled:opacity-40"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <h3 className="text-xl font-semibold leading-tight">{name}</h3>
      <p className="text-sm text-muted">
        {documentCount} document{documentCount > 1 ? "s" : ""}
      </p>
    </Link>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0-.6 12a2 2 0 0 1-2 1.9H9.6a2 2 0 0 1-2-1.9L7 7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
