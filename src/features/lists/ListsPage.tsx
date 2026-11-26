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
  PackingItem,
  PackingTemplate,
  PackingTemplateItem,
  ShoppingItem,
} from '@/types/database.types';
import {
  ArrowDown,
  ArrowUp,
  Backpack,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  Edit3,
  Gift,
  GripVertical,
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
  { id: 'Backpack', labelHe: 'תיק גב', labelEn: 'Backpack', icon: Backpack, color: 'bg-navy text-white' },
  { id: 'Trolley', labelHe: 'טרולי', labelEn: 'Trolley', icon: Luggage, color: 'bg-sand text-white' },
  { id: 'Toiletry Bag', labelHe: 'תיק רחצה', labelEn: 'Toiletry Bag', icon: Sparkles, color: 'bg-sage text-navy' },
  { id: 'Suitcase', labelHe: 'מזוודה גדולה', labelEn: 'Main Suitcase', icon: Shirt, color: 'bg-navy/15 text-navy' },
];

const SMART_PACKING_PRESETS: SmartPreset[] = [
  {
    id: 'essentials',
    titleHe: 'חובה לטיסה ומסמכים',
    titleEn: 'Flight & Documents',
    descHe: 'נכנס לתיק גב: דרכונים, כרטיסים, ארנק וביטוח',
    descEn: 'Goes in Backpack: passports, tickets, wallet',
    icon: Plane,
    items: [
      { item_name_he: 'דרכונים בתוקף', item_name_en: 'Valid Passports', category: 'Backpack', quantity: 2 },
      { item_name_he: 'כרטיסי עלייה למטוס (Boarding Pass)', item_name_en: 'Boarding Passes', category: 'Backpack', quantity: 2 },
      { item_name_he: 'פוליסת ביטוח נסיעות', item_name_en: 'Travel Insurance Policy', category: 'Backpack', quantity: 1 },
      { item_name_he: 'כרטיסי אשראי ומזומן במטבע מקומי', item_name_en: 'Credit Cards & Local Cash', category: 'Backpack', quantity: 2 },
      { item_name_he: 'רישיון נהיגה בינלאומי + רגיל', item_name_en: 'Driver Licenses', category: 'Backpack', quantity: 1 },
    ],
  },
  {
    id: 'electronics',
    titleHe: 'אלקטרוניקה וטעינה',
    titleEn: 'Tech & Chargers',
    descHe: 'נכנס לתיק גב ולטרולי: מטענים, Power Bank ומתאם',
    descEn: 'Backpack & Trolley: chargers, power bank, adapter',
    icon: Laptop,
    items: [
      { item_name_he: 'מטענים לטלפונים', item_name_en: 'Phone Chargers', category: 'Backpack', quantity: 2 },
      { item_name_he: 'סוללת גיבוי ניידת (Power Bank)', item_name_en: 'Power Bank', category: 'Backpack', quantity: 1 },
      { item_name_he: 'אוזניות לטיסה', item_name_en: 'Headphones / Earbuds', category: 'Backpack', quantity: 2 },
      { item_name_he: 'מתאם חשמל אוניברסלי', item_name_en: 'Universal Power Adapter', category: 'Trolley', quantity: 2 },
    ],
  },
  {
    id: 'toiletries',
    titleHe: 'תיק רחצה ובריאות',
    titleEn: 'Toiletries & First Aid',
    descHe: 'נכנס לתיק רחצה: היגיינה אישית, תרופות ופלסטרים',
    descEn: 'Toiletry Bag: personal care, meds & first aid',
    icon: HeartPulse,
    items: [
      { item_name_he: 'מברשות ומשחת שיניים', item_name_en: 'Toothbrushes & Toothpaste', category: 'Toiletry Bag', quantity: 2 },
      { item_name_he: 'דאודורנט ובושם', item_name_en: 'Deodorant & Perfume', category: 'Toiletry Bag', quantity: 2 },
      { item_name_he: 'משככי כאבים ופלסטרים', item_name_en: 'Painkillers & Band-aids', category: 'Toiletry Bag', quantity: 1 },
      { item_name_he: 'תרופות קבועות / ויטמינים', item_name_en: 'Personal Medications', category: 'Toiletry Bag', quantity: 1 },
      { item_name_he: 'שפתון לחות וקרם ידיים', item_name_en: 'Lip Balm & Hand Cream', category: 'Toiletry Bag', quantity: 1 },
    ],
  },
  {
    id: 'clothing',
    titleHe: 'מלתחה בסיסית לטיול',
    titleEn: 'Core Wardrobe',
    descHe: 'נכנס למזוודה ולטרולי: מעיל, בגדים ונעלי הליכה',
    descEn: 'Suitcase & Trolley: coat, outfits & walking shoes',
    icon: Shirt,
    items: [
      { item_name_he: 'סט בגדים להחלפה ליום הראשון', item_name_en: 'First-Day Change of Clothes', category: 'Trolley', quantity: 2 },
      { item_name_he: 'נעלי הליכה נוחות', item_name_en: 'Comfortable Walking Shoes', category: 'Suitcase', quantity: 2 },
      { item_name_he: 'מעיל / ז׳קט מחמם', item_name_en: 'Jacket / Coat', category: 'Suitcase', quantity: 2 },
      { item_name_he: 'חולצות להחלפה', item_name_en: 'Shirts & Tops', category: 'Suitcase', quantity: 6 },
      { item_name_he: 'מכנסיים / ג׳ינסים', item_name_en: 'Pants & Jeans', category: 'Suitcase', quantity: 4 },
      { item_name_he: 'גרביים והלבשה תחתונה', item_name_en: 'Socks & Underwear', category: 'Suitcase', quantity: 7 },
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
    reorderShoppingItems,
    createPackingItem,
    updatePackingItem,
    deletePackingItem,
    reorderPackingItems,
    saveCurrentPackingAsTemplate,
    createPackingTemplate,
    applyPackingTemplateItems,
    deletePackingTemplate,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [tab, setTab] = useState<'packing' | 'shopping'>('packing');

  // Custom user-defined luggage / bags per trip (NO forced pre-selected bags!)
  const customBagsStorageKey = activeTrip ? `fy_custom_bags_${activeTrip.id}` : '';
  const [customBags, setCustomBags] = useState<string[]>([]);
  const [newBagModalOpen, setNewBagModalOpen] = useState(false);
  const [newBagName, setNewBagName] = useState('');

  useEffect(() => {
    if (!customBagsStorageKey) {
      setCustomBags([]);
      return;
    }
    try {
      const saved = JSON.parse(window.localStorage.getItem(customBagsStorageKey) || '[]');
      setCustomBags(Array.isArray(saved) ? saved : []);
    } catch {
      setCustomBags([]);
    }
  }, [customBagsStorageKey]);

  const persistCustomBags = (nextBags: string[]) => {
    setCustomBags(nextBags);
    if (customBagsStorageKey) {
      window.localStorage.setItem(customBagsStorageKey, JSON.stringify(nextBags));
    }
  };

  const handleAddCustomBag = (bagName: string) => {
    const clean = bagName.trim();
    if (!clean) return;
    if (!customBags.some((b) => b.toLowerCase() === clean.toLowerCase())) {
      persistCustomBags([...customBags, clean]);
    }
    setPackCategory(clean);
  };

  const handleRemoveEmptyBag = (bagName: string) => {
    persistCustomBags(customBags.filter((b) => b.toLowerCase() !== bagName.toLowerCase()));
  };

  // Packing Filters & Modals
  const [packStatusFilter, setPackStatusFilter] = useState<'ALL' | 'UNPACKED' | 'PACKED'>('ALL');
  const [packOwnerFilter, setPackOwnerFilter] = useState<string>('ALL');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [quickAddCategory, setQuickAddCategory] = useState<Record<string, string>>({});

  const [addPackingModalOpen, setAddPackingModalOpen] = useState(false);
  const [editingPackingItem, setEditingPackingItem] = useState<PackingItem | null>(null);
  const [packItemName, setPackItemName] = useState('');
  const [packCategory, setPackCategory] = useState('');
  const [packQuantity, setPackQuantity] = useState('1');
  const [packAssignee, setPackAssignee] = useState('');
  const [draggingPackId, setDraggingPackId] = useState<string | null>(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Create custom permanent packing template from scratch
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderItems, setBuilderItems] = useState<PackingTemplateItem[]>([]);
  const [builderNewItemName, setBuilderNewItemName] = useState('');
  const [builderNewItemBag, setBuilderNewItemBag] = useState('טרולי');
  const [builderNewItemQty, setBuilderNewItemQty] = useState('1');

  // Selective Template Picker (import whole template or just part of it!)
  const [pickerTemplate, setPickerTemplate] = useState<PackingTemplate | null>(null);
  const [selectedTemplateIndices, setSelectedTemplateIndices] = useState<Set<number>>(new Set());
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const openTemplatePicker = (tpl: PackingTemplate) => {
    setPickerTemplate(tpl);
    setSelectedTemplateIndices(new Set(tpl.items.map((_, idx) => idx)));
  };

  const toggleTemplateIndex = (idx: number) => {
    setSelectedTemplateIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Shopping State
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListModal, setNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [shopItemModalOpen, setShopItemModalOpen] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<ShoppingItem | null>(null);
  const [shopItemName, setShopItemName] = useState('');
  const [shopQuantity, setShopQuantity] = useState('1');
  const [shopPrice, setShopPrice] = useState('');
  const [shopAssignee, setShopAssignee] = useState('');
  const [quickShopInput, setQuickShopInput] = useState('');
  const [draggingShopId, setDraggingShopId] = useState<string | null>(null);

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

  const openCreatePackingModal = (defaultBag?: string) => {
    setEditingPackingItem(null);
    setPackItemName('');
    setPackCategory(defaultBag || allAvailableBags[0] || (lang === 'he' ? 'מזוודה' : 'Suitcase'));
    setPackQuantity('1');
    setPackAssignee('');
    setAddPackingModalOpen(true);
  };

  const openEditPackingModal = (item: PackingItem) => {
    setEditingPackingItem(item);
    setPackItemName(item.item_name);
    setPackCategory(item.category);
    setPackQuantity(String(item.quantity));
    setPackAssignee(item.assigned_to || '');
    setAddPackingModalOpen(true);
  };

  const handleAddDetailedPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packItemName.trim()) return;
    const chosenBag = packCategory.trim() || (lang === 'he' ? 'כבודה כללית' : 'General Bag');
    try {
      handleAddCustomBag(chosenBag);
      if (editingPackingItem) {
        await updatePackingItem(editingPackingItem.id, {
          item_name: packItemName.trim(),
          category: chosenBag,
          quantity: Math.max(1, Number(packQuantity) || 1),
          assigned_to: packAssignee || null,
        });
        notify(lang === 'he' ? 'הפריט עודכן בהצלחה' : 'Packing item updated', 'success');
      } else {
        await createPackingItem({
          trip_id: activeTrip.id,
          item_name: packItemName.trim(),
          category: chosenBag,
          quantity: Math.max(1, Number(packQuantity) || 1),
          assigned_to: packAssignee || null,
          is_packed: false,
          pack_stage: 0,
          notes: null,
        });
        notify(lang === 'he' ? 'הפריט נוסף לכבודה' : 'Item added to luggage', 'success');
      }
      setEditingPackingItem(null);
      setPackItemName('');
      setPackQuantity('1');
      setAddPackingModalOpen(false);
    } catch (err) {
      handleError(err);
    }
  };

  // 3-state packing cycle: 0 (unchecked) -> 1 (✓ check only) -> 2 (line-through + colored row) -> 0
  const getPackStage = (item: PackingItem): 0 | 1 | 2 => {
    if (item.pack_stage === 0 || item.pack_stage === 1 || item.pack_stage === 2) {
      return item.pack_stage;
    }
    return item.is_packed ? 2 : 0;
  };

  const cyclePackingStage = async (item: PackingItem) => {
    const current = getPackStage(item);
    const next = ((current + 1) % 3) as 0 | 1 | 2;
    await updatePackingItem(item.id, {
      pack_stage: next,
      is_packed: next === 2,
    });
  };

  // Reorder helper for Packing items within a bag
  const movePackingItem = async (bagItems: PackingItem[], fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= bagItems.length || fromIndex === toIndex) return;
    const reordered = [...bagItems];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await reorderPackingItems(reordered.map((i) => i.id));
  };

  // Reorder helper for Shopping items within the active list
  const moveShoppingItem = async (listItems: ShoppingItem[], fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= listItems.length || fromIndex === toIndex) return;
    const reordered = [...listItems];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await reorderShoppingItems(reordered.map((i) => i.id));
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

  const openCreateShopModal = () => {
    setEditingShopItem(null);
    setShopItemName('');
    setShopQuantity('1');
    setShopPrice('');
    setShopAssignee('');
    setShopItemModalOpen(true);
  };

  const openEditShopModal = (item: ShoppingItem) => {
    setEditingShopItem(item);
    setShopItemName(item.item_name);
    setShopQuantity(String(item.quantity));
    setShopPrice(item.estimated_price !== null ? String(item.estimated_price) : '');
    setShopAssignee(item.assigned_to || '');
    setShopItemModalOpen(true);
  };

  const handleDetailedShopItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopItemName.trim()) return;
    try {
      if (editingShopItem) {
        await updateShoppingItem(editingShopItem.id, {
          item_name: shopItemName.trim(),
          quantity: Math.max(1, Number(shopQuantity) || 1),
          estimated_price: shopPrice ? Number(shopPrice) : null,
          assigned_to: shopAssignee || null,
        });
        notify(lang === 'he' ? 'פריט הקנייה עודכן' : 'Shopping item updated', 'success');
      } else {
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
      }
      setEditingShopItem(null);
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
      icon: Luggage,
      color: 'bg-sand/20 text-navy',
    };
  };

  // All bags = user's custom bags + any bags that already have items (NO forced defaults!)
  const allAvailableBags = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const addUnique = (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };
    customBags.forEach(addUnique);
    activePackingItems.forEach((item) => addUnique(item.category));
    return list;
  }, [customBags, activePackingItems]);

  // Group packing items ONLY by the user's bags & existing item bags
  const groupedPackingCategories = useMemo(() => {
    const map = new Map<string, typeof filteredPackingItems>();
    if (packStatusFilter === 'ALL' && packOwnerFilter === 'ALL') {
      allAvailableBags.forEach((bag) => map.set(bag, []));
    }
    filteredPackingItems.forEach((item) => {
      const existingKey =
        Array.from(map.keys()).find((k) => k.toLowerCase() === item.category.toLowerCase()) ||
        item.category;
      map.set(existingKey, [...(map.get(existingKey) || []), item]);
    });
    return Array.from(map.entries());
  }, [allAvailableBags, filteredPackingItems, packStatusFilter, packOwnerFilter]);

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

      {/* Sticky Action Bar for Packing & Shopping */}
      <div className="sticky top-[62px] z-20 -mx-1 px-2.5 py-2 rounded-2xl bg-surface/92 backdrop-blur-md border border-sand/25 shadow-soft flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-navy/75 truncate ps-1">
          {tab === 'packing'
            ? `${packedCount}/${totalPackCount} ${lang === 'he' ? 'נארזו' : 'packed'}`
            : currentList
              ? `${currentList.name} (${purchasedItemsCount}/${currentListItems.length})`
              : t.lists.shoppingTab}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {tab === 'packing' ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setNewBagModalOpen(true)}>
                <Luggage className="w-3.5 h-3.5 text-sand" />
                <span>{lang === 'he' ? 'הוספת כבודה' : 'Add Bag'}</span>
              </Button>
              <Button size="sm" onClick={() => openCreatePackingModal()}>
                <Plus className="w-4 h-4" />
                <span>{t.lists.addItem}</span>
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setNewListModal(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>{t.lists.newShoppingList}</span>
              </Button>
              <Button size="sm" onClick={openCreateShopModal}>
                <Plus className="w-4 h-4" />
                <span>{t.lists.addItem}</span>
              </Button>
            </>
          )}
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
                  onClick={() => openCreatePackingModal()}
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

            {/* Permanent Reusable Packing Templates (Create + Selective Import Full or Partial) */}
            <Card className="p-4 space-y-3 bg-gradient-to-br from-surface to-ivory/60 border-sand/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <BookmarkPlus className="w-4 h-4 text-sand" />
                    <span>
                      {lang === 'he'
                        ? 'טמפלטים קבועים לאריזה (ייבוא מלא או חלקי)'
                        : 'Reusable Packing Templates (Full or Partial Import)'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-navy/60 mt-0.5">
                    {lang === 'he'
                      ? 'הכינו רשימה קבועה פעם אחת, ובכל טיול בחרו אם לייבא את כולה או רק חלק מהפריטים'
                      : 'Create a reusable list once, then import all or selected items into any trip'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBuilderName('');
                      setBuilderItems([]);
                      setBuilderNewItemName('');
                      setBuilderNewItemBag(allAvailableBags[0] || (lang === 'he' ? 'טרולי' : 'Trolley'));
                      setBuilderNewItemQty('1');
                      setBuilderModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 text-sand" />
                    <span>{lang === 'he' ? 'יצירת טמפלט קבוע' : 'New Template'}</span>
                  </Button>
                  {totalPackCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setTemplateModalOpen(true)}>
                      <BookmarkPlus className="w-3.5 h-3.5 text-navy/70" />
                      <span className="hidden sm:inline">
                        {lang === 'he' ? 'שמירת הרשימה הנוכחית' : 'Save Current List'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              {packingTemplates.length === 0 ? (
                <div className="text-xs text-navy/50 bg-ivory/70 rounded-xl px-3.5 py-2.5">
                  {lang === 'he'
                    ? 'עדיין לא יצרתם טמפלט קבוע — לחצו על "יצירת טמפלט קבוע" כדי להכין רשימת אריזה לשימוש חוזר.'
                    : 'No saved templates yet — click "New Template" to create a reusable packing list.'}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {packingTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="inline-flex items-center gap-1.5 ps-3 pe-2 py-2 rounded-xl bg-surface border border-sand/35 shadow-xs text-xs font-semibold text-navy"
                    >
                      <button
                        type="button"
                        onClick={() => openTemplatePicker(tpl)}
                        className="flex items-center gap-1.5 hover:text-sand transition-colors"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-sand" />
                        <span>
                          {tpl.name} ({tpl.items.length})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              lang === 'he'
                                ? `למחוק את הטמפלט "${tpl.name}"?`
                                : `Delete template "${tpl.name}"?`
                            )
                          ) {
                            deletePackingTemplate(tpl.id);
                          }
                        }}
                        className="p-1 text-navy/35 hover:text-red-600 rounded-md ms-1"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
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

          {/* Legend for 3-stage check + Custom Luggage Cards Grid */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-navy/65 font-medium">
              {lang === 'he'
                ? 'טיפ: לחיצה 1 = ✓ מסומן • לחיצה 2 = קו חוצה + צביעת שורה (נארז) • לחיצה 3 = איפוס'
                : 'Tip: 1st tap = ✓ checked • 2nd tap = crossed & highlighted (packed) • 3rd tap = reset'}
            </span>
            <Button size="sm" variant="outline" onClick={() => setNewBagModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 text-sand" />
              <span>{lang === 'he' ? 'הוספת כבודה / תיק' : 'Add Luggage / Bag'}</span>
            </Button>
          </div>

          {groupedPackingCategories.length === 0 ? (
            <Card className="p-7 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sand/15 text-sand mx-auto flex items-center justify-center">
                <Luggage className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-navy">
                  {lang === 'he' ? 'הוסיפו את הכבודה שלכם לטיול' : 'Add your own bags & luggage'}
                </h3>
                <p className="text-xs text-navy/60 max-w-md mx-auto">
                  {lang === 'he'
                    ? 'אתם בוחרים בעצמכם אילו תיקים ומזוודות לקחת (למשל: טרולי, תיק גב, תיק רחצה, מזוודה גדולה או שם אישי)'
                    : 'Create your own custom bags and suitcases to organize every item'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => setNewBagModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'he' ? 'הוספת כבודה חדשה' : 'Add New Bag'}</span>
                </Button>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-navy/50 me-1">
                  {lang === 'he' ? 'הוספה מהירה:' : 'Quick add:'}
                </span>
                {PACKING_CATEGORIES.map((c) => {
                  const lbl = lang === 'he' ? c.labelHe : c.labelEn;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddCustomBag(lbl)}
                      className="px-3 py-1 rounded-full bg-ivory hover:bg-sand/20 border border-navy/10 text-xs font-semibold text-navy transition-colors"
                    >
                      + {lbl}
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedPackingCategories.map(([catKey, items]) => {
              const meta = getCategoryMeta(catKey);
              const Icon = meta.icon;
              const catPacked = items.filter((i) => getPackStage(i) === 2).length;
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

                    <div className="flex items-center gap-1.5">
                      {items.length === 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEmptyBag(catKey);
                          }}
                          className="p-1 text-navy/40 hover:text-red-600 rounded-lg"
                          title={lang === 'he' ? 'הסרת כבודה ריקה' : 'Remove empty bag'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                            ? 'אין עדיין פריטים בכבודה זו'
                            : 'No items in this bag yet'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {items.map((item, idx) => {
                            const assignee = coupleMembers.find(
                              (cm) => cm.user_id === item.assigned_to
                            )?.profile;
                            const stage = getPackStage(item);

                            return (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={() => setDraggingPackId(item.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (!draggingPackId || draggingPackId === item.id) return;
                                  const fromIdx = items.findIndex((x) => x.id === draggingPackId);
                                  if (fromIdx !== -1) movePackingItem(items, fromIdx, idx);
                                  setDraggingPackId(null);
                                }}
                                onDragEnd={() => setDraggingPackId(null)}
                                className={`py-2 px-2 rounded-xl flex items-center justify-between gap-1.5 transition-all border ${
                                  stage === 2
                                    ? 'bg-sand/15 border-sand/35'
                                    : stage === 1
                                      ? 'bg-ivory/50 border-navy/10'
                                      : 'border-transparent hover:bg-ivory/40'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span
                                    className="cursor-grab text-navy/25 hover:text-navy/60 shrink-0"
                                    title={lang === 'he' ? 'גרירה לשינוי סדר' : 'Drag to reorder'}
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => cyclePackingStage(item)}
                                    className="flex items-center gap-2.5 text-start min-w-0 flex-1"
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                                        stage === 2
                                          ? 'bg-sand border-sand text-white shadow-xs'
                                          : stage === 1
                                            ? 'bg-sage/30 border-sage-dark text-sage-dark'
                                            : 'border-navy/30 bg-surface'
                                      }`}
                                    >
                                      {stage >= 1 && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0">
                                      <div
                                        className={`text-sm font-semibold truncate transition-all ${
                                          stage === 2
                                            ? 'line-through text-navy/50'
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
                                </div>

                                {/* Reorder + Edit + Quantity stepper + Delete */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => movePackingItem(items, idx, idx - 1)}
                                    className="p-1 text-navy/40 hover:text-navy disabled:opacity-20 rounded-md"
                                    title={lang === 'he' ? 'הזזה למעלה' : 'Move up'}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === items.length - 1}
                                    onClick={() => movePackingItem(items, idx, idx + 1)}
                                    className="p-1 text-navy/40 hover:text-navy disabled:opacity-20 rounded-md"
                                    title={lang === 'he' ? 'הזזה למטה' : 'Move down'}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <div className="flex items-center bg-surface rounded-lg border border-navy/10 px-1 py-0.5 ms-0.5">
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
                                    <span className="text-xs font-bold px-1 text-navy">
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
                                    onClick={() => openEditPackingModal(item)}
                                    className="p-1.5 text-navy/45 hover:text-navy rounded-lg"
                                    title={t.common.edit}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deletePackingItem(item.id)}
                                    className="p-1.5 text-navy/35 hover:text-red-600 rounded-lg"
                                    title={t.common.delete}
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
                            lang === 'he' ? '+ הוספה מהירה לכבודה...' : '+ Quick add item...'
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
          )}
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
                  onClick={openCreateShopModal}
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
              {currentListItems.map((item, idx) => {
                const assignee = coupleMembers.find(
                  (cm) => cm.user_id === item.assigned_to
                )?.profile;

                return (
                  <Card
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggingShopId(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!draggingShopId || draggingShopId === item.id) return;
                      const fromIdx = currentListItems.findIndex((x) => x.id === draggingShopId);
                      if (fromIdx !== -1) moveShoppingItem(currentListItems, fromIdx, idx);
                      setDraggingShopId(null);
                    }}
                    onDragEnd={() => setDraggingShopId(null)}
                    className={`p-3.5 flex items-center justify-between gap-2 transition-all ${
                      item.is_purchased ? 'bg-sand/10 border-sand/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="cursor-grab text-navy/25 hover:text-navy/60 shrink-0"
                        title={lang === 'he' ? 'גרירה לשינוי סדר' : 'Drag to reorder'}
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
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
                              ? 'bg-sand border-sand text-white'
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
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveShoppingItem(currentListItems, idx, idx - 1)}
                        className="p-1 text-navy/40 hover:text-navy disabled:opacity-20 rounded-md"
                        title={lang === 'he' ? 'הזזה למעלה' : 'Move up'}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentListItems.length - 1}
                        onClick={() => moveShoppingItem(currentListItems, idx, idx + 1)}
                        className="p-1 text-navy/40 hover:text-navy disabled:opacity-20 rounded-md"
                        title={lang === 'he' ? 'הזזה למטה' : 'Move down'}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
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
                      <button
                        type="button"
                        onClick={() => openEditShopModal(item)}
                        className="p-1.5 text-navy/50 hover:text-navy rounded-lg"
                        title={t.common.edit}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-red-600/75 hover:text-red-600 rounded-lg"
                        onClick={() => deleteShoppingItem(item.id)}
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Custom Luggage / Bag Drawer */}
      <ModalDrawer
        open={newBagModalOpen}
        onClose={() => setNewBagModalOpen(false)}
        title={lang === 'he' ? 'הוספת כבודה / תיק חדש' : 'Add Luggage / Bag'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newBagName.trim()) return;
            handleAddCustomBag(newBagName);
            setNewBagName('');
            setNewBagModalOpen(false);
            notify(lang === 'he' ? 'הכבודה נוספה לרשימה!' : 'Luggage added!', 'success');
          }}
          className="space-y-3.5"
        >
          <Input
            label={lang === 'he' ? 'שם הכבודה / התיק' : 'Bag / Luggage Name'}
            required
            value={newBagName}
            onChange={(e) => setNewBagName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: טרולי, תיק גב, מזוודה של אופק 🧳' : 'e.g., Carry-on Trolley 🧳'}
          />
          <Button type="submit" className="w-full">
            {t.common.add}
          </Button>
        </form>
      </ModalDrawer>

      {/* Detailed Add / Edit Packing Item Drawer */}
      <ModalDrawer
        open={addPackingModalOpen}
        onClose={() => {
          setAddPackingModalOpen(false);
          setEditingPackingItem(null);
        }}
        title={editingPackingItem ? t.common.edit : t.lists.addItem}
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
            {allAvailableBags.length > 0 ? (
              <Select
                label={lang === 'he' ? 'באיזו כבודה?' : 'Which Bag?'}
                value={packCategory}
                onChange={(e) => setPackCategory(e.target.value)}
              >
                {allAvailableBags.map((bag) => {
                  const meta = getCategoryMeta(bag);
                  return (
                    <option key={bag} value={bag}>
                      {lang === 'he' ? meta.labelHe : meta.labelEn}
                    </option>
                  );
                })}
              </Select>
            ) : (
              <Input
                label={lang === 'he' ? 'שם הכבודה / התיק' : 'Bag Name'}
                required
                value={packCategory}
                onChange={(e) => setPackCategory(e.target.value)}
                placeholder={lang === 'he' ? 'למשל: טרולי / תיק גב' : 'e.g., Trolley'}
              />
            )}
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

      {/* Detailed Add / Edit Shopping Item Drawer */}
      <ModalDrawer
        open={shopItemModalOpen}
        onClose={() => {
          setShopItemModalOpen(false);
          setEditingShopItem(null);
        }}
        title={editingShopItem ? t.common.edit : t.lists.addItem}
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

      {/* Create Permanent Packing Template Builder Drawer */}
      <ModalDrawer
        open={builderModalOpen}
        onClose={() => setBuilderModalOpen(false)}
        title={lang === 'he' ? 'יצירת טמפלט אריזה קבוע' : 'Create Reusable Packing Template'}
      >
        <div className="space-y-4">
          <Input
            label={lang === 'he' ? 'שם הטמפלט' : 'Template Name'}
            required
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: ציוד חובה לכל טיסה ✈️' : 'e.g., Flight Essentials ✈️'}
          />

          {/* Add items into the template */}
          <div className="p-3 rounded-2xl bg-ivory/70 border border-navy/10 space-y-2.5">
            <div className="text-xs font-bold text-navy">
              {lang === 'he' ? 'הוספת פריטים לטמפלט:' : 'Add items to template:'}
            </div>
            <Input
              value={builderNewItemName}
              onChange={(e) => setBuilderNewItemName(e.target.value)}
              placeholder={lang === 'he' ? 'שם הפריט (למשל: מטען, דרכון, מברשת שיניים)' : 'Item name'}
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input
                  value={builderNewItemBag}
                  onChange={(e) => setBuilderNewItemBag(e.target.value)}
                  placeholder={lang === 'he' ? 'כבודה (למשל: תיק גב / טרולי)' : 'Bag name'}
                />
              </div>
              <Input
                type="number"
                min="1"
                value={builderNewItemQty}
                onChange={(e) => setBuilderNewItemQty(e.target.value)}
                placeholder="1"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!builderNewItemName.trim()) return;
                setBuilderItems((prev) => [
                  ...prev,
                  {
                    item_name: builderNewItemName.trim(),
                    category: builderNewItemBag.trim() || (lang === 'he' ? 'טרולי' : 'Trolley'),
                    quantity: Math.max(1, Number(builderNewItemQty) || 1),
                  },
                ]);
                setBuilderNewItemName('');
                setBuilderNewItemQty('1');
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'he' ? 'הוספת פריט לרשימת הטמפלט' : 'Add Item to Template'}</span>
            </Button>
          </div>

          {/* Current draft items in template */}
          {builderItems.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              <div className="text-xs font-bold text-navy/70">
                {lang === 'he' ? `פריטים בטמפלט (${builderItems.length}):` : `Template items (${builderItems.length}):`}
              </div>
              {builderItems.map((it, idx) => (
                <div
                  key={`${it.item_name}-${idx}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface border border-navy/10 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-navy">{it.item_name}</span>
                    <span className="text-navy/55 ms-2">
                      ({it.category} • ×{it.quantity})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBuilderItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={!builderName.trim() || builderItems.length === 0}
            onClick={async () => {
              try {
                await createPackingTemplate(builderName.trim(), builderItems);
                setBuilderModalOpen(false);
                notify(
                  lang === 'he' ? 'טמפלט האריזה הקבוע נשמר!' : 'Permanent packing template saved!',
                  'success'
                );
              } catch (err) {
                handleError(err);
              }
            }}
          >
            {lang === 'he' ? `שמירת טמפלט (${builderItems.length} פריטים)` : `Save Template (${builderItems.length} items)`}
          </Button>
        </div>
      </ModalDrawer>

      {/* Selective Template Import Drawer (Use Full Template or Part of It!) */}
      <ModalDrawer
        open={Boolean(pickerTemplate)}
        onClose={() => setPickerTemplate(null)}
        title={
          pickerTemplate
            ? lang === 'he'
              ? `ייבוא מהטמפלט: ${pickerTemplate.name}`
              : `Import from: ${pickerTemplate.name}`
            : ''
        }
      >
        {pickerTemplate && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-navy/70 font-medium">
                {lang === 'he'
                  ? 'בחרו אילו פריטים לייבא לטיול הנוכחי (הכול או רק חלק):'
                  : 'Select which items to import into this trip (all or partial):'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTemplateIndices(new Set(pickerTemplate.items.map((_, i) => i)))
                  }
                  className="font-bold text-sand hover:underline"
                >
                  {lang === 'he' ? 'בחר הכול' : 'Select All'}
                </button>
                <span className="text-navy/30">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateIndices(new Set())}
                  className="font-semibold text-navy/60 hover:underline"
                >
                  {lang === 'he' ? 'נקה' : 'Clear'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pe-1">
              {pickerTemplate.items.map((item, idx) => {
                const isChecked = selectedTemplateIndices.has(idx);
                const meta = getCategoryMeta(item.category);
                return (
                  <button
                    key={`${item.item_name}-${idx}`}
                    type="button"
                    onClick={() => toggleTemplateIndex(idx)}
                    className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-start transition-all ${
                      isChecked
                        ? 'bg-sand/10 border-sand/40'
                        : 'bg-surface border-navy/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                          isChecked
                            ? 'bg-sand border-sand text-white'
                            : 'border-navy/30 bg-ivory'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-semibold text-navy truncate">
                        {item.item_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="ivory">
                        {lang === 'he' ? meta.labelHe : meta.labelEn}
                      </Badge>
                      <span className="text-xs font-bold text-navy/60">×{item.quantity}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={selectedTemplateIndices.size === 0 || isApplyingTemplate}
              onClick={async () => {
                try {
                  setIsApplyingTemplate(true);
                  const chosen = pickerTemplate.items.filter((_, idx) =>
                    selectedTemplateIndices.has(idx)
                  );
                  chosen.forEach((it) => handleAddCustomBag(it.category));
                  const added = await applyPackingTemplateItems(chosen);
                  setPickerTemplate(null);
                  notify(
                    lang === 'he'
                      ? `יובאו ${added} פריטים מהטמפלט "${pickerTemplate.name}"!`
                      : `Imported ${added} items from "${pickerTemplate.name}"!`,
                    'success'
                  );
                } catch (err) {
                  handleError(err);
                } finally {
                  setIsApplyingTemplate(false);
                }
              }}
            >
              <DownloadCloud className="w-4 h-4" />
              <span>
                {isApplyingTemplate
                  ? t.common.loading
                  : lang === 'he'
                    ? `ייבוא ${selectedTemplateIndices.size} פריטים נבחרים לטיול`
                    : `Import ${selectedTemplateIndices.size} Selected Items`}
              </span>
            </Button>
          </div>
        )}
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
