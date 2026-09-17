import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <>
      <h2 className="mb-6 text-2xl font-semibold">Connexion</h2>
      <LoginForm redirectTo={redirect} />
    </>
  );
}
