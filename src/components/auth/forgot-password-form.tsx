"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AuthActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Envoi..." : "Envoyer le lien de réinitialisation"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.info) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {state.info}
        </p>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-foreground underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="toi@exemple.fr"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
