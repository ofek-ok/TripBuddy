import { CurrencyCode, Language } from '@/types/database.types';

export const CURRENCIES: { code: CurrencyCode; symbol: string; labelHe: string; labelEn: string }[] = [
  { code: 'ILS', symbol: '₪', labelHe: 'שקל ישראלי (₪)', labelEn: 'Israeli Shekel (₪)' },
  { code: 'EUR', symbol: '€', labelHe: 'אירו (€)', labelEn: 'Euro (€)' },
  { code: 'USD', symbol: '$', labelHe: 'דולר אמריקאי ($)', labelEn: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', labelHe: 'ליש"ט (£)', labelEn: 'British Pound (£)' },
  { code: 'PLN', symbol: 'zł', labelHe: 'זלוטי פולני (zł)', labelEn: 'Polish Zloty (zł)' },
  { code: 'HUF', symbol: 'Ft', labelHe: 'פורינט הונגרי (Ft)', labelEn: 'Hungarian Forint (Ft)' },
  { code: 'JPY', symbol: '¥', labelHe: 'ין יפני (¥)', labelEn: 'Japanese Yen (¥)' },
  { code: 'CHF', symbol: 'CHF', labelHe: 'פרנק שוויצרי (CHF)', labelEn: 'Swiss Franc (CHF)' },
  { code: 'THB', symbol: '฿', labelHe: 'בהט תאילנדי (฿)', labelEn: 'Thai Baht (฿)' },
  { code: 'CAD', symbol: 'CA$', labelHe: 'דולר קנדי (CA$)', labelEn: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', labelHe: 'דולר אוסטרלי (A$)', labelEn: 'Australian Dollar (A$)' },
];

export function formatCurrency(amount: number, currency: string = 'EUR', lang: Language = 'he'): string {
  try {
    return new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: currency.trim() || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatDate(dateStr: string | null | undefined, lang: Language = 'he'): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string | null | undefined, lang: Language = 'he'): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function getDaysDifference(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function getCountdownDays(targetDate: string): number {
  const [ty, tm, td] = targetDate.split('-').map(Number);
  const target = new Date(ty, tm - 1, td);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
