import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { listAccounts } from "@/lib/accounts";
import { getBurnRateDiagnosis } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { accrueYieldsForAccount, listCofrinhosForUser } from "@/lib/cofrinhos";
import { getCreditLineStatus } from "@/lib/creditLine";
import { getTimeSeries } from "@/lib/reports";
import { getCurrentBalance, listTransactionsForUser } from "@/lib/transactions";
import { listTransfersForUser } from "@/lib/transfers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accounts = await listAccounts(user.id);
  const selectedAccountId = accounts[0]?.id ?? null;
  const selectedAccount = accounts[0] ?? null;

  if (selectedAccountId !== null) {
    await accrueYieldsForAccount(selectedAccountId);
  }

  const [categories, transactions, balance, burnRate, reportData, cofrinhos, creditLine, transfers] =
    await Promise.all([
      listCategories(user.id),
      selectedAccountId !== null
        ? listTransactionsForUser(user.id, [selectedAccountId])
        : Promise.resolve([]),
      selectedAccountId !== null ? getCurrentBalance(selectedAccountId) : Promise.resolve(0),
      getBurnRateDiagnosis(user.id, selectedAccountId !== null ? [selectedAccountId] : []),
      getTimeSeries(selectedAccountId !== null ? [selectedAccountId] : [], "month"),
      selectedAccountId !== null
        ? listCofrinhosForUser(user.id, [selectedAccountId])
        : Promise.resolve([]),
      selectedAccount ? getCreditLineStatus(selectedAccount) : Promise.resolve(null),
      selectedAccountId !== null
        ? listTransfersForUser(user.id, [selectedAccountId])
        : Promise.resolve([]),
    ]);

  return (
    <Dashboard
      user={user}
      initialAccounts={accounts}
      initialScope={selectedAccountId !== null ? String(selectedAccountId) : "all"}
      initialCategories={categories}
      initialTransactions={transactions}
      initialBalance={balance}
      initialBurnRate={burnRate}
      initialReportPeriod="month"
      initialReportData={reportData}
      initialCofrinhos={cofrinhos}
      initialCreditLine={creditLine}
      initialTransfers={transfers}
    />
  );
}
