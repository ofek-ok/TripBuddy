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
import { CurrencyCode, Expense, PaymentMethod } from '@/types/database.types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Edit3, FileText, Plus, SlidersHorizontal, Trash2, Wallet } from 'lucide-react';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Credit Card',
  'Cash',
  'Bank Transfer',
  'Digital Wallet',
  'Other',
];

const CHART_COLORS = ['#172B3A', '#C49B70', '#A8B5A0', '#3E5C76', '#D8B998', '#7F9175', '#6B7280', '#9CA3AF'];

export const BudgetPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    currentUser,
    coupleMembers,
    activeTrip,
    activeBudgetCategories,
    activeExpenses,
    activeDocuments,
    updateCategoryAllocation,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useAppStore();
  const { notify, handleError } = useToast();

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [payerFilter, setPayerFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [allocationsOpen, setAllocationsOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new' && activeTrip) {
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
      setNotes('');
      setExpenseModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, activeTrip, activeBudgetCategories, currentUser, coupleMembers]);

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
  const [notes, setNotes] = useState('');

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const calculatedBaseAmount = Number(
    ((Number(amount) || 0) * (Number(exchangeRate) || 1)).toFixed(2)
  );

  const openCreateExpense = () => {
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
    setNotes('');
    setExpenseModalOpen(true);
  };

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
    setNotes(ex.notes || '');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const origAmount = Number(amount);
      const rate = currency === activeTrip.currency ? 1 : Number(exchangeRate);
      if (origAmount <= 0 || rate <= 0) {
        throw new Error('Amount and exchange rate must be greater than 0');
      }
      const baseAmt = Number((origAmount * rate).toFixed(2));

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
        receipt_document_id: receiptDocId || null,
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
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter((ex) => {
      if (categoryFilter !== 'ALL' && ex.category_id !== categoryFilter) return false;
      if (payerFilter !== 'ALL' && ex.paid_by !== payerFilter) return false;
      if (dateFilter && ex.expense_date !== dateFilter) return false;
      return true;
    });
  }, [activeExpenses, categoryFilter, payerFilter, dateFilter]);

  const totalActual = activeExpenses.reduce((sum, ex) => sum + Number(ex.base_amount), 0);
  const remaining = activeTrip.planned_budget - totalActual;

  // Report 1 & 2: Planned vs Actual & Expenses by Category
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

  // Report 3: Expenses by Day
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

  // Report 4: Expenses by Partner
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
        <div className="flex items-center gap-2">
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

      {/* Top Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-navy/60">{t.dashboard.plannedBudget}</div>
          <div className="text-lg sm:text-xl font-bold text-navy mt-1">
            {formatCurrency(activeTrip.planned_budget, activeTrip.currency, lang)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-navy/60">{t.dashboard.actualExpenses}</div>
          <div className="text-lg sm:text-xl font-bold text-sand-dark mt-1">
            {formatCurrency(totalActual, activeTrip.currency, lang)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-navy/60">{t.dashboard.remainingBudget}</div>
          <div
            className={`text-lg sm:text-xl font-bold mt-1 ${
              remaining < 0 ? 'text-red-600' : 'text-sage-dark'
            }`}
          >
            {formatCurrency(remaining, activeTrip.currency, lang)}
          </div>
        </Card>
      </div>

      {/* Visual Reports Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Planned vs Actual by Category */}
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

        {/* Chart 2: Expenses by Day & Partner Split */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{t.budget.byDay} & {t.budget.byPartner}</h3>
          </div>
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
            const linkedReceipt = activeDocuments.find(
              (d) => d.id === ex.receipt_document_id
            );

            return (
              <Card
                key={ex.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {cat && <Badge variant="sage">{t.budget.categories[cat.name]}</Badge>}
                    <span className="text-xs text-navy/60">
                      {formatShortDate(ex.expense_date, lang)} • {ex.payment_method}
                    </span>
                    {payer && (
                      <Badge variant="ivory">
                        {t.budget.paidBy}: {payer.full_name}
                      </Badge>
                    )}
                    {linkedReceipt && (
                      <Badge variant="sand">
                        <FileText className="w-3 h-3 me-1" />
                        {linkedReceipt.name}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-navy">{ex.title}</h4>
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

      {/* Add / Edit Expense Drawer */}
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
            placeholder={lang === 'he' ? 'למשל: ארוחת ערב בטראסטוורה' : 'e.g., Dinner in Trastevere'}
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
                if (nextCurr === activeTrip.currency) {
                  setExchangeRate('1');
                }
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
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-ivory">
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
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

          <Select
            label={t.budget.receiptDoc}
            value={receiptDocId}
            onChange={(e) => setReceiptDocId(e.target.value)}
          >
            <option value="">{lang === 'he' ? 'ללא קבלה מקושרת' : 'None'}</option>
            {activeDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.category})
              </option>
            ))}
          </Select>

          <Textarea
            label={t.common.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
};
