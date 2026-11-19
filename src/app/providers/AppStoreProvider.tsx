import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BudgetCategory,
  Couple,
  CoupleMember,
  CurrencyCode,
  Expense,
  ItineraryDay,
  ItineraryEvent,
  Memory,
  PackingItem,
  PackingTemplate,
  Place,
  Profile,
  ShoppingItem,
  ShoppingList,
  Trip,
  TripDocument,
  TripTask,
} from '@/types/database.types';
import { EMPTY_RELATIONAL_STORE, RelationalStoreState, validateUploadFile } from '@/services/dataService';
import { apiRequest, getAuthToken, setAuthToken } from '@/lib/api/client';
import { useToast } from '@/lib/errors/errorHandler';

const ACTIVE_TRIP_KEY = 'tb_active_trip_id';

interface AppStoreContextValue {
  isLoading: boolean;
  isCloudConnected: boolean;
  currentUser: Profile | null;
  currentCouple: Couple | null;
  coupleMembers: (CoupleMember & { profile?: Profile })[];
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTripId: (tripId: string) => void;

  // Auth & Workspace actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCoupleWorkspace: (name: string, defaultCurrency: CurrencyCode) => Promise<void>;
  updateCoupleWorkspace: (name: string) => Promise<void>;
  joinCoupleWorkspace: (inviteCode: string) => Promise<void>;
  addPartnerProfile: (partnerName: string, partnerEmail?: string) => Promise<void>;

  // Trips CRUD
  createTrip: (input: Omit<Trip, 'id' | 'couple_id' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<Trip>;
  updateTrip: (tripId: string, patch: Partial<Trip>) => Promise<void>;
  uploadTripCover: (tripId: string, file: File) => Promise<void>;
  duplicateTrip: (tripId: string) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;

  // Trip-scoped data selectors
  activeDays: ItineraryDay[];
  activeEvents: ItineraryEvent[];
  activeBudgetCategories: BudgetCategory[];
  activeExpenses: Expense[];
  activeDocuments: TripDocument[];
  activeTasks: TripTask[];
  activeShoppingLists: ShoppingList[];
  activeShoppingItems: ShoppingItem[];
  packingTemplates: PackingTemplate[];
  activePackingItems: PackingItem[];
  activePlaces: Place[];
  activeMemories: Memory[];

  // Itinerary actions
  updateDay: (dayId: string, patch: Partial<ItineraryDay>) => Promise<void>;
  addDay: () => Promise<void>;
  createEvent: (input: Omit<ItineraryEvent, 'id' | 'created_at' | 'updated_at' | 'sort_order'>) => Promise<void>;
  updateEvent: (eventId: string, patch: Partial<ItineraryEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  reorderEvent: (eventId: string, direction: 'up' | 'down') => Promise<void>;
  moveEventToDay: (eventId: string, targetDayId: string) => Promise<void>;

  // Budget & Expenses actions
  updateCategoryAllocation: (categoryId: string, allocatedAmount: number) => Promise<void>;
  createExpense: (input: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;

  // Documents Vault actions
  uploadDocument: (
    file: File,
    meta: {
      name: string;
      category: TripDocument['category'];
      expiration_date: string | null;
      description: string | null;
    }
  ) => Promise<TripDocument>;
  getDocumentSignedUrl: (doc: TripDocument) => Promise<string>;
  deleteDocument: (doc: TripDocument) => Promise<void>;

  // Tasks actions
  createTask: (input: Omit<TripTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<TripTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Shopping & Packing Lists actions
  createShoppingList: (name: string) => Promise<ShoppingList>;
  deleteShoppingList: (listId: string) => Promise<void>;
  createShoppingItem: (input: Omit<ShoppingItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateShoppingItem: (itemId: string, patch: Partial<ShoppingItem>) => Promise<void>;
  deleteShoppingItem: (itemId: string) => Promise<void>;

  createPackingItem: (input: Omit<PackingItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePackingItem: (itemId: string, patch: Partial<PackingItem>) => Promise<void>;
  deletePackingItem: (itemId: string) => Promise<void>;
  saveCurrentPackingAsTemplate: (templateName: string) => Promise<void>;
  applyPackingTemplate: (templateId: string) => Promise<void>;
  deletePackingTemplate: (templateId: string) => Promise<void>;

  // Places & Memories actions
  createPlace: (input: Omit<Place, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePlace: (placeId: string, patch: Partial<Place>) => Promise<void>;
  deletePlace: (placeId: string) => Promise<void>;
  convertPlaceToItineraryEvent: (placeId: string, dayId: string, startTime?: string) => Promise<void>;

  createMemory: (
    input: Omit<Memory, 'id' | 'image_path' | 'created_by' | 'created_at' | 'updated_at'>,
    imageFile?: File | null
  ) => Promise<void>;
  getMemoryImageUrl: (imagePath: string) => Promise<string>;
  deleteMemory: (memory: Memory) => Promise<void>;
}

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

function parseJwtUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64)) as { userId?: string };
    return decoded.userId || null;
  } catch {
    return null;
  }
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [db, setDb] = useState<RelationalStoreState>(EMPTY_RELATIONAL_STORE);
  const [authTokenState, setAuthTokenState] = useState<string | null>(() => getAuthToken());
  const [activeTripId, setActiveTripIdState] = useState<string | null>(() =>
    window.localStorage.getItem(ACTIVE_TRIP_KEY)
  );

  const sessionUserId = useMemo(() => parseJwtUserId(authTokenState), [authTokenState]);

  const fetchWorkspace = useCallback(async (silent = false) => {
    const token = getAuthToken();
    if (!token) {
      setDb(EMPTY_RELATIONAL_STORE);
      setIsLoading(false);
      return;
    }
    try {
      if (!silent) setIsLoading(true);
      const snapshot = await apiRequest<RelationalStoreState>('/api/workspace');
      setDb({ ...EMPTY_RELATIONAL_STORE, ...snapshot });
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setAuthToken(null);
        setAuthTokenState(null);
        setDb(EMPTY_RELATIONAL_STORE);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace, authTokenState]);

  // Real-time couple sync: SSE in persistent server + smart visibility/interval sync for Vercel Serverless
  const currentCoupleId = db.couples[0]?.id || null;
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !currentCoupleId) return;

    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    let es: EventSource | null = null;
    if (isLocalHost) {
      es = new EventSource(`/api/realtime?token=${encodeURIComponent(token)}`);
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'workspace_updated') {
            fetchWorkspace(true);
          }
        } catch {
          // ignore heartbeat
        }
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkspace(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Lightweight background sync every 15s while tab is active (ensures live couple sync on Vercel Serverless)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWorkspace(true);
      }
    }, 15000);

