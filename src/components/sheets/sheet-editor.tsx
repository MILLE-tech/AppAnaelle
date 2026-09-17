"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clsx } from "@/lib/utils/clsx";

interface SheetEditorProps {
  sheetId: string;
  initialTitle: string;
  initialContent: string;
}

export function SheetEditor({ sheetId, initialTitle, initialContent }: SheetEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("revision_sheets")
        .update({ title, content_markdown: content })
        .eq("id", sheetId);

      if (updateError) throw new Error("Impossible d'enregistrer la fiche.");
      setSavedAt(new Date());
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          <ModeButton active={mode === "preview"} onClick={() => setMode("preview")}>
            Aperçu
          </ModeButton>
          <ModeButton active={mode === "edit"} onClick={() => setMode("edit")}>
            Modifier
          </ModeButton>
        </div>

        <div className="flex items-center gap-2">
          {savedAt && mode === "preview" && (
            <span className="text-xs text-muted">Enregistré</span>
          )}
          {mode === "edit" && (
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            Exporter en PDF
          </Button>
        </div>
      </div>

      {error && (
        <p className="print-hidden mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="print-area glass-card p-6 md:p-10">
        {mode === "edit" ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Titre</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Contenu (Markdown)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                className="w-full rounded-xl border border-surface-border bg-white/[0.03] px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-accent/60"
              />
            </div>
          </div>
        ) : (
          <article className="prose-sheet">
            <h1 className="mb-6 text-3xl font-semibold">{title}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-accent-soft text-foreground" : "text-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
