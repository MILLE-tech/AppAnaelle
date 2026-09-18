import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="mb-2 text-2xl font-semibold">Mot de passe oublié</h2>
      <p className="mb-6 text-sm text-muted">
        Indique ton email, on t&apos;envoie un lien pour en choisir un nouveau.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
