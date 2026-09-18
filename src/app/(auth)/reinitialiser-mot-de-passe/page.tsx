import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <h2 className="mb-2 text-2xl font-semibold">Lien invalide ou expiré</h2>
        <p className="mb-6 text-sm text-muted">
          Ce lien de réinitialisation n&apos;est plus valide. Redemande un email depuis la
          page de connexion.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="block text-center text-sm font-medium text-foreground underline underline-offset-4"
        >
          Redemander un lien
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="mb-2 text-2xl font-semibold">Nouveau mot de passe</h2>
      <p className="mb-6 text-sm text-muted">Choisis un nouveau mot de passe pour ton compte.</p>
      <ResetPasswordForm />
    </>
  );
}
