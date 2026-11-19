// ============================================================================
// Country Tax-Free (VAT Refund) Estimator
// Standard tourist VAT rates, typical net refund rates (after operator fee),
// and minimum single-receipt thresholds.
// ============================================================================

export interface TaxFreeCountryRule {
  code: string;
  nameHe: string;
  nameEn: string;
  vatRate: number; // e.g. 0.23 for 23%
  netRefundRate: number; // typical tourist net refund after Global Blue / Planet fee
  minSpendLabel: string;
}

export const TAX_FREE_COUNTRIES: TaxFreeCountryRule[] = [
  { code: 'PL', nameHe: 'פולין', nameEn: 'Poland', vatRate: 0.23, netRefundRate: 0.125, minSpendLabel: '200 PLN (~€46)' },
  { code: 'HU', nameHe: 'הונגריה', nameEn: 'Hungary', vatRate: 0.27, netRefundRate: 0.145, minSpendLabel: '63,001 HUF (~€160)' },
  { code: 'IT', nameHe: 'איטליה', nameEn: 'Italy', vatRate: 0.22, netRefundRate: 0.12, minSpendLabel: '€70.01' },
  { code: 'FR', nameHe: 'צרפת', nameEn: 'France', vatRate: 0.20, netRefundRate: 0.12, minSpendLabel: '€100.01' },
  { code: 'ES', nameHe: 'ספרד', nameEn: 'Spain', vatRate: 0.21, netRefundRate: 0.125, minSpendLabel: 'ללא מינימום (€0)' },
  { code: 'DE', nameHe: 'גרמניה', nameEn: 'Germany', vatRate: 0.19, netRefundRate: 0.105, minSpendLabel: '€50' },
  { code: 'GR', nameHe: 'יוון', nameEn: 'Greece', vatRate: 0.24, netRefundRate: 0.13, minSpendLabel: '€50' },
  { code: 'CZ', nameHe: 'צ׳כיה', nameEn: 'Czech Republic', vatRate: 0.21, netRefundRate: 0.12, minSpendLabel: '2,001 CZK (~€80)' },
  { code: 'AT', nameHe: 'אוסטריה', nameEn: 'Austria', vatRate: 0.20, netRefundRate: 0.115, minSpendLabel: '€75.01' },
  { code: 'PT', nameHe: 'פורטוגל', nameEn: 'Portugal', vatRate: 0.23, netRefundRate: 0.125, minSpendLabel: '€61.35' },
  { code: 'NL', nameHe: 'הולנד', nameEn: 'Netherlands', vatRate: 0.21, netRefundRate: 0.115, minSpendLabel: '€50' },
  { code: 'CH', nameHe: 'שווייץ', nameEn: 'Switzerland', vatRate: 0.081, netRefundRate: 0.055, minSpendLabel: '300 CHF' },
  { code: 'JP', nameHe: 'יפן', nameEn: 'Japan', vatRate: 0.10, netRefundRate: 0.085, minSpendLabel: '¥5,000' },
  { code: 'TH', nameHe: 'תאילנד', nameEn: 'Thailand', vatRate: 0.07, netRefundRate: 0.05, minSpendLabel: '2,000 THB' },
  { code: 'AE', nameHe: 'איחוד האמירויות (דובאי)', nameEn: 'UAE (Dubai)', vatRate: 0.05, netRefundRate: 0.04, minSpendLabel: '250 AED' },
  { code: 'OTHER', nameHe: 'אירופה / אחר (ממוצע ~11%)', nameEn: 'Europe / Other (~11%)', vatRate: 0.20, netRefundRate: 0.11, minSpendLabel: '€50–€100' },
];

export function matchTaxFreeCountryFromTrip(countryStr?: string | null): string {
  if (!countryStr) return 'OTHER';
  const lower = countryStr.toLowerCase();
  const found = TAX_FREE_COUNTRIES.find(
    (c) =>
      lower.includes(c.nameHe.toLowerCase()) ||
      lower.includes(c.nameEn.toLowerCase()) ||
      lower.includes(c.code.toLowerCase())
  );
  return found?.code || 'OTHER';
}

export function calculateTaxFreeRefund(baseAmount: number, countryCode: string): {
  estimatedRefund: number;
  rule: TaxFreeCountryRule;
} {
  const rule =
    TAX_FREE_COUNTRIES.find((c) => c.code === countryCode) ||
    TAX_FREE_COUNTRIES[TAX_FREE_COUNTRIES.length - 1];
  const estimatedRefund = Number((Math.max(0, baseAmount) * rule.netRefundRate).toFixed(2));
  return { estimatedRefund, rule };
}
