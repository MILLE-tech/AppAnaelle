export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="gradient-text">AppAnaelle</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Réussis ton BTS SAM, une fiche à la fois.</p>
        </div>
        <div className="glass-card p-6">{children}</div>
      </div>
    </div>
  );
}
