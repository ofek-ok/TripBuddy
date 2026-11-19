import React, { useEffect, useMemo, useState } from 'react';
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
} from '@/components/ui/primitives';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Backpack,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  FileText,
  Gift,
  HeartPulse,
  Laptop,
  Luggage,
  Minus,
  Plane,
  Plus,
  Shirt,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  Users,
} from 'lucide-react';

interface SmartPreset {
  id: string;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  icon: React.ElementType;
  items: { item_name_he: string; item_name_en: string; category: string; quantity: number }[];
}

const PACKING_CATEGORIES = [
  { id: 'Documents', labelHe: 'מסמכים וטיסה', labelEn: 'Documents & Flight', icon: FileText, color: 'bg-navy text-white' },
  { id: 'Clothing', labelHe: 'ביגוד והנעלה', labelEn: 'Clothing & Shoes', icon: Shirt, color: 'bg-sand text-white' },
  { id: 'Toiletries', labelHe: 'טואלטיקה ורחצה', labelEn: 'Toiletries', icon: Sparkles, color: 'bg-sage text-navy' },
  { id: 'Electronics', labelHe: 'אלקטרוניקה וציוד', labelEn: 'Electronics', icon: Laptop, color: 'bg-navy/15 text-navy' },
  { id: 'Health', labelHe: 'תרופות ועזרה ראשונה', labelEn: 'Health & Meds', icon: HeartPulse, color: 'bg-red-100 text-red-800' },
  { id: 'General', labelHe: 'שונות ותיק יד', labelEn: 'Carry-on & Misc', icon: Backpack, color: 'bg-ivory text-navy' },
];

const SMART_PACKING_PRESETS: SmartPreset[] = [
  {
    id: 'essentials',
    titleHe: 'חובה לטיסה ומסמכים',
    titleEn: 'Flight & Documents',
    descHe: 'דרכונים, כרטיסים, ארנק וביטוח',
    descEn: 'Passports, tickets, wallet & insurance',
    icon: Plane,
    items: [
      { item_name_he: 'דרכונים בתוקף', item_name_en: 'Valid Passports', category: 'Documents', quantity: 2 },
      { item_name_he: 'כרטיסי עלייה למטוס (Boarding Pass)', item_name_en: 'Boarding Passes', category: 'Documents', quantity: 2 },
      { item_name_he: 'פוליסת ביטוח נסיעות', item_name_en: 'Travel Insurance Policy', category: 'Documents', quantity: 1 },
      { item_name_he: 'כרטיסי אשראי ומזומן במטבע מקומי', item_name_en: 'Credit Cards & Local Cash', category: 'Documents', quantity: 2 },
      { item_name_he: 'רישיון נהיגה בינלאומי + רגיל', item_name_en: 'Driver Licenses', category: 'Documents', quantity: 1 },
    ],
  },
  {
    id: 'electronics',
    titleHe: 'אלקטרוניקה וטעינה',
    titleEn: 'Tech & Chargers',
    descHe: 'מטענים, סוללת גיבוי, מתאם ואוזניות',
    descEn: 'Chargers, power bank, adapter & headphones',
    icon: Laptop,
    items: [
      { item_name_he: 'מטענים לטלפונים', item_name_en: 'Phone Chargers', category: 'Electronics', quantity: 2 },
      { item_name_he: 'סוללת גיבוי ניידת (Power Bank)', item_name_en: 'Power Bank', category: 'Electronics', quantity: 1 },
      { item_name_he: 'מתאם חשמל אוניברסלי', item_name_en: 'Universal Power Adapter', category: 'Electronics', quantity: 2 },
      { item_name_he: 'אוזניות לטיסה', item_name_en: 'Headphones / Earbuds', category: 'Electronics', quantity: 2 },
    ],
  },
  {
    id: 'toiletries',
    titleHe: 'תיק רחצה ובריאות',
    titleEn: 'Toiletries & First Aid',
    descHe: 'היגיינה אישית, תרופות ופלסטרים',
    descEn: 'Personal care, meds & first aid',
    icon: HeartPulse,
    items: [
      { item_name_he: 'מברשות ומשחת שיניים', item_name_en: 'Toothbrushes & Toothpaste', category: 'Toiletries', quantity: 2 },
      { item_name_he: 'דאודורנט ובושם', item_name_en: 'Deodorant & Perfume', category: 'Toiletries', quantity: 2 },
      { item_name_he: 'משככי כאבים ופלסטרים', item_name_en: 'Painkillers & Band-aids', category: 'Health', quantity: 1 },
      { item_name_he: 'תרופות קבועות / ויטמינים', item_name_en: 'Personal Medications', category: 'Health', quantity: 1 },
      { item_name_he: 'שפתון לחות וקרם ידיים', item_name_en: 'Lip Balm & Hand Cream', category: 'Toiletries', quantity: 1 },
    ],
  },
  {
    id: 'clothing',
    titleHe: 'מלתחה בסיסית לטיול',
    titleEn: 'Core Wardrobe',
    descHe: 'חולצות, מכנסיים, מעיל ונעלי הליכה',
    descEn: 'Tops, pants, jacket & walking shoes',
    icon: Shirt,
    items: [
      { item_name_he: 'נעלי הליכה נוחות', item_name_en: 'Comfortable Walking Shoes', category: 'Clothing', quantity: 2 },
      { item_name_he: 'מעיל / ז׳קט מחמם', item_name_en: 'Jacket / Coat', category: 'Clothing', quantity: 2 },
      { item_name_he: 'חולצות להחלפה', item_name_en: 'Shirts & Tops', category: 'Clothing', quantity: 6 },
      { item_name_he: 'מכנסיים / ג׳ינסים', item_name_en: 'Pants & Jeans', category: 'Clothing', quantity: 4 },
      { item_name_he: 'גרביים והלבשה תחתונה', item_name_en: 'Socks & Underwear', category: 'Clothing', quantity: 7 },
    ],
  },
];

