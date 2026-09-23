import { Dashboard } from "@/components/Dashboard";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { listCategories } from "@/lib/categories";
import { accrueAllYields, listCofrinhos } from "@/lib/cofrinhos";
import { getTimeSeries } from "@/lib/reports";
import { getSetting } from "@/lib/settings";
import { getCurrentBalance, listTransactions } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function Home() {
  await accrueAllYields();

  const [
    categories,
    transactions,
    balance,
    burnRate,
    reportData,
    cofrinhos,
    monthlyBudget,
    cdiRateAnnual,
  ] = await Promise.all([
    listCategories(),
    listTransactions(),
    getCurrentBalance(),
    getBurnRateDiagnosis(),
    getTimeSeries("month"),
    listCofrinhos(),
    getSetting("monthly_budget"),
    getSetting("cdi_rate_annual"),
  ]);

  return (
    <Dashboard
      initialCategories={categories}
      initialTransactions={transactions}
      initialBalance={balance}
      initialBurnRate={burnRate}
      initialReportPeriod="month"
      initialReportData={reportData}
      initialCofrinhos={cofrinhos}
      initialSettings={{
        monthly_budget: monthlyBudget ?? "",
        cdi_rate_annual: cdiRateAnnual ?? "",
      }}
    />
  );
}
