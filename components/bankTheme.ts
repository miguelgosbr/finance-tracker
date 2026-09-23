import type { Account, Bank } from "@/lib/accounts";

export const BANK_PRESETS: Record<Exclude<Bank, "custom">, { label: string; color: string }> = {
  nubank: { label: "Nubank", color: "#8A05BE" },
  banco_do_brasil: { label: "Banco do Brasil", color: "#F8D200" },
  mercado_pago: { label: "Mercado Pago", color: "#3483FA" },
  caixa: { label: "Caixa", color: "#0055A4" },
};

export const BANK_LABELS: Record<Bank, string> = {
  nubank: BANK_PRESETS.nubank.label,
  banco_do_brasil: BANK_PRESETS.banco_do_brasil.label,
  mercado_pago: BANK_PRESETS.mercado_pago.label,
  caixa: BANK_PRESETS.caixa.label,
  custom: "Outro banco",
};

export const DEFAULT_CUSTOM_COLOR = "#71717a";

/** The preset's default color for a bank, or the neutral default for "custom". */
export function defaultColorForBank(bank: Bank): string {
  return bank === "custom" ? DEFAULT_CUSTOM_COLOR : BANK_PRESETS[bank].color;
}

export function getAccountTheme(account: Pick<Account, "bank" | "bank_color">): {
  label: string;
  color: string;
} {
  return { label: BANK_LABELS[account.bank], color: account.bank_color };
}

export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Picks black or white text for legibility on top of a solid `hex` background. */
export function contrastTextColor(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}
