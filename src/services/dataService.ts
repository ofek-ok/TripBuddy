// ============================================================================
// TRIPBUDDY - Relational Store Types & Upload Validation Helpers
// ============================================================================

import {
  BudgetCategory,
  BudgetCategoryType,
  Couple,
  CoupleMember,
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
