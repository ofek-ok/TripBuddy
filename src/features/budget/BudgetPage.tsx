import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalDrawer,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { CURRENCIES, formatCurrency, formatShortDate } from '@/lib/utils/formatters';
import { apiRequest } from '@/lib/api/client';
import {
  calculateTaxFreeRefund,
  matchTaxFreeCountryFromTrip,
  TAX_FREE_COUNTRIES,
} from '@/lib/utils/taxFree';
import { CurrencyCode, Expense, PaymentMethod, TripDocument } from '@/types/database.types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgePercent,
  CalendarRange,
  Camera,
  Edit3,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from 'lucide-react';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Credit Card',
  'Cash',
  'Bank Transfer',
  'Digital Wallet',
  'Other',
];

const CHART_COLORS = ['#172B3A', '#C49B70', '#A8B5A0', '#3E5C76', '#D8B998', '#7F9175'];

export const BudgetPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    currentUser,
    coupleMembers,
    activeTrip,
    activeBudgetCategories,
    activeExpenses,
    activeDocuments,
    updateTrip,
    updateCategoryAllocation,
    createExpense,
    updateExpense,
    deleteExpense,
    uploadDocument,
    getDocumentSignedUrl,
  } = useAppStore();
  const { notify, handleError } = useToast();

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [payerFilter, setPayerFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [editTotalBudgetOpen, setEditTotalBudgetOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [allocationsOpen, setAllocationsOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Expense form state
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(activeTrip?.currency || 'EUR');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [exchangeRateDate, setExchangeRateDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [paidBy, setPaidBy] = useState<string>(currentUser?.user_id || '');
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [receiptDocId, setReceiptDocId] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Tax Free state
  const [isTaxFree, setIsTaxFree] = useState(false);
  const [taxFreeCountry, setTaxFreeCountry] = useState<string>('OTHER');
  const [taxFreeDocId, setTaxFreeDocId] = useState<string>('');
  const [taxFreeFile, setTaxFreeFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Live official exchange rates (cached from /api/exchange-rates)
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(null);
  const [liveRatesDate, setLiveRatesDate] = useState<string>('');
  const [liveRatesSource, setLiveRatesSource] = useState<string>('');
  const [loadingRates, setLoadingRates] = useState<boolean>(false);

  const fetchLiveRates = async (forceRefresh = false) => {
    try {
      setLoadingRates(true);
      const data = await apiRequest<{
        date: string;
        source: string;
        rates: Record<string, number>;
      }>(`/api/exchange-rates${forceRefresh ? '?refresh=1' : ''}`);
      setLiveRates(data.rates);
      setLiveRatesDate(data.date);
      setLiveRatesSource(data.source);
      return data;
    } catch {
      return null;
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
  }, []);

  const computePairRate = (
    fromCurr: string,
    toCurr: string,
    ratesMap: Record<string, number> | null
  ): string | null => {
    if (fromCurr === toCurr) return '1';
    if (!ratesMap) return null;
    const fromVal = ratesMap[fromCurr];
    const toVal = ratesMap[toCurr];
    if (!fromVal || !toVal) return null;
    const raw = toVal / fromVal;
    const precision = raw < 0.1 ? 5 : 4;
    return String(Number(raw.toFixed(precision)));
  };

  const applyLiveRateForCurrency = async (
    nextCurr: CurrencyCode,
    tripCurr: CurrencyCode,
    forceRefresh = false
  ) => {
    if (nextCurr === tripCurr) {
      setExchangeRate('1');
      return;
    }
    let ratesMap = liveRates;
    let rateDate = liveRatesDate;
    if (!ratesMap || forceRefresh) {
      const fresh = await fetchLiveRates(forceRefresh);
      if (fresh) {
        ratesMap = fresh.rates;
        rateDate = fresh.date;
      }
    }
    const computed = computePairRate(nextCurr, tripCurr, ratesMap);
    if (computed) {
      setExchangeRate(computed);
      if (rateDate) setExchangeRateDate(rateDate);
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new' && activeTrip) {
      openCreateExpense();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, activeTrip]);

  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter((ex) => {
      if (categoryFilter !== 'ALL' && ex.category_id !== categoryFilter) return false;
      if (payerFilter !== 'ALL' && ex.paid_by !== payerFilter) return false;
      if (dateFilter && ex.expense_date !== dateFilter) return false;
      return true;
    });
  }, [activeExpenses, categoryFilter, payerFilter, dateFilter]);

  const categoryReportData = useMemo(() => {
    return activeBudgetCategories.map((cat) => {
      const spent = activeExpenses
        .filter((ex) => ex.category_id === cat.id)
        .reduce((s, ex) => s + Number(ex.base_amount), 0);
      return {
        id: cat.id,
        name: t.budget.categories[cat.name],
        planned: Number(cat.allocated_amount || 0),
        actual: Number(spent.toFixed(2)),
      };
    });
  }, [activeBudgetCategories, activeExpenses, t.budget.categories]);

  const expensesByDayData = useMemo(() => {
    const map = new Map<string, number>();
    activeExpenses.forEach((ex) => {
      map.set(ex.expense_date, (map.get(ex.expense_date) || 0) + Number(ex.base_amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dt, total]) => ({
        date: formatShortDate(dt, lang),
        total: Number(total.toFixed(2)),
      }));
  }, [activeExpenses, lang]);

  const expensesByPartnerData = useMemo(() => {
    return coupleMembers.map((cm) => {
      const total = activeExpenses
        .filter((ex) => ex.paid_by === cm.user_id)
        .reduce((s, ex) => s + Number(ex.base_amount), 0);
      return {
        name: cm.profile?.full_name || t.common.partner,
        value: Number(total.toFixed(2)),
      };
    });
  }, [coupleMembers, activeExpenses, t.common.partner]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const calculatedBaseAmount = Number(
    ((Number(amount) || 0) * (currency === activeTrip.currency ? 1 : Number(exchangeRate) || 1)).toFixed(2)
  );
  const taxFreeEstimate = calculateTaxFreeRefund(calculatedBaseAmount, taxFreeCountry);

  function openCreateExpense() {
    if (!activeTrip) return;
    setEditingExpense(null);
    setTitle('');
    setCategoryId(activeBudgetCategories[0]?.id || '');
    setAmount('');
    setCurrency(activeTrip.currency);
    setExchangeRate('1');
    const today = new Date().toISOString().split('T')[0];
    setExchangeRateDate(today);
    setExpenseDate(today);
    setPaidBy(currentUser?.user_id || coupleMembers[0]?.user_id || '');
    setPaymentMethod('Credit Card');
    setReceiptDocId('');
    setReceiptFile(null);
    setIsTaxFree(false);
    setTaxFreeCountry(matchTaxFreeCountryFromTrip(activeTrip.country));
    setTaxFreeDocId('');
    setTaxFreeFile(null);
    setNotes('');
    setExpenseModalOpen(true);
  }

  const openEditExpense = (ex: Expense) => {
    setEditingExpense(ex);
    setTitle(ex.title);
    setCategoryId(ex.category_id);
    setAmount(String(ex.amount));
    setCurrency(ex.currency);
    setExchangeRate(String(ex.exchange_rate));
    setExchangeRateDate(ex.exchange_rate_date);
    setExpenseDate(ex.expense_date);
    setPaidBy(ex.paid_by || '');
    setPaymentMethod(ex.payment_method);
    setReceiptDocId(ex.receipt_document_id || '');
    setReceiptFile(null);
    setIsTaxFree(Boolean(ex.is_tax_free));
    setTaxFreeCountry(ex.tax_free_country || matchTaxFreeCountryFromTrip(activeTrip.country));
    setTaxFreeDocId(ex.tax_free_document_id || '');
    setTaxFreeFile(null);
    setNotes(ex.notes || '');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const origAmount = Number(amount);
      const rate = currency === activeTrip.currency ? 1 : Number(exchangeRate);
      if (origAmount <= 0 || rate <= 0) {
        throw new Error('Amount and exchange rate must be greater than 0');
      }
      const baseAmt = Number((origAmount * rate).toFixed(2));

      // Upload Receipt photo directly if user picked a file
      let finalReceiptDocId = receiptDocId || null;
      if (receiptFile) {
        const uploaded = await uploadDocument(receiptFile, {
          name: `${lang === 'he' ? 'קבלה' : 'Receipt'} – ${title.trim()}`,
          category: 'Receipts',
          expiration_date: null,
          description: `${origAmount} ${currency}`,
        });
        finalReceiptDocId = uploaded.id;
      }

      // Upload Tax-Free form photo directly if user picked a file
      let finalTaxFreeDocId = taxFreeDocId || null;
      if (isTaxFree && taxFreeFile) {
        const uploadedTf = await uploadDocument(taxFreeFile, {
          name: `Tax Free – ${title.trim()}`,
          category: 'Receipts',
          expiration_date: null,
          description: `Tax Free Form (${taxFreeCountry})`,
        });
        finalTaxFreeDocId = uploadedTf.id;
      }

      const refundAmount = isTaxFree
        ? calculateTaxFreeRefund(baseAmt, taxFreeCountry).estimatedRefund
        : 0;

      const payload = {
        trip_id: activeTrip.id,
        category_id: categoryId || activeBudgetCategories[0]?.id,
        title: title.trim(),
        amount: origAmount,
        currency,
        base_amount: baseAmt,
        exchange_rate: rate,
        exchange_rate_date: exchangeRateDate,
        paid_by: paidBy || null,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        receipt_document_id: finalReceiptDocId,
        tax_free_document_id: isTaxFree ? finalTaxFreeDocId : null,
        is_tax_free: isTaxFree,
        tax_free_country: isTaxFree ? taxFreeCountry : null,
        tax_free_refund_amount: refundAmount,
        notes: notes.trim() || null,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        notify(lang === 'he' ? 'ההוצאה עודכנה' : 'Expense updated', 'success');
      } else {
        await createExpense(payload);
        notify(lang === 'he' ? 'ההוצאה נוספה לתקציב' : 'Expense recorded', 'success');
      }
      setExpenseModalOpen(false);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openDocumentPreview = async (doc: TripDocument) => {
    try {
      const url = await getDocumentSignedUrl(doc);
      setPreviewDocTitle(doc.name);
      setPreviewDocUrl(url);
    } catch (err) {
      handleError(err);
    }
  };

  const totalActual = activeExpenses.reduce((sum, ex) => sum + Number(ex.base_amount), 0);
  const remaining = activeTrip.planned_budget - totalActual;
  const totalTaxFreeRefund = activeExpenses.reduce(
    (sum, ex) => sum + (ex.is_tax_free ? Number(ex.tax_free_refund_amount || 0) : 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.budget.title}</h1>
          <p className="text-xs text-navy/65">
            {activeTrip.name} • {t.common.currency}: {activeTrip.currency}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAllocationsOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t.budget.editAllocations}</span>
          </Button>
          <Button size="sm" onClick={openCreateExpense}>
            <Plus className="w-4 h-4" />
            <span>{t.budget.addExpense}</span>
          </Button>
        </div>
      </div>

      {/* Top Summary Cards (Including Direct Edit Total Budget + Tax Free Refund Card) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-navy/60">{t.dashboard.plannedBudget}</span>
            <button
              type="button"
              onClick={() => {
                setTotalBudgetInput(String(activeTrip.planned_budget));
                setEditTotalBudgetOpen(true);
              }}
              className="text-xs font-bold text-sand hover:underline flex items-center gap-1"
              title={lang === 'he' ? 'שינוי תקציב הטיול' : 'Edit Total Budget'}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{lang === 'he' ? 'עדכון' : 'Edit'}</span>
            </button>
          </div>
          <div className="text-lg sm:text-xl font-bold text-navy mt-1 truncate">
            {formatCurrency(activeTrip.planned_budget, activeTrip.currency, lang)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-navy/60">{t.dashboard.actualExpenses}</div>
          <div className="text-lg sm:text-xl font-bold text-sand-dark mt-1 truncate">
            {formatCurrency(totalActual, activeTrip.currency, lang)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-navy/60">{t.dashboard.remainingBudget}</div>
          <div
            className={`text-lg sm:text-xl font-bold mt-1 truncate ${
              remaining < 0 ? 'text-red-600' : 'text-sage-dark'
            }`}
          >
            {formatCurrency(remaining, activeTrip.currency, lang)}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-sage/20 to-surface border-sage/40">
          <div className="text-xs font-bold text-navy/75 flex items-center gap-1">
            <BadgePercent className="w-3.5 h-3.5 text-sage-dark" />
            <span>{lang === 'he' ? 'החזר Tax Free צפוי' : 'Est. Tax-Free Refund'}</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-sage-dark mt-1 truncate">
            +{formatCurrency(totalTaxFreeRefund, activeTrip.currency, lang)}
          </div>
        </Card>
      </div>

      {/* Visual Reports Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="font-bold text-sm">{t.budget.byCategory}</h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryReportData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172B3A15" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="planned" fill="#A8B5A0" radius={[4, 4, 0, 0]} name="Planned" />
                <Bar dataKey="actual" fill="#172B3A" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-bold text-sm">
            {t.budget.byDay} & {t.budget.byPartner}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="h-48 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByDayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#172B3A15" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#C49B70" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-navy/70">{t.budget.byPartner}</div>
              {expensesByPartnerData.map((p, idx) => (
                <div
                  key={p.name}
                  className="p-2.5 rounded-xl bg-ivory/70 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    {p.name}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(p.value, activeTrip.currency, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label={t.common.category}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">{t.common.all}</option>
            {activeBudgetCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {t.budget.categories[cat.name]}
              </option>
            ))}
          </Select>

          <Select
            label={t.budget.paidBy}
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
          >
            <option value="ALL">{t.common.all}</option>
            {coupleMembers.map((cm) => (
              <option key={cm.user_id} value={cm.user_id}>
                {cm.profile?.full_name || t.common.partner}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            label={t.common.date}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Wallet className="w-8 h-8 text-sand mx-auto" />
          <p className="text-sm font-semibold">
            {lang === 'he' ? 'לא נמצאו הוצאות תואמות' : 'No matching expenses found'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((ex) => {
            const cat = activeBudgetCategories.find((c) => c.id === ex.category_id);
            const payer = coupleMembers.find((cm) => cm.user_id === ex.paid_by)?.profile;
            const linkedReceipt = activeDocuments.find((d) => d.id === ex.receipt_document_id);
            const linkedTaxFreeDoc = activeDocuments.find(
              (d) => d.id === ex.tax_free_document_id
            );

            return (
              <Card
                key={ex.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cat && <Badge variant="sage">{t.budget.categories[cat.name]}</Badge>}
                    {ex.source_event_id && (
                      <Badge variant="navy">
                        <CalendarRange className="w-3 h-3 me-1" />
                        {lang === 'he' ? 'נמשך מהמסלול' : 'From Itinerary'}
                      </Badge>
                    )}
                    <span className="text-xs text-navy/60">
                      {formatShortDate(ex.expense_date, lang)} • {ex.payment_method}
                    </span>
                    {payer && (
                      <Badge variant="ivory">
                        {t.budget.paidBy}: {payer.full_name}
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-navy">{ex.title}</h4>

                  {/* Receipt / Tax Free Refund Badges & Quick Preview */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {ex.is_tax_free && Number(ex.tax_free_refund_amount) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage/25 text-navy text-xs font-bold border border-sage/50">
                        <BadgePercent className="w-3.5 h-3.5 text-sage-dark" />
                        <span>
                          Tax Free: +
                          {formatCurrency(
                            Number(ex.tax_free_refund_amount),
                            activeTrip.currency,
                            lang
                          )}
                        </span>
                      </span>
                    )}
                    {linkedReceipt && (
                      <button
                        type="button"
                        onClick={() => openDocumentPreview(linkedReceipt)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sand/20 text-navy text-xs font-semibold hover:bg-sand/30"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{lang === 'he' ? 'צפייה בקבלה' : 'View Receipt'}</span>
                      </button>
                    )}
                    {linkedTaxFreeDoc && (
                      <button
                        type="button"
                        onClick={() => openDocumentPreview(linkedTaxFreeDoc)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-navy/10 text-navy text-xs font-semibold hover:bg-navy/15"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{lang === 'he' ? 'טופס Tax Free' : 'Tax-Free Form'}</span>
                      </button>
                    )}
                  </div>

                  {ex.notes && <p className="text-xs text-navy/65">{ex.notes}</p>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-navy/10">
                  <div className="text-end">
                    <div className="font-bold text-base text-navy">
                      {formatCurrency(ex.base_amount, activeTrip.currency, lang)}
                    </div>
                    {ex.currency !== activeTrip.currency && (
                      <div className="text-[11px] text-navy/60">
                        {formatCurrency(ex.amount, ex.currency, lang)} (×{ex.exchange_rate})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditExpense(ex)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteExpense(ex.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Total Planned Budget Modal */}
      <ModalDrawer
        open={editTotalBudgetOpen}
        onClose={() => setEditTotalBudgetOpen(false)}
        title={lang === 'he' ? 'עדכון תקציב הטיול הכולל' : 'Update Total Trip Budget'}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateTrip(activeTrip.id, {
                planned_budget: Math.max(0, Number(totalBudgetInput) || 0),
              });
              setEditTotalBudgetOpen(false);
              notify(lang === 'he' ? 'התקציב הכולל עודכן!' : 'Total budget updated!', 'success');
            } catch (err) {
              handleError(err);
            }
          }}
          className="space-y-4"
        >
          <Input
            type="number"
            min="0"
            step="10"
            required
            label={`${t.dashboard.plannedBudget} (${activeTrip.currency})`}
            value={totalBudgetInput}
            onChange={(e) => setTotalBudgetInput(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTotalBudgetOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Category Allocations Modal */}
      <ModalDrawer
        open={allocationsOpen}
        onClose={() => setAllocationsOpen(false)}
        title={t.budget.editAllocations}
      >
        <div className="space-y-3">
          {activeBudgetCategories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-navy">
                {t.budget.categories[cat.name]}
              </span>
              <Input
                type="number"
                min="0"
                step="10"
                className="w-36"
                value={cat.allocated_amount}
                onChange={(e) =>
                  updateCategoryAllocation(cat.id, Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          ))}
          <div className="flex justify-end pt-3">
            <Button onClick={() => setAllocationsOpen(false)}>{t.common.close}</Button>
          </div>
        </div>
      </ModalDrawer>

      {/* Add / Edit Expense Drawer (With Receipt Photo Upload + Tax Free Calculator & Photo) */}
      <ModalDrawer
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title={editingExpense ? t.common.edit : t.budget.addExpense}
      >
        <form onSubmit={handleSaveExpense} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'תיאור ההוצאה' : 'Expense Title'}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: קניות ב-Zara / מסעדה' : 'e.g., Shopping / Dinner'}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.category}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {activeBudgetCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t.budget.categories[cat.name]}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              label={t.common.date}
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              label={t.budget.originalAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select
              label={t.common.currency}
              value={currency}
              onChange={(e) => {
                const nextCurr = e.target.value as CurrencyCode;
                setCurrency(nextCurr);
                applyLiveRateForCurrency(nextCurr, activeTrip.currency);
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>

          {currency !== activeTrip.currency && (
            <div className="space-y-2 p-3 rounded-xl bg-ivory">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-sage-dark">
                  {loadingRates
                    ? lang === 'he'
                      ? 'טוען שער יציג...'
                      : 'Fetching official rate...'
                    : lang === 'he'
                      ? `שער יציג אוטומטי${liveRatesDate ? ` (${liveRatesDate})` : ''}`
                      : `Auto official rate${liveRatesDate ? ` (${liveRatesDate})` : ''}`}
                  {liveRatesSource ? ` • ${liveRatesSource}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => applyLiveRateForCurrency(currency, activeTrip.currency, true)}
                  disabled={loadingRates}
                  className="inline-flex items-center gap-1 font-bold text-navy hover:text-sand transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRates ? 'animate-spin' : ''}`} />
                  <span>{lang === 'he' ? 'רענון שער' : 'Refresh'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.00001"
                  min="0.00001"
                  required
                  label={`${t.budget.exchangeRate} (${currency} → ${activeTrip.currency})`}
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
                <Input
                  type="date"
                  label={t.budget.exchangeRateDate}
                  value={exchangeRateDate}
                  onChange={(e) => setExchangeRateDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-sage/20 flex items-center justify-between text-xs">
            <span className="font-semibold text-navy">{t.budget.baseAmount}:</span>
            <span className="font-bold text-base text-navy">
              {formatCurrency(calculatedBaseAmount, activeTrip.currency, lang)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.budget.paidBy}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {coupleMembers.map((cm) => (
                <option key={cm.user_id} value={cm.user_id}>
                  {cm.profile?.full_name || t.common.partner}
                </option>
              ))}
            </Select>
            <Select
              label={t.budget.paymentMethod}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </Select>
          </div>

          {/* Direct Receipt Photo Upload */}
          <div className="p-3 rounded-2xl bg-ivory/70 border border-navy/10 space-y-2">
            <label className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sand" />
              <span>{lang === 'he' ? 'צילום / העלאת קבלה (נשמר בכספת)' : 'Upload Receipt Photo'}</span>
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-navy file:me-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white"
            />
          </div>

          {/* Tax Free Toggle + Country Refund Calculator + Tax Free Form Photo */}
          <div className="p-3.5 rounded-2xl bg-sage/15 border border-sage/40 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4 text-sage-dark" />
                <span>
                  {lang === 'he'
                    ? 'הוצאה זכאית להחזר מע״מ (Tax Free)'
                    : 'Eligible for Tax-Free VAT Refund'}
                </span>
              </span>
              <input
                type="checkbox"
                checked={isTaxFree}
                onChange={(e) => setIsTaxFree(e.target.checked)}
                className="w-4 h-4 accent-navy rounded"
              />
            </label>

            {isTaxFree && (
              <div className="space-y-3 pt-1 border-t border-sage/30">
                <Select
                  label={lang === 'he' ? 'מדינת הרכישה (לחישוב החזר)' : 'Purchase Country'}
                  value={taxFreeCountry}
                  onChange={(e) => setTaxFreeCountry(e.target.value)}
                >
                  {TAX_FREE_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {lang === 'he' ? c.nameHe : c.nameEn} (VAT {Math.round(c.vatRate * 100)}% •{' '}
                      {lang === 'he' ? 'החזר נטו' : 'Net'} ~{Math.round(c.netRefundRate * 100)}%)
                    </option>
                  ))}
                </Select>

                <div className="p-3 rounded-xl bg-surface border border-sage/40 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-navy/70">
                      {lang === 'he' ? 'החזר Tax Free משוער:' : 'Estimated Net Refund:'}
                    </span>
                    <span className="font-extrabold text-base text-sage-dark">
                      +{formatCurrency(taxFreeEstimate.estimatedRefund, activeTrip.currency, lang)}
                    </span>
                  </div>
                  <div className="text-[11px] text-navy/60">
                    {lang === 'he' ? 'מינימום לקבלה במדינה זו:' : 'Min. receipt threshold:'}{' '}
                    <strong>{taxFreeEstimate.rule.minSpendLabel}</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sand" />
                    <span>
                      {lang === 'he'
                        ? 'צילום / העלאת טופס Tax Free'
                        : 'Upload Tax-Free Form Photo'}
                    </span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setTaxFreeFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-navy file:me-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sand file:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <Textarea
            label={t.common.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t.common.loading : t.common.save}
            </Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Signed Document Preview Modal */}
      <ModalDrawer
        open={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        title={previewDocTitle}
      >
        {previewDocUrl && (
          <img
            src={previewDocUrl}
            alt={previewDocTitle}
            className="w-full max-h-[65vh] object-contain rounded-2xl border border-navy/10"
          />
        )}
      </ModalDrawer>
    </div>
  );
};
