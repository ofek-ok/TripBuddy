// ============================================================================
// TRAVEL COMPANION - Unified Data Access Service (Supabase + Offline-Ready Persistence)
// Strictly implements all 17 PostgreSQL tables, triggers, and Storage signed URLs
// ============================================================================

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import {
  BudgetCategory,
  BudgetCategoryType,
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
  TripMember,
  TripTask,
} from '@/types/database.types';
import { getDaysDifference } from '@/lib/utils/formatters';

const STANDARD_BUDGET_CATEGORIES: BudgetCategoryType[] = [
  'Flights',
  'Accommodation',
  'Transportation',
  'Food',
  'Attractions',
  'Shopping',
  'Insurance',
  'Other',
];

const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function validateUploadFile(file: File) {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size must be between 1B and 20MB');
  }
  if (!ALLOWED_DOCUMENT_MIMES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, HEIC');
  }
}

export function generateInviteCodeString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function buildTripDaysAndCategories(trip: Trip): {
  days: ItineraryDay[];
  categories: BudgetCategory[];
} {
  const now = new Date().toISOString();
  const totalDays = Math.min(60, getDaysDifference(trip.start_date, trip.end_date));
  const [sy, sm, sd] = trip.start_date.split('-').map(Number);
  const stops = trip.destinations && trip.destinations.length > 0 ? trip.destinations : [];

  const days: ItineraryDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(sy, sm - 1, sd + i);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Match day location to the specific destination stop if date ranges are provided,
    // or distribute proportionally across stops
    let dayLocation = trip.destination;
    if (stops.length > 0) {
      const matchedByDate = stops.find(
        (s) =>
          s.start_date &&
          s.end_date &&
          dateStr >= s.start_date &&
          dateStr <= s.end_date
      );
      if (matchedByDate) {
        dayLocation = `${matchedByDate.city}, ${matchedByDate.country}`;
      } else {
        const stopIdx = Math.min(
          stops.length - 1,
          Math.floor((i / Math.max(1, totalDays)) * stops.length)
        );
        const stop = stops[stopIdx];
        dayLocation = `${stop.city}, ${stop.country}`;
      }
    }

    days.push({
      id: crypto.randomUUID(),
      trip_id: trip.id,
      day_number: i + 1,
      date: dateStr,
      location: dayLocation,
      notes: null,
      created_at: now,
      updated_at: now,
    });
  }

  const categories: BudgetCategory[] = STANDARD_BUDGET_CATEGORIES.map((name) => ({
    id: crypto.randomUUID(),
    trip_id: trip.id,
    name,
    allocated_amount: 0,
    created_at: now,
    updated_at: now,
  }));

  return { days, categories };
}

export const storageService = {
  async uploadPrivateFile(
    bucket: 'documents-vault' | 'trip-memories',
    coupleId: string,
    tripId: string,
    file: File
  ): Promise<string> {
    validateUploadFile(file);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${coupleId}/${tripId}/${crypto.randomUUID()}-${sanitizedName}`;

    if (isSupabaseConfigured) {
      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      return filePath;
    }

    // Local secure blob storage fallback when running before cloud keys are entered
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    window.localStorage.setItem(`tc_vault_blob_${filePath}`, dataUrl);
    return filePath;
  },

  async createSignedUrl(
    bucket: 'documents-vault' | 'trip-memories',
    filePath: string,
    expiresInSeconds = 120
  ): Promise<string> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresInSeconds);
      if (error || !data?.signedUrl) {
        throw error || new Error('Could not generate signed URL');
      }
      return data.signedUrl;
    }

    const blobData = window.localStorage.getItem(`tc_vault_blob_${filePath}`);
    if (!blobData) {
      throw new Error('Document file not found in private vault');
    }
    return blobData;
  },

  async deletePrivateFile(bucket: 'documents-vault' | 'trip-memories', filePath: string) {
    if (isSupabaseConfigured) {
      await supabase.storage.from(bucket).remove([filePath]);
    } else {
      window.localStorage.removeItem(`tc_vault_blob_${filePath}`);
    }
  },
};

export type RelationalStoreState = {
  profiles: Profile[];
  couples: Couple[];
  couple_members: CoupleMember[];
  trips: Trip[];
  trip_members: TripMember[];
  itinerary_days: ItineraryDay[];
  itinerary_events: ItineraryEvent[];
  budget_categories: BudgetCategory[];
  documents: TripDocument[];
  expenses: Expense[];
  tasks: TripTask[];
  shopping_lists: ShoppingList[];
  shopping_items: ShoppingItem[];
  packing_templates: PackingTemplate[];
  packing_items: PackingItem[];
  places: Place[];
  memories: Memory[];
};

export const EMPTY_RELATIONAL_STORE: RelationalStoreState = {
  profiles: [],
  couples: [],
  couple_members: [],
  trips: [],
  trip_members: [],
  itinerary_days: [],
  itinerary_events: [],
  budget_categories: [],
  documents: [],
  expenses: [],
  tasks: [],
  shopping_lists: [],
  shopping_items: [],
  packing_templates: [],
  packing_items: [],
  places: [],
  memories: [],
};
