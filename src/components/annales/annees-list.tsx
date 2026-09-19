"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_YEARS = [2025, 2026];

export function AnneesList({ customYears }: { customYears: number[] }) {
  const [years, setYears] = useState(() =>
    Array.from(new Set([...DEFAULT_YEARS, ...customYears])).sort((a, b) => b - a)
  );
  const [adding, setAdding] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const year = Number(newYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError("Année invalide.");
      return;
    }
    if (years.includes(year)) {
      setError("Cette année existe déjà.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      const { error: insertError } = await supabase
        .from("annales_years")
        .insert({ user_id: user.id, year });
      if (insertError) throw new Error("Impossible d'ajouter cette année.");

      setYears((prev) => [...prev, year].sort((a, b) => b - a));
      setNewYear("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {years.map((year) => (
          <Link
            key={year}
            href={`/annales/${year}`}
            className="glass-card flex items-center justify-center p-8 text-2xl font-semibold transition-transform hover:-translate-y-0.5"
          >
            {year}
          </Link>
        ))}
        <button
          onClick={() => setAdding(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-surface-border p-8 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground"
        >
          <PlusIcon className="h-5 w-5" />
          Ajouter une année
        </button>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setAdding(false)}
        >
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-xs rounded-2xl p-5"
          >
            <h3 className="mb-3 text-lg font-semibold">Ajouter une année</h3>
            <Input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="2027"
              autoFocus
              required
            />
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
