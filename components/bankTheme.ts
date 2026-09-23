import type { Bank } from "@/lib/accounts";

export interface BankTheme {
  label: string;
  color: string;
  /** Text color that reads well directly on top of `color`. */
  onColor: string;
}

export const BANK_THEME: Record<Bank, BankTheme> = {
  nubank: { label: "Nubank", color: "#8A05BE", onColor: "#ffffff" },
  banco_do_brasil: { label: "Banco do Brasil", color: "#F8D200", onColor: "#003087" },
  mercado_pago: { label: "Mercado Pago", color: "#3483FA", onColor: "#ffffff" },
  caixa: { label: "Caixa", color: "#0055A4", onColor: "#ffffff" },
  other: { label: "Outro", color: "#71717a", onColor: "#ffffff" },
};

export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
