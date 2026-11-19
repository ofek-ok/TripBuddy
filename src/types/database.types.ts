// ============================================================================
// TRAVEL COMPANION - Complete TypeScript Domain & Database Types
// Matches all 17 PostgreSQL tables in supabase/migrations/0001_initial_schema.sql
// ============================================================================

export type Language = 'he' | 'en';

export type TripStatus = 'Planning' | 'Upcoming' | 'Active' | 'Completed' | 'Archived';

export type EventCategory =
  | 'Flight'
  | 'Hotel'
  | 'Restaurant'
  | 'Attraction'
  | 'Transportation'
  | 'Shopping'
  | 'Activity'
  | 'Other';

export type EventStatus = 'Planned' | 'Booked' | 'Completed' | 'Cancelled';

export type BudgetCategoryType =
  | 'Flights'
  | 'Accommodation'
  | 'Transportation'
  | 'Food'
  | 'Attractions'
  | 'Shopping'
  | 'Insurance'
  | 'Other';

export type DocumentCategory =
  | 'Flight Tickets'
  | 'Hotel Reservations'
  | 'Insurance'
  | 'Car Rental'
  | 'Attractions'
  | 'Personal Documents'
  | 'Receipts'
  | 'Other';

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export type PlaceVisitStatus = 'Want to Visit' | 'Planned' | 'Visited';

export type PaymentMethod =
  | 'Credit Card'
  | 'Cash'
  | 'Bank Transfer'
  | 'Digital Wallet'
  | 'Other';

export type CurrencyCode = 'ILS' | 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF' | 'THB' | 'CAD' | 'AUD';

export interface Profile {
  user_id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  preferred_language: Language;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  name: string;
  invite_code: string;
  default_currency: CurrencyCode;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  role: 'owner' | 'partner';
  joined_at: string;
  profile?: Profile;
}

export interface TripDestinationStop {
  id: string;
  city: string;
  country: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface Trip {
  id: string;
  couple_id: string;
  name: string;
  destination: string;
  country: string;
  city: string | null;
  destinations?: TripDestinationStop[];
  timezone: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  description: string | null;
  currency: CurrencyCode;
  planned_budget: number;
  status: TripStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryEvent {
  id: string;
  day_id: string;
  trip_id: string;
  title: string;
  category: EventCategory;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
  currency: CurrencyCode | null;
  booking_url: string | null;
  notes: string | null;
  status: EventStatus;
  sort_order: number;
  source_place_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  trip_id: string;
  name: BudgetCategoryType;
  allocated_amount: number;
  created_at: string;
  updated_at: string;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_type: string;
  file_size: number;
  expiration_date: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  category_id: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  base_amount: number;
  exchange_rate: number;
  exchange_rate_date: string;
  paid_by: string | null;
  expense_date: string;
  payment_method: PaymentMethod;
  receipt_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripTask {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  trip_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  item_name: string;
  quantity: number;
  estimated_price: number | null;
  category: string | null;
  assigned_to: string | null;
  is_purchased: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackingTemplateItem {
  item_name: string;
  category: string;
  quantity: number;
}

export interface PackingTemplate {
  id: string;
  couple_id: string;
  name: string;
  items: PackingTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  item_name: string;
  category: string;
  quantity: number;
  assigned_to: string | null;
  is_packed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  estimated_cost: number | null;
  currency: CurrencyCode | null;
  rating: number | null;
  notes: string | null;
  visit_status: PlaceVisitStatus;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  location: string | null;
  rating: number | null;
  memory_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
