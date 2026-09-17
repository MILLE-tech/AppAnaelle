"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signup, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AuthActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Création..." : "Créer mon compte"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Prénom</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="given-name" placeholder="Anaëlle" />
      </div>

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

      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          required
          minLength={8}
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirme le mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={8}
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      {state.info && (
        <p className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {state.info}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Connecte-toi
        </Link>
      </p>
    </form>
  );
}
