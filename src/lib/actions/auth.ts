"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string | null;
  info?: string | null;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Renseigne ton email et ton mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "Email ou mot de passe incorrect." };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error: "Confirme d'abord ton adresse email via le lien reçu par mail.",
      };
    }
    return { error: "Connexion impossible. Réessaie dans un instant." };
  }

  redirect(redirectTo || "/dashboard");
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password) {
    return { error: "Renseigne ton email et ton mot de passe." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirmPassword) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: "Inscription impossible. Réessaie dans un instant." };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    error: null,
    info: "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.",
  };
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Renseigne ton adresse email." };
  }

  const supabase = await createClient();
  // Le lien pointe directement sur la page de réinitialisation (et non sur
  // /auth/confirm) : la vérification du token à usage unique n'a lieu que
  // lors de la soumission du formulaire, pas au chargement de la page.
  // Sinon, les scanners de liens des clients mail (Gmail, Outlook...) qui
  // "pré-cliquent" les liens pour les vérifier consomment le token avant
  // l'utilisatrice, qui tombe alors sur un lien "invalide".
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/reinitialiser-mot-de-passe`,
  });

  // Le message renvoyé à l'utilisatrice reste volontairement générique
  // (voir plus bas), mais on logge l'échec réel côté serveur pour pouvoir
  // le diagnostiquer dans les logs Vercel.
  if (error) {
    console.error("[requestPasswordReset] échec de l'envoi de l'email :", error);
  }

  // Message générique volontaire : ne pas révéler si l'email existe ou non.
  return {
    error: null,
    info: "Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
