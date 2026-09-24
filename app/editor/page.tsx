import { redirect } from "next/navigation";
import { EditorDashboard } from "@/components/EditorDashboard";
import { listAccounts } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { listCofrinhosForUser } from "@/lib/cofrinhos";
import { getSetting } from "@/lib/settings";
import { listTransactionsForUser } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [accounts, categories, transactions, monthlyBudget, cdiRateAnnual, cofrinhos] =
    await Promise.all([
      listAccounts(user.id),
      listCategories(user.id),
      listTransactionsForUser(user.id),
      getSetting(user.id, "monthly_budget"),
      getSetting(user.id, "cdi_rate_annual"),
      listCofrinhosForUser(user.id),
    ]);

  return (
    <EditorDashboard
      user={user}
      initialAccounts={accounts}
      initialCategories={categories}
      initialTransactions={transactions}
      initialSettings={{
        monthly_budget: monthlyBudget ?? "",
        cdi_rate_annual: cdiRateAnnual ?? "",
      }}
      initialCofrinhos={cofrinhos}
    />
  );
}
