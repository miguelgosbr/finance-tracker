"use client";

import { useState } from "react";
import { AccountForm, type AccountFormInput } from "@/components/AccountForm";
import { contrastTextColor, getAccountTheme } from "@/components/bankTheme";
import type { Account } from "@/lib/accounts";

export type { AccountFormInput };

interface AccountTabsProps {
  accounts: Account[];
  scope: string;
  onSelect: (scope: string) => void;
  onCreate: (input: AccountFormInput) => Promise<void>;
}

const TAB_BASE =
  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
const TAB_INACTIVE =
  "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";

export function AccountTabs({ accounts, scope, onSelect, onCreate }: AccountTabsProps) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {accounts.map((account) => {
          const theme = getAccountTheme(account);
          const isActive = scope === String(account.id);
          const activeTextColor = contrastTextColor(theme.color);
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelect(String(account.id))}
              className={`${TAB_BASE} ${isActive ? "" : TAB_INACTIVE}`}
              style={isActive ? { backgroundColor: theme.color, color: activeTextColor } : undefined}
            >
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: isActive ? activeTextColor : theme.color }}
              />
              {account.name}
              {account.has_credit_line && (
                <span className="ml-1 text-xs opacity-70">(crédito)</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect("all")}
          className={`${TAB_BASE} ${scope === "all" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : TAB_INACTIVE}`}
        >
          Todas
        </button>

        <button
          type="button"
          onClick={() => setIsCreating((value) => !value)}
          className={`${TAB_BASE} border border-dashed border-zinc-300 bg-transparent text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400`}
        >
          + Nova conta
        </button>
      </div>

      {isCreating && (
        <AccountForm
          submitLabel="Criar"
          savingLabel="Criando..."
          onSubmit={async (input) => {
            await onCreate(input);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
