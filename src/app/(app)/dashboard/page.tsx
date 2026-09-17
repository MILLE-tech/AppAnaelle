import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold">
        Salut{firstName ? ` ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-muted">Prête à réviser aujourd&apos;hui ?</p>

      <Card className="mt-6">
        <p className="text-sm text-muted">
          Ton compte est prêt. Les fiches, quiz et le calendrier arrivent dans les
          prochaines étapes — commence par créer tes matières.
        </p>
      </Card>
    </div>
  );
}
