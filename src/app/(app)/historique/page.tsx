import { getHistory } from "@/lib/history/get-history";
import { HistoryCard, HistoryEmptyLink } from "@/components/history/history-card";

export default async function HistoriquePage() {
  const history = await getHistory();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Historique</h1>
      <p className="mt-1 text-muted">Tes dernières sessions de révision et ta progression, toutes matières confondues.</p>

      <div className="mt-6">
        <HistoryCard history={history} emptyAction={<HistoryEmptyLink />} />
      </div>
    </div>
  );
}