const QUICK_SHOPPING_LIST_IDEAS = [
  { nameHe: 'פארם והשלמות לפני טיסה', nameEn: 'Pre-Flight Pharmacy & Essentials', icon: Sparkles },
  { nameHe: 'דיוטי פרי (Duty Free)', nameEn: 'Duty Free Shopping', icon: Plane },
  { nameHe: 'מתנות ומזכרות מהטיול', nameEn: 'Souvenirs & Gifts', icon: Gift },
];

export const ListsPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    coupleMembers,
    activeShoppingLists,
    activeShoppingItems,
    packingTemplates,
    activePackingItems,
    createShoppingList,
    deleteShoppingList,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    createPackingItem,
    updatePackingItem,
    deletePackingItem,
    saveCurrentPackingAsTemplate,
    applyPackingTemplate,
    deletePackingTemplate,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [tab, setTab] = useState<'packing' | 'shopping'>('packing');

  // Packing Filters & Modals
  const [packStatusFilter, setPackStatusFilter] = useState<'ALL' | 'UNPACKED' | 'PACKED'>('ALL');
  const [packOwnerFilter, setPackOwnerFilter] = useState<string>('ALL');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [quickAddCategory, setQuickAddCategory] = useState<Record<string, string>>({});

  const [addPackingModalOpen, setAddPackingModalOpen] = useState(false);
  const [packItemName, setPackItemName] = useState('');
  const [packCategory, setPackCategory] = useState('Clothing');
  const [packQuantity, setPackQuantity] = useState('1');
  const [packAssignee, setPackAssignee] = useState('');

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Shopping State
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListModal, setNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [shopItemModalOpen, setShopItemModalOpen] = useState(false);
  const [shopItemName, setShopItemName] = useState('');
  const [shopQuantity, setShopQuantity] = useState('1');
  const [shopPrice, setShopPrice] = useState('');
  const [shopAssignee, setShopAssignee] = useState('');
  const [quickShopInput, setQuickShopInput] = useState('');

  useEffect(() => {
    if (
      activeShoppingLists.length > 0 &&
      !activeShoppingLists.some((l) => l.id === selectedListId)
    ) {
      setSelectedListId(activeShoppingLists[0].id);
    }
  }, [activeShoppingLists, selectedListId]);

  // Filtered packing items
  const filteredPackingItems = useMemo(() => {
    return activePackingItems.filter((item) => {
      if (packStatusFilter === 'UNPACKED' && item.is_packed) return false;
      if (packStatusFilter === 'PACKED' && !item.is_packed) return false;
      if (packOwnerFilter === 'SHARED' && item.assigned_to !== null) return false;
      if (
        packOwnerFilter !== 'ALL' &&
        packOwnerFilter !== 'SHARED' &&
        item.assigned_to !== packOwnerFilter
      ) {
        return false;
      }
      return true;
    });
  }, [activePackingItems, packStatusFilter, packOwnerFilter]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  // Packing stats
  const totalPackCount = activePackingItems.length;
  const packedCount = activePackingItems.filter((i) => i.is_packed).length;
  const packPercent =
    totalPackCount > 0 ? Math.round((packedCount / totalPackCount) * 100) : 0;

  const handleApplySmartPreset = async (preset: SmartPreset) => {
    try {
      const existingNames = new Set(
        activePackingItems.map((i) => i.item_name.trim().toLowerCase())
      );
      let added = 0;
      for (const item of preset.items) {
        const localizedName = lang === 'he' ? item.item_name_he : item.item_name_en;
        if (!existingNames.has(localizedName.toLowerCase())) {
          await createPackingItem({
            trip_id: activeTrip.id,
            item_name: localizedName,
            category: item.category,
            quantity: item.quantity,
            assigned_to: null,
            is_packed: false,
            notes: null,
          });
          added++;
        }
      }
      notify(
        lang === 'he'
          ? `נוספו ${added} פריטים מערכת "${preset.titleHe}" למזוודה!`
          : `Added ${added} items from "${preset.titleEn}"!`,
        'success'
      );
    } catch (err) {
      handleError(err);
    }
  };

  const handleQuickAddInCategory = async (categoryId: string) => {
    const text = (quickAddCategory[categoryId] || '').trim();
    if (!text) return;
    try {
      await createPackingItem({
        trip_id: activeTrip.id,
        item_name: text,
        category: categoryId,
        quantity: 1,
        assigned_to:
          packOwnerFilter !== 'ALL' && packOwnerFilter !== 'SHARED'
            ? packOwnerFilter
            : null,
        is_packed: false,
        notes: null,
      });
      setQuickAddCategory((prev) => ({ ...prev, [categoryId]: '' }));
    } catch (err) {
      handleError(err);
    }
  };

  const handleAddDetailedPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packItemName.trim()) return;
    try {
      await createPackingItem({
        trip_id: activeTrip.id,
        item_name: packItemName.trim(),
        category: packCategory,
        quantity: Math.max(1, Number(packQuantity) || 1),
        assigned_to: packAssignee || null,
        is_packed: false,
        notes: null,
      });
      setPackItemName('');
      setPackQuantity('1');
      setAddPackingModalOpen(false);
      notify(lang === 'he' ? 'הפריט נוסף למזוודה' : 'Item added to suitcase', 'success');
    } catch (err) {
      handleError(err);
    }
  };

  // Shopping handlers
  const currentList = activeShoppingLists.find((l) => l.id === selectedListId);
  const currentListItems = activeShoppingItems.filter((i) => i.list_id === selectedListId);
  const purchasedItemsCount = currentListItems.filter((i) => i.is_purchased).length;
  const totalEstimatedShoppingCost = currentListItems.reduce(
    (sum, i) => sum + (Number(i.estimated_price || 0) * i.quantity),
    0
  );

  const handleQuickCreateShoppingList = async (name: string) => {
    try {
      const created = await createShoppingList(name);
      setSelectedListId(created.id);
      notify(lang === 'he' ? `הרשימה "${name}" נוצרה!` : `List "${name}" created!`, 'success');
    } catch (err) {
      handleError(err);
    }
  };

  const handleQuickAddShopItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShopInput.trim()) return;
    try {
      let targetListId = selectedListId;
      if (!targetListId) {
        const created = await createShoppingList(
          lang === 'he' ? 'קניות לפני הטיסה' : 'Pre-Trip Shopping'
        );
        targetListId = created.id;
        setSelectedListId(targetListId);
      }
      await createShoppingItem({
        list_id: targetListId,
        item_name: quickShopInput.trim(),
        quantity: 1,
        estimated_price: null,
        category: 'General',
        assigned_to: null,
        is_purchased: false,
        notes: null,
      });
      setQuickShopInput('');
    } catch (err) {
      handleError(err);
    }
  };

  const handleDetailedShopItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopItemName.trim()) return;
    try {
      let targetListId = selectedListId;
      if (!targetListId) {
        const created = await createShoppingList(
          lang === 'he' ? 'קניות לפני הטיסה' : 'Pre-Trip Shopping'
        );
        targetListId = created.id;
        setSelectedListId(targetListId);
      }
      await createShoppingItem({
        list_id: targetListId,
        item_name: shopItemName.trim(),
        quantity: Math.max(1, Number(shopQuantity) || 1),
        estimated_price: shopPrice ? Number(shopPrice) : null,
        category: 'General',
        assigned_to: shopAssignee || null,
        is_purchased: false,
        notes: null,
      });
      setShopItemName('');
      setShopQuantity('1');
      setShopPrice('');
      setShopItemModalOpen(false);
    } catch (err) {
      handleError(err);
    }
  };

  const getCategoryMeta = (catId: string) => {
    const found = PACKING_CATEGORIES.find(
      (c) => c.id.toLowerCase() === catId.toLowerCase()
    );
    if (found) return found;
    return {
      id: catId,
      labelHe: catId,
      labelEn: catId,
      icon: Backpack,
      color: 'bg-ivory text-navy',
    };
  };

  // Group packing items by category
  const groupedPackingCategories = useMemo(() => {
    const map = new Map<string, typeof filteredPackingItems>();
    PACKING_CATEGORIES.forEach((c) => map.set(c.id, []));
    filteredPackingItems.forEach((item) => {
      const key =
        PACKING_CATEGORIES.find(
          (c) => c.id.toLowerCase() === item.category.toLowerCase()
        )?.id || item.category;
      map.set(key, [...(map.get(key) || []), item]);
    });
    return Array.from(map.entries()).filter(
      ([catKey, items]) =>
        items.length > 0 ||
        (packStatusFilter === 'ALL' &&
          packOwnerFilter === 'ALL' &&
          ['Documents', 'Clothing', 'Toiletries', 'Electronics'].includes(catKey))
    );
  }, [filteredPackingItems, packStatusFilter, packOwnerFilter]);

  return (
    <div className="space-y-5">
      {/* Top Mode Switcher: Packing Suitcase vs Shopping Lists */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.lists.title}</h1>
          <p className="text-xs text-navy/65">
            {activeTrip.name} • {activeTrip.destination}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-surface rounded-2xl border border-navy/10 shadow-card">
          <button
            onClick={() => setTab('packing')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'packing'
                ? 'bg-navy text-white shadow-sm'
                : 'text-navy/65 hover:text-navy'
            }`}
          >
            <Luggage className="w-4 h-4" />
            <span>{t.lists.packingTab}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                tab === 'packing' ? 'bg-sand text-white' : 'bg-ivory text-navy'
              }`}
            >
              {packedCount}/{totalPackCount}
            </span>
          </button>

          <button
            onClick={() => setTab('shopping')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'shopping'
                ? 'bg-navy text-white shadow-sm'
                : 'text-navy/65 hover:text-navy'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t.lists.shoppingTab}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                tab === 'shopping' ? 'bg-sand text-white' : 'bg-ivory text-navy'
              }`}
            >
              {activeShoppingLists.length}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: INTERACTIVE SUITCASE & PACKING EXPERIENCE                      */}
      {/* ===================================================================== */}
      {tab === 'packing' ? (
        <div className="space-y-5">
          {/* Interactive Suitcase Hero Banner */}
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-navy via-navy-light to-navy text-white shadow-soft space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-sand/25 text-sand flex items-center justify-center shrink-0">
                  <Luggage className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">
                    {lang === 'he' ? 'המזוודה הזוגית שלנו' : 'Our Couple Suitcase'}
                  </h2>
                  <p className="text-xs text-ivory/75">
                    {packedCount} {lang === 'he' ? 'מתוך' : 'of'} {totalPackCount}{' '}
                    {lang === 'he' ? 'פריטים כבר במזוודה' : 'items packed'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalPackCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => setTemplateModalOpen(true)}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-sand" />
                    <span>{t.lists.saveAsTemplate}</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="sand"
                  onClick={() => setAddPackingModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.lists.addItem}</span>
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-ivory/80 font-medium">
                  {packPercent === 100 && totalPackCount > 0
                    ? lang === 'he'
                      ? 'המזוודה מוכנה להמראה! ✈️'
                      : 'Suitcase is ready for takeoff! ✈️'
                    : lang === 'he'
                      ? 'סטטוס אריזה כולל'
                      : 'Overall Packing Progress'}
                </span>
                <span className="font-bold text-sand">{packPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sand to-sage transition-all duration-500 rounded-full"
                  style={{ width: `${packPercent}%` }}
                />
              </div>
            </div>

            {/* Partner Filter Chips inside Hero */}
            <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setPackOwnerFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  packOwnerFilter === 'ALL'
                    ? 'bg-sand text-white'
                    : 'bg-white/10 text-ivory/80 hover:bg-white/15'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.common.all}</span>
              </button>
              <button
                onClick={() => setPackOwnerFilter('SHARED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  packOwnerFilter === 'SHARED'
                    ? 'bg-sand text-white'
                    : 'bg-white/10 text-ivory/80 hover:bg-white/15'
                }`}
              >
                <span>{t.common.both}</span>
              </button>
              {coupleMembers.map((cm) => (
                <button
                  key={cm.user_id}
                  onClick={() => setPackOwnerFilter(cm.user_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                    packOwnerFilter === cm.user_id
                      ? 'bg-sand text-white'
                      : 'bg-white/10 text-ivory/80 hover:bg-white/15'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{cm.profile?.full_name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* One-Click Smart Packing Kits + Saved Couple Templates */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy/65 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sand" />
                <span>
                  {lang === 'he'
                    ? 'ערכות אריזה חכמות בקליק אחד (מוסיף למזוודה שלכם)'
                    : 'One-Click Smart Packing Kits'}
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SMART_PACKING_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplySmartPreset(preset)}
                    className="p-3.5 rounded-2xl bg-surface border border-navy/10 hover:border-sand hover:shadow-soft transition-all text-start flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-ivory group-hover:bg-sand/20 text-navy flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4 text-sand-dark" />
                      </div>
                      <span className="text-[11px] font-bold text-sand flex items-center gap-0.5">
                        <Plus className="w-3 h-3" />
                        {preset.items.length}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy">
                        {lang === 'he' ? preset.titleHe : preset.titleEn}
                      </div>
                      <div className="text-[11px] text-navy/55 line-clamp-1 mt-0.5">
                        {lang === 'he' ? preset.descHe : preset.descEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Saved Custom Couple Templates */}
            {packingTemplates.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pt-1">
                <span className="text-xs font-semibold text-navy/60 shrink-0">
                  {lang === 'he' ? 'התבניות ששמרתם:' : 'Your Saved Templates:'}
                </span>
                {packingTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-xl bg-sage/20 border border-sage/40 text-xs font-semibold text-navy shrink-0"
                  >
                    <button
                      onClick={async () => {
                        await applyPackingTemplate(tpl.id);
                        notify(
                          lang === 'he'
                            ? `התבנית "${tpl.name}" נוספה למזוודה!`
                            : `Loaded template "${tpl.name}"`,
                          'success'
                        );
                      }}
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-navy" />
                      <span>
                        {tpl.name} ({tpl.items.length})
                      </span>
                    </button>
                    <button
                      onClick={() => deletePackingTemplate(tpl.id)}
                      className="text-navy/40 hover:text-red-600 ms-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pills: All / Still Need to Pack / Packed */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'ALL', labelHe: 'כל הפריטים', labelEn: 'All Items' },
                  { id: 'UNPACKED', labelHe: 'טרם נארז', labelEn: 'To Pack' },
                  { id: 'PACKED', labelHe: 'נארז במזוודה', labelEn: 'Packed' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPackStatusFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    packStatusFilter === f.id
                      ? 'bg-navy text-white'
                      : 'bg-surface text-navy/70 border border-navy/10'
                  }`}
                >
                  {lang === 'he' ? f.labelHe : f.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedPackingCategories.map(([catKey, items]) => {
              const meta = getCategoryMeta(catKey);
              const Icon = meta.icon;
              const catPacked = items.filter((i) => i.is_packed).length;
              const isCollapsed = Boolean(collapsedCategories[catKey]);

              return (
                <Card key={catKey} className="p-0 overflow-hidden flex flex-col">
                  {/* Category Header */}
                  <div
                    onClick={() =>
                      setCollapsedCategories((prev) => ({
                        ...prev,
                        [catKey]: !prev[catKey],
                      }))
                    }
                    className="p-4 bg-ivory/60 border-b border-navy/10 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-navy">
                          {lang === 'he' ? meta.labelHe : meta.labelEn}
                        </h3>
                        <div className="text-[11px] text-navy/60">
                          {catPacked} / {items.length}{' '}
                          {lang === 'he' ? 'נארזו' : 'packed'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {items.length > 0 && catPacked === items.length && (
                        <CheckCircle2 className="w-4 h-4 text-sage-dark" />
                      )}
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-navy/50" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-navy/50" />
                      )}
                    </div>
                  </div>

                  {/* Category Body */}
                  {!isCollapsed && (
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      {items.length === 0 ? (
                        <p className="text-xs text-navy/45 text-center py-3">
                          {lang === 'he'
                            ? 'אין עדיין פריטים בקטגוריה זו'
                            : 'No items in this category yet'}
                        </p>
                      ) : (
                        <div className="divide-y divide-navy/[0.06]">
                          {items.map((item) => {
                            const assignee = coupleMembers.find(
                              (cm) => cm.user_id === item.assigned_to
                            )?.profile;

                            return (
                              <div
                                key={item.id}
                                className="py-2.5 flex items-center justify-between gap-2 group"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePackingItem(item.id, {
                                      is_packed: !item.is_packed,
                                    })
                                  }
                                  className="flex items-center gap-3 text-start min-w-0 flex-1"
                                >
                                  <div
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                                      item.is_packed
                                        ? 'bg-sage-dark border-sage-dark text-white'
                                        : 'border-navy/30 bg-ivory/50'
                                    }`}
                                  >
                                    {item.is_packed && <Check className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div
                                      className={`text-sm font-semibold truncate transition-all ${
                                        item.is_packed
                                          ? 'line-through text-navy/40'
                                          : 'text-navy'
                                      }`}
                                    >
                                      {item.item_name}
                                    </div>
                                    {assignee && (
                                      <span className="text-[10px] text-sand-dark font-semibold">
                                        {assignee.full_name}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {/* Quantity stepper + delete */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <div className="flex items-center bg-ivory rounded-lg border border-navy/10 px-1 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updatePackingItem(item.id, {
                                          quantity: Math.max(1, item.quantity - 1),
                                        })
                                      }
                                      className="p-0.5 text-navy/60 hover:text-navy"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-bold px-1.5 text-navy">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updatePackingItem(item.id, {
                                          quantity: item.quantity + 1,
                                        })
                                      }
                                      className="p-0.5 text-navy/60 hover:text-navy"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deletePackingItem(item.id)}
                                    className="p-1.5 text-navy/35 hover:text-red-600 rounded-lg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Quick Add inside Category Card */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleQuickAddInCategory(catKey);
                        }}
                        className="pt-2 border-t border-navy/10 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={quickAddCategory[catKey] || ''}
                          onChange={(e) =>
                            setQuickAddCategory((prev) => ({
                              ...prev,
                              [catKey]: e.target.value,
                            }))
                          }
                          placeholder={
                            lang === 'he' ? '+ הוספה מהירה לקטגוריה...' : '+ Quick add item...'
                          }
                          className="flex-1 h-9 px-3 rounded-xl bg-ivory/70 border border-navy/10 text-xs text-navy placeholder:text-navy/40 focus:outline-none focus:border-sand"
                        />
                        <Button type="submit" size="sm" variant="ghost" className="h-9 px-2.5">
                          <Plus className="w-4 h-4 text-sand" />
                        </Button>
                      </form>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* TAB 2: INTERACTIVE SHOPPING LISTS EXPERIENCE                          */
        /* ===================================================================== */
        <div className="space-y-5">
          {/* Shopping Lists Carousel + Quick List Ideas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {activeShoppingLists.map((list) => {
                  const isSelected = selectedListId === list.id;
                  const listCount = activeShoppingItems.filter(
                    (i) => i.list_id === list.id
                  ).length;
                  return (
                    <button
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                        isSelected
                          ? 'bg-navy text-white shadow-sm'
                          : 'bg-surface text-navy border border-navy/10 hover:border-sand'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-sand" />
                      <span>{list.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          isSelected ? 'bg-sand text-white' : 'bg-ivory text-navy/70'
                        }`}
                      >
                        {listCount}
                      </span>
                    </button>
                  );
                })}
                <Button size="sm" variant="outline" onClick={() => setNewListModal(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.lists.newShoppingList}</span>
                </Button>
              </div>
            </div>

            {/* Quick Shopping List Starter Presets when no lists exist yet */}
            {activeShoppingLists.length === 0 && (
              <Card className="p-5 space-y-3 bg-gradient-to-br from-surface to-ivory">
                <div className="text-xs font-bold text-navy">
                  {lang === 'he'
                    ? 'בחרו רשימת קניות מוכנה להתחלה מהירה או צרו רשימה משלכם:'
                    : 'Start with a popular shopping list or create your own:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {QUICK_SHOPPING_LIST_IDEAS.map((idea) => {
                    const Icon = idea.icon;
                    const label = lang === 'he' ? idea.nameHe : idea.nameEn;
                    return (
                      <button
                        key={label}
                        onClick={() => handleQuickCreateShoppingList(label)}
                        className="p-3.5 rounded-2xl bg-surface border border-navy/10 hover:border-sand flex items-center gap-3 text-start transition-all"
                      >
                        <div className="w-9 h-9 rounded-xl bg-sand/20 text-sand-dark flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-navy">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Active Shopping List Summary Banner */}
          {currentList && (
            <Card className="p-4 sm:p-5 bg-gradient-to-r from-navy to-navy-light text-white border-0 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-sand font-semibold">{t.lists.shoppingTab}</div>
                <h2 className="text-lg font-bold">{currentList.name}</h2>
                <p className="text-xs text-ivory/75 mt-0.5">
                  {purchasedItemsCount} / {currentListItems.length}{' '}
                  {lang === 'he' ? 'פריטים נקנו' : 'items purchased'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {totalEstimatedShoppingCost > 0 && (
                  <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-end">
                    <div className="text-[10px] text-ivory/70">
                      {t.lists.estimatedPrice}
                    </div>
                    <div className="text-sm font-bold text-sand">
                      {formatCurrency(
                        totalEstimatedShoppingCost,
                        activeTrip.currency,
                        lang
                      )}
                    </div>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="sand"
                  onClick={() => setShopItemModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.lists.addItem}</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-ivory/70 hover:text-red-300 hover:bg-white/10"
                  onClick={() => deleteShoppingList(currentList.id)}
                  title={t.common.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Fast One-Line Shopping Item Input */}
          <Card className="p-3">
            <form onSubmit={handleQuickAddShopItem} className="flex items-center gap-2">
              <input
                type="text"
                value={quickShopInput}
                onChange={(e) => setQuickShopInput(e.target.value)}
                placeholder={
                  lang === 'he'
                    ? 'הקלידו שם פריט לקנייה ולחצו Enter (למשל: מתאם, שמפו קטן לטיסה, שוקולדים)...'
                    : 'Type an item to buy and press Enter...'
                }
                className="flex-1 h-11 px-4 rounded-xl bg-ivory/70 border border-navy/10 text-sm text-navy placeholder:text-navy/45 focus:outline-none focus:border-sand"
              />
              <Button type="submit">
                <Plus className="w-4 h-4" />
                <span>{t.common.add}</span>
              </Button>
            </form>
          </Card>

          {/* Shopping Items List */}
          {currentListItems.length === 0 ? (
            <Card className="p-8 text-center text-xs text-navy/55">
              {lang === 'he'
                ? 'הרשימה ריקה כרגע – הוסיפו פריטים בשורה למעלה'
                : 'This shopping list is empty — add items above'}
            </Card>
          ) : (
            <div className="space-y-2">
              {currentListItems.map((item) => {
                const assignee = coupleMembers.find(
                  (cm) => cm.user_id === item.assigned_to
                )?.profile;

                return (
                  <Card
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-all ${
                      item.is_purchased ? 'bg-ivory/40 opacity-75' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateShoppingItem(item.id, {
                          is_purchased: !item.is_purchased,
                        })
                      }
                      className="flex items-center gap-3 text-start flex-1 min-w-0"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                          item.is_purchased
                            ? 'bg-sage-dark border-sage-dark text-white'
                            : 'border-navy/30 bg-ivory'
                        }`}
                      >
                        {item.is_purchased && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`font-bold text-sm truncate ${
                            item.is_purchased
                              ? 'line-through text-navy/45'
                              : 'text-navy'
                          }`}
                        >
                          {item.item_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {assignee && (
                            <Badge variant="sage">{assignee.full_name}</Badge>
                          )}
                          {item.estimated_price !== null && item.estimated_price > 0 && (
                            <span className="text-xs font-semibold text-sand-dark">
                              {formatCurrency(
                                item.estimated_price * item.quantity,
                                activeTrip.currency,
                                lang
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-ivory rounded-lg border border-navy/10 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateShoppingItem(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="p-0.5 text-navy/60 hover:text-navy"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-1.5 text-navy">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateShoppingItem(item.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="p-0.5 text-navy/60 hover:text-navy"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteShoppingItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detailed Add Packing Item Drawer */}
      <ModalDrawer
        open={addPackingModalOpen}
        onClose={() => setAddPackingModalOpen(false)}
        title={t.lists.addItem}
      >
        <form onSubmit={handleAddDetailedPackingItem} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'שם הפריט לאריזה' : 'Item to Pack'}
            required
            value={packItemName}
            onChange={(e) => setPackItemName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: מעיל גשם / מתאם חשמל' : 'e.g., Rain Jacket'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.category}
              value={packCategory}
              onChange={(e) => setPackCategory(e.target.value)}
            >
              {PACKING_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'he' ? c.labelHe : c.labelEn}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min="1"
              label={t.lists.quantity}
              value={packQuantity}
              onChange={(e) => setPackQuantity(e.target.value)}
            />
          </div>
          <Select
            label={t.tasks.assignedTo}
            value={packAssignee}
            onChange={(e) => setPackAssignee(e.target.value)}
          >
            <option value="">{t.common.both}</option>
            {coupleMembers.map((cm) => (
              <option key={cm.user_id} value={cm.user_id}>
                {cm.profile?.full_name}
              </option>
            ))}
          </Select>
          <Button type="submit" className="w-full">
            {t.common.save}
          </Button>
        </form>
      </ModalDrawer>

      {/* Detailed Add Shopping Item Drawer */}
      <ModalDrawer
        open={shopItemModalOpen}
        onClose={() => setShopItemModalOpen(false)}
        title={t.lists.addItem}
      >
        <form onSubmit={handleDetailedShopItemSubmit} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'שם הפריט לקנייה' : 'Shopping Item'}
            required
            value={shopItemName}
            onChange={(e) => setShopItemName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="1"
              label={t.lists.quantity}
              value={shopQuantity}
              onChange={(e) => setShopQuantity(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              label={`${t.lists.estimatedPrice} (${activeTrip.currency})`}
              value={shopPrice}
              onChange={(e) => setShopPrice(e.target.value)}
            />
          </div>
          <Select
            label={t.tasks.assignedTo}
            value={shopAssignee}
            onChange={(e) => setShopAssignee(e.target.value)}
          >
            <option value="">{t.common.both}</option>
            {coupleMembers.map((cm) => (
              <option key={cm.user_id} value={cm.user_id}>
                {cm.profile?.full_name}
              </option>
            ))}
          </Select>
          <Button type="submit" className="w-full">
            {t.common.save}
          </Button>
        </form>
      </ModalDrawer>

      {/* Save Packing Template Drawer */}
      <ModalDrawer
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={t.lists.saveAsTemplate}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!templateName.trim()) return;
            await saveCurrentPackingAsTemplate(templateName);
            setTemplateName('');
            setTemplateModalOpen(false);
            notify(lang === 'he' ? 'תבנית האריזה נשמרה!' : 'Packing template saved!', 'success');
          }}
          className="space-y-3.5"
        >
          <Input
            label={lang === 'he' ? 'שם תבנית האריזה' : 'Template Name'}
            required
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: חופשת חורף באירופה' : 'e.g., European City Break'}
          />
          <Button type="submit" className="w-full">
            {t.common.save}
          </Button>
        </form>
      </ModalDrawer>

      {/* New Shopping List Drawer */}
      <ModalDrawer
        open={newListModal}
        onClose={() => setNewListModal(false)}
        title={t.lists.newShoppingList}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newListName.trim()) return;
            await handleQuickCreateShoppingList(newListName);
            setNewListName('');
            setNewListModal(false);
          }}
          className="space-y-3.5"
        >
          <Input
            label={lang === 'he' ? 'שם הרשימה' : 'List Name'}
            required
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: דיוטי פרי / פארם' : 'e.g., Duty Free & Pharmacy'}
          />
          <Button type="submit" className="w-full">
            {t.common.create}
          </Button>
        </form>
      </ModalDrawer>
    </div>
  );
};
