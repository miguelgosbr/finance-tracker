import type { BurnRateDiagnosis } from "@/lib/analytics";

const STYLES: Record<BurnRateDiagnosis["status"], string> = {
  no_data: "border-zinc-200 dark:border-zinc-800",
  on_track: "border-green-300 dark:border-green-800",
  ahead_of_pace: "border-amber-300 dark:border-amber-700",
};

export function BurnRateCard({ diagnosis }: { diagnosis: BurnRateDiagnosis }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 dark:bg-zinc-900 ${STYLES[diagnosis.status]}`}
    >
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Ritmo de gastos do mês
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{diagnosis.message}</p>
    </div>
  );
}