    return () => {
      es?.close();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [currentCoupleId, fetchWorkspace]);

  const currentUser = useMemo(
    () => db.profiles.find((p) => p.user_id === sessionUserId) || null,
    [db.profiles, sessionUserId]
  );

  const currentCouple = useMemo(() => db.couples[0] || null, [db.couples]);

  const coupleMembers = useMemo(() => {
    if (!currentCouple) return [];
    return db.couple_members
      .filter((cm) => cm.couple_id === currentCouple.id)
      .map((cm) => ({
        ...cm,
        profile: db.profiles.find((p) => p.user_id === cm.user_id),
      }));
  }, [currentCouple, db.couple_members, db.profiles]);

  const trips = useMemo(
    () => [...db.trips].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [db.trips]
  );

  const activeTrip = useMemo(() => {
    if (trips.length === 0) return null;
    if (activeTripId) {
      const found = trips.find((t) => t.id === activeTripId);
      if (found) return found;
    }
    return (
      trips.find((t) => t.status === 'Active') ||
      trips.find((t) => t.status === 'Upcoming') ||
      trips.find((t) => t.status === 'Planning') ||
      trips[0]
    );
  }, [trips, activeTripId]);

  const setActiveTripId = useCallback((tripId: string) => {
    setActiveTripIdState(tripId);
    window.localStorage.setItem(ACTIVE_TRIP_KEY, tripId);
  }, []);

