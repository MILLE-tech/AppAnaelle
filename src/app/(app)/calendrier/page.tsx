import { Card } from "@/components/ui/card";

export default function CalendrierPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold">Calendrier</h1>
      <Card className="mt-6">
        <p className="text-sm text-muted">
          Le suivi des évaluations arrivera à la dernière étape du projet.
        </p>
      </Card>
    </div>
  );
}
