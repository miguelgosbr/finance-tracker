import { Dashboard } from "@/components/Dashboard";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { listCategories } from "@/lib/categories";
import { getCurrentBalance, listTransactions } from "@/lib/transactions";

export default function Home() {
  return (
    <Dashboard
      initialCategories={listCategories()}
      initialTransactions={listTransactions()}
      initialBalance={getCurrentBalance()}
      initialBurnRate={getBurnRateDiagnosis()}
    />
  );
}
