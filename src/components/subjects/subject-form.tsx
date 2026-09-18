"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createSubject, type SubjectActionState } from "@/lib/actions/subjects";
import { PRESET_COLORS } from "@/lib/constants/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clsx } from "@/lib/utils/clsx";

// Filet de sécurité : garantit un tableau même si l'import venait à
// résoudre vers undefined (ex. build cassé) pour ne jamais planter le rendu.
const colorOptions = Array.isArray(PRESET_COLORS) ? PRESET_COLORS : [];

const initialState: SubjectActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Création..." : "Créer la matière"}
    </Button>
  );
}

export function SubjectForm() {
  const [state, formAction] = useActionState(createSubject, initialState);
  const [color, setColor] = useState<string>(colorOptions[0] ?? "#8b5cf6");

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="color" value={color} />

      <div className="flex-1">
        <Input name="name" placeholder="Ex : Culture éco-juridique et managériale" required />
      </div>

      <div className="flex items-center gap-2">
        {colorOptions.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Couleur ${c}`}
            className={clsx(
              "h-7 w-7 rounded-full border-2 transition-transform",
              color === c ? "scale-110 border-white" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <SubmitButton />

      {state.error && <p className="text-sm text-danger sm:ml-2">{state.error}</p>}
    </form>
  );
}
