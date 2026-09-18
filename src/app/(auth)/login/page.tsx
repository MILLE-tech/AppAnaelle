import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string }>;
}) {
  const { redirect, reset } = await searchParams;

  return (
    <>
      <h2 className="mb-6 text-2xl font-semibold">Connexion</h2>
      {reset === "success" && (
        <p className="mb-4 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          Mot de passe mis à jour. Connecte-toi avec ton nouveau mot de passe.
        </p>
      )}
      <LoginForm redirectTo={redirect} />
    </>
  );
}
