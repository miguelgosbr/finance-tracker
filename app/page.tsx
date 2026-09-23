import { Dashboard } from "@/components/Dashboard";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { listCategories } from "@/lib/categories";
import { accrueAllYields, listCofrinhos } from "@/lib/cofrinhos";
import { getTimeSeries } from "@/lib/reports";
import { getCurrentBalance, listTransactions } from "@/lib/transactions";

export default function Home() {
  accrueAllYields();

  return (
    <Dashboard
      initialCategories={listCategories()}
      initialTransactions={listTransactions()}
      initialBalance={getCurrentBalance()}
      initialBurnRate={getBurnRateDiagnosis()}
      initialReportPeriod="month"
      initialReportData={getTimeSeries("month")}
      initialCofrinhos={listCofrinhos()}
    />
  );
}