  // ============================================================================
  // AUTH & WORKSPACE ACTIONS (Backend API)
  // ============================================================================
  const signUp = async (email: string, password: string, fullName: string) => {
    const res = await apiRequest<{ token: string; profile: Profile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    setAuthToken(res.token);
    setAuthTokenState(res.token);
    await fetchWorkspace(true);
  };

  const signIn = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; profile: Profile }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setAuthTokenState(res.token);
    await fetchWorkspace(true);
  };

  const signOut = async () => {
    setAuthToken(null);
    setAuthTokenState(null);
    setDb(EMPTY_RELATIONAL_STORE);
  };

  const createCoupleWorkspace = async (name: string, defaultCurrency: CurrencyCode) => {
    await apiRequest('/api/couples', {
      method: 'POST',
      body: JSON.stringify({ name, default_currency: defaultCurrency }),
    });
    await fetchWorkspace(true);
  };

  const updateCoupleWorkspace = async (name: string) => {
    await apiRequest('/api/couples', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    await fetchWorkspace(true);
  };

  const joinCoupleWorkspace = async (inviteCode: string) => {
    await apiRequest('/api/couples/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
    await fetchWorkspace(true);
  };

  const addPartnerProfile = async (partnerName: string, partnerEmail?: string) => {
    await apiRequest('/api/couples/partner', {
      method: 'POST',
      body: JSON.stringify({ fullName: partnerName, email: partnerEmail }),
    });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // TRIPS CRUD
  // ============================================================================
  const createTrip = async (
    input: Omit<Trip, 'id' | 'couple_id' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<Trip> => {
    const created = await apiRequest<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await fetchWorkspace(true);
    setActiveTripId(created.id);
    return created;
  };

  const updateTrip = async (tripId: string, patch: Partial<Trip>) => {
    await apiRequest(`/api/trips/${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await fetchWorkspace(true);
  };

  const uploadTripCover = async (tripId: string, file: File) => {
    validateUploadFile(file);
    const form = new FormData();
    form.append('image', file);
    await apiRequest(`/api/trips/${tripId}/cover`, {
      method: 'POST',
      body: form,
    });
    await fetchWorkspace(true);
  };

  const duplicateTrip = async (tripId: string): Promise<Trip> => {
    const source = trips.find((t) => t.id === tripId);
    if (!source) throw new Error('Source trip not found');
    const duplicated = await createTrip({
      name: `${source.name} (Copy)`,
      destination: source.destination,
      country: source.country,
      city: source.city,
      destinations: source.destinations,
      timezone: source.timezone,
      start_date: source.start_date,
      end_date: source.end_date,
      cover_image: source.cover_image,
      description: source.description,
      currency: source.currency,
      planned_budget: source.planned_budget,
      status: 'Planning',
    });
    notify('Trip duplicated successfully', 'success');
    return duplicated;
  };

  const deleteTrip = async (tripId: string) => {
    await apiRequest(`/api/trips/${tripId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // ACTIVE TRIP SELECTORS
  // ============================================================================
  const activeDays = useMemo(
    () =>
      activeTrip
        ? db.itinerary_days
            .filter((d) => d.trip_id === activeTrip.id)
            .sort((a, b) => a.day_number - b.day_number)
        : [],
    [activeTrip, db.itinerary_days]
  );

  const activeEvents = useMemo(
    () =>
      activeTrip
        ? db.itinerary_events
            .filter((e) => e.trip_id === activeTrip.id)
            .sort((a, b) => {
              if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
              return (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
            })
        : [],
    [activeTrip, db.itinerary_events]
  );

  const activeBudgetCategories = useMemo(
    () => (activeTrip ? db.budget_categories.filter((bc) => bc.trip_id === activeTrip.id) : []),
    [activeTrip, db.budget_categories]
  );

  const activeExpenses = useMemo(
    () =>
      activeTrip
        ? db.expenses
            .filter((ex) => ex.trip_id === activeTrip.id)
            .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
        : [],
    [activeTrip, db.expenses]
  );

  const activeDocuments = useMemo(
    () =>
      activeTrip
        ? db.documents
            .filter((doc) => doc.trip_id === activeTrip.id)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
        : [],
    [activeTrip, db.documents]
  );

  const activeTasks = useMemo(
    () =>
      activeTrip
        ? db.tasks
            .filter((tk) => tk.trip_id === activeTrip.id)
            .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
        : [],
    [activeTrip, db.tasks]
  );

  const activeShoppingLists = useMemo(
    () => (activeTrip ? db.shopping_lists.filter((sl) => sl.trip_id === activeTrip.id) : []),
    [activeTrip, db.shopping_lists]
  );

  const activeShoppingItems = useMemo(() => {
    const listIds = new Set(activeShoppingLists.map((l) => l.id));
    return db.shopping_items.filter((item) => listIds.has(item.list_id));
  }, [activeShoppingLists, db.shopping_items]);

  const packingTemplates = useMemo(() => db.packing_templates, [db.packing_templates]);

  const activePackingItems = useMemo(
    () => (activeTrip ? db.packing_items.filter((pi) => pi.trip_id === activeTrip.id) : []),
    [activeTrip, db.packing_items]
  );

  const activePlaces = useMemo(
    () => (activeTrip ? db.places.filter((pl) => pl.trip_id === activeTrip.id) : []),
    [activeTrip, db.places]
  );

  const activeMemories = useMemo(
    () =>
      activeTrip
        ? db.memories
            .filter((m) => m.trip_id === activeTrip.id)
            .sort((a, b) => b.memory_date.localeCompare(a.memory_date))
        : [],
    [activeTrip, db.memories]
  );

  // ============================================================================
  // ITINERARY ACTIONS
  // ============================================================================
  const updateDay = async (dayId: string, patch: Partial<ItineraryDay>) => {
    await apiRequest(`/api/days/${dayId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await fetchWorkspace(true);
  };

  const addDay = async () => {
    if (!activeTrip) return;
    const nextNumber = activeDays.length + 1;
    const lastDateStr = activeDays[activeDays.length - 1]?.date || activeTrip.end_date;
    const [y, m, d] = lastDateStr.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

    await apiRequest(`/api/trips/${activeTrip.id}/days`, {
      method: 'POST',
      body: JSON.stringify({
        day_number: nextNumber,
        date: dateStr,
        location: activeTrip.destination,
      }),
    });
    await fetchWorkspace(true);
  };

  const createEvent = async (
    input: Omit<ItineraryEvent, 'id' | 'created_at' | 'updated_at' | 'sort_order'>
  ) => {
    const dayEvents = activeEvents.filter((e) => e.day_id === input.day_id);
    const nextOrder = dayEvents.length > 0 ? Math.max(...dayEvents.map((e) => e.sort_order)) + 1 : 1;
    await apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify({ ...input, sort_order: nextOrder }),
    });
    await fetchWorkspace(true);
  };

  const updateEvent = async (eventId: string, patch: Partial<ItineraryEvent>) => {
    await apiRequest(`/api/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await fetchWorkspace(true);
  };

  const deleteEvent = async (eventId: string) => {
    await apiRequest(`/api/events/${eventId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  const reorderEvent = async (eventId: string, direction: 'up' | 'down') => {
    const target = activeEvents.find((e) => e.id === eventId);
    if (!target) return;
    const siblings = activeEvents.filter((e) => e.day_id === target.day_id);
    const idx = siblings.findIndex((e) => e.id === eventId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const neighbor = siblings[swapIdx];
    await Promise.all([
      apiRequest(`/api/events/${target.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sort_order: neighbor.sort_order }),
      }),
      apiRequest(`/api/events/${neighbor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sort_order: target.sort_order }),
      }),
    ]);
    await fetchWorkspace(true);
  };

  const moveEventToDay = async (eventId: string, targetDayId: string) => {
    const targetDayEvents = activeEvents.filter((e) => e.day_id === targetDayId);
    const nextSort =
      targetDayEvents.length > 0 ? Math.max(...targetDayEvents.map((e) => e.sort_order)) + 1 : 1;
    await updateEvent(eventId, { day_id: targetDayId, sort_order: nextSort });
  };

  // ============================================================================
  // BUDGET & EXPENSES ACTIONS
  // ============================================================================
  const updateCategoryAllocation = async (categoryId: string, allocatedAmount: number) => {
    await apiRequest(`/api/budget-categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ allocated_amount: allocatedAmount }),
    });
    await fetchWorkspace(true);
  };

  const createExpense = async (input: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    await apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify(input) });
    await fetchWorkspace(true);
  };

  const updateExpense = async (expenseId: string, patch: Partial<Expense>) => {
    await apiRequest(`/api/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await fetchWorkspace(true);
  };

  const deleteExpense = async (expenseId: string) => {
    await apiRequest(`/api/expenses/${expenseId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // DOCUMENTS VAULT (Private Cloud Blobs + Signed URLs)
  // ============================================================================
  const uploadDocument = async (
    file: File,
    meta: {
      name: string;
      category: TripDocument['category'];
      expiration_date: string | null;
      description: string | null;
    }
  ): Promise<TripDocument> => {
    if (!activeTrip) throw new Error('No active trip selected');
    validateUploadFile(file);
    const form = new FormData();
    form.append('file', file);
    form.append('trip_id', activeTrip.id);
    form.append('name', meta.name);
    form.append('category', meta.category);
    if (meta.expiration_date) form.append('expiration_date', meta.expiration_date);
    if (meta.description) form.append('description', meta.description);

    const doc = await apiRequest<TripDocument>('/api/documents', {
      method: 'POST',
      body: form,
    });
    await fetchWorkspace(true);
    return doc;
  };

  const getDocumentSignedUrl = async (doc: TripDocument): Promise<string> => {
    const res = await apiRequest<{ signedUrl: string }>('/api/files/sign', {
      method: 'POST',
      body: JSON.stringify({ filePath: doc.file_path }),
    });
    return res.signedUrl;
  };

  const deleteDocument = async (doc: TripDocument) => {
    await apiRequest(`/api/documents/${doc.id}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // TASKS
  // ============================================================================
  const createTask = async (input: Omit<TripTask, 'id' | 'created_at' | 'updated_at'>) => {
    await apiRequest('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
    await fetchWorkspace(true);
  };

  const updateTask = async (taskId: string, patch: Partial<TripTask>) => {
    await apiRequest(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await fetchWorkspace(true);
  };

  const deleteTask = async (taskId: string) => {
    await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // SHOPPING & PACKING LISTS
  // ============================================================================
  const createShoppingList = async (name: string): Promise<ShoppingList> => {
    if (!activeTrip) throw new Error('No active trip');
    const created = await apiRequest<ShoppingList>('/api/shopping-lists', {
      method: 'POST',
      body: JSON.stringify({ trip_id: activeTrip.id, name }),
    });
    await fetchWorkspace(true);
    return created;
  };

  const deleteShoppingList = async (listId: string) => {
    await apiRequest(`/api/shopping-lists/${listId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  const createShoppingItem = async (
    input: Omit<ShoppingItem, 'id' | 'created_at' | 'updated_at'>
  ) => {
    await apiRequest('/api/shopping-items', { method: 'POST', body: JSON.stringify(input) });
    await fetchWorkspace(true);
  };

  const updateShoppingItem = async (itemId: string, patch: Partial<ShoppingItem>) => {
    await apiRequest(`/api/shopping-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await fetchWorkspace(true);
  };

  const deleteShoppingItem = async (itemId: string) => {
    await apiRequest(`/api/shopping-items/${itemId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  const createPackingItem = async (
    input: Omit<PackingItem, 'id' | 'created_at' | 'updated_at'>
  ) => {
    await apiRequest('/api/packing-items', { method: 'POST', body: JSON.stringify(input) });
    await fetchWorkspace(true);
  };

  const updatePackingItem = async (itemId: string, patch: Partial<PackingItem>) => {
    await apiRequest(`/api/packing-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await fetchWorkspace(true);
  };

  const deletePackingItem = async (itemId: string) => {
    await apiRequest(`/api/packing-items/${itemId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  const saveCurrentPackingAsTemplate = async (templateName: string) => {
    const items = activePackingItems.map((i) => ({
      item_name: i.item_name,
      category: i.category,
      quantity: i.quantity,
    }));
    await apiRequest('/api/packing-templates', {
      method: 'POST',
      body: JSON.stringify({ name: templateName, items }),
    });
    await fetchWorkspace(true);
  };

  const applyPackingTemplate = async (templateId: string) => {
    if (!activeTrip) return;
    const tpl = packingTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    for (const item of tpl.items) {
      await apiRequest('/api/packing-items', {
        method: 'POST',
        body: JSON.stringify({
          trip_id: activeTrip.id,
          item_name: item.item_name,
          category: item.category,
          quantity: item.quantity,
          assigned_to: null,
          is_packed: false,
          notes: null,
        }),
      });
    }
    await fetchWorkspace(true);
  };

  const deletePackingTemplate = async (templateId: string) => {
    await apiRequest(`/api/packing-templates/${templateId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  // ============================================================================
  // PLACES & MEMORIES
  // ============================================================================
  const createPlace = async (input: Omit<Place, 'id' | 'created_at' | 'updated_at'>) => {
    await apiRequest('/api/places', { method: 'POST', body: JSON.stringify(input) });
    await fetchWorkspace(true);
  };

  const updatePlace = async (placeId: string, patch: Partial<Place>) => {
    await apiRequest(`/api/places/${placeId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await fetchWorkspace(true);
  };

  const deletePlace = async (placeId: string) => {
    await apiRequest(`/api/places/${placeId}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  const convertPlaceToItineraryEvent = async (
    placeId: string,
    dayId: string,
    startTime?: string
  ) => {
    if (!activeTrip) return;
    const place = activePlaces.find((p) => p.id === placeId);
    if (!place) return;
    const validCategories = [
      'Flight',
      'Hotel',
      'Restaurant',
      'Attraction',
      'Transportation',
      'Shopping',
      'Activity',
      'Other',
    ];
    const mappedCategory = (
      validCategories.includes(place.category) ? place.category : 'Attraction'
    ) as ItineraryEvent['category'];

    await createEvent({
      day_id: dayId,
      trip_id: activeTrip.id,
      title: place.name,
      category: mappedCategory,
      start_time: startTime || null,
      end_time: null,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      estimated_cost: place.estimated_cost,
      currency: place.currency || activeTrip.currency,
      booking_url: null,
      notes: place.notes,
      status: 'Planned',
      source_place_id: place.id,
    });
    await updatePlace(place.id, { visit_status: 'Planned' });
  };

  const createMemory = async (
    input: Omit<Memory, 'id' | 'image_path' | 'created_by' | 'created_at' | 'updated_at'>,
    imageFile?: File | null
  ) => {
    const form = new FormData();
    form.append('trip_id', input.trip_id);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.location) form.append('location', input.location);
    if (input.rating) form.append('rating', String(input.rating));
    if (input.memory_date) form.append('memory_date', input.memory_date);
    if (imageFile) {
      validateUploadFile(imageFile);
      form.append('image', imageFile);
    }
    await apiRequest('/api/memories', { method: 'POST', body: form });
    await fetchWorkspace(true);
  };

  const getMemoryImageUrl = async (imagePath: string): Promise<string> => {
    const res = await apiRequest<{ signedUrl: string }>('/api/files/sign', {
      method: 'POST',
      body: JSON.stringify({ filePath: imagePath }),
    });
    return res.signedUrl;
  };

  const deleteMemory = async (memory: Memory) => {
    await apiRequest(`/api/memories/${memory.id}`, { method: 'DELETE' });
    await fetchWorkspace(true);
  };

  return (
    <AppStoreContext.Provider
      value={{
        isLoading,
        isCloudConnected: true,
        currentUser,
        currentCouple,
        coupleMembers,
        trips,
        activeTrip,
        setActiveTripId,
        signIn,
        signUp,
        signOut,
        createCoupleWorkspace,
        updateCoupleWorkspace,
        joinCoupleWorkspace,
        addPartnerProfile,
        createTrip,
        updateTrip,
        uploadTripCover,
        duplicateTrip,
        deleteTrip,
        activeDays,
        activeEvents,
        activeBudgetCategories,
        activeExpenses,
        activeDocuments,
        activeTasks,
        activeShoppingLists,
        activeShoppingItems,
        packingTemplates,
        activePackingItems,
        activePlaces,
        activeMemories,
        updateDay,
        addDay,
        createEvent,
        updateEvent,
        deleteEvent,
        reorderEvent,
        moveEventToDay,
        updateCategoryAllocation,
        createExpense,
        updateExpense,
        deleteExpense,
        uploadDocument,
        getDocumentSignedUrl,
        deleteDocument,
        createTask,
        updateTask,
        deleteTask,
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
        createPlace,
        updatePlace,
        deletePlace,
        convertPlaceToItineraryEvent,
        createMemory,
        getMemoryImageUrl,
        deleteMemory,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
