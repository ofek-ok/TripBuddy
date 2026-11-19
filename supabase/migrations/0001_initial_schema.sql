-- ============================================================================
-- TRAVEL COMPANION - Complete Database Schema, Functions, Triggers & RLS
-- Version: 1.0
-- Database: PostgreSQL (Supabase)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE public.trip_status AS ENUM ('Planning', 'Upcoming', 'Active', 'Completed', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.event_category AS ENUM ('Flight', 'Hotel', 'Restaurant', 'Attraction', 'Transportation', 'Shopping', 'Activity', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.budget_category_type AS ENUM ('Flights', 'Accommodation', 'Transportation', 'Food', 'Attractions', 'Shopping', 'Insurance', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.document_category AS ENUM ('Flight Tickets', 'Hotel Reservations', 'Insurance', 'Car Rental', 'Attractions', 'Personal Documents', 'Receipts', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('To Do', 'In Progress', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('Low', 'Medium', 'High');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.place_visit_status AS ENUM ('Want to Visit', 'Planned', 'Visited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. UTILITY FUNCTIONS FOR TIMESTAMPS & INVITE CODES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- ============================================================================
-- 3. CORE TABLES (17 TABLES)
-- ============================================================================

-- 3.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'he' CHECK (preferred_language IN ('he', 'en')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 couples
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE DEFAULT public.generate_invite_code(),
    default_currency CHAR(3) NOT NULL DEFAULT 'ILS',
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 couple_members
CREATE TABLE IF NOT EXISTS public.couple_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('owner', 'partner')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (couple_id, user_id)
);

-- 3.4 trips
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
    timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cover_image TEXT,
    description TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    planned_budget NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (planned_budget >= 0),
    status public.trip_status NOT NULL DEFAULT 'Planning',
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trips_dates_check CHECK (end_date >= start_date)
);

-- 3.5 trip_members
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trip_id, user_id)
);

-- 3.6 itinerary_days
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number > 0),
    date DATE NOT NULL,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trip_id, day_number),
    UNIQUE (trip_id, date)
);

-- 3.7 places (Declared before itinerary_events to allow optional FK reference)
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Attraction',
    address TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    image_url TEXT,
    estimated_cost NUMERIC(12, 2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    currency CHAR(3),
    rating NUMERIC(2, 1) CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 5.0)),
    notes TEXT,
    visit_status public.place_visit_status NOT NULL DEFAULT 'Want to Visit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 itinerary_events
CREATE TABLE IF NOT EXISTS public.itinerary_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category public.event_category NOT NULL DEFAULT 'Activity',
    start_time TIME,
    end_time TIME,
    address TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    estimated_cost NUMERIC(12, 2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    currency CHAR(3),
    booking_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Booked', 'Completed', 'Cancelled')),
    sort_order INT NOT NULL DEFAULT 0,
    source_place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 budget_categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name public.budget_category_type NOT NULL,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trip_id, name)
);

-- 3.10 documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category public.document_category NOT NULL DEFAULT 'Other',
    file_path TEXT NOT NULL UNIQUE,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
    expiration_date DATE,
    description TEXT,
    uploaded_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.11 expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    base_amount NUMERIC(12, 2) NOT NULL CHECK (base_amount > 0),
    exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0),
    exchange_rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Credit Card' CHECK (payment_method IN ('Credit Card', 'Cash', 'Bank Transfer', 'Digital Wallet', 'Other')),
    receipt_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.12 tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    due_date DATE,
    priority public.task_priority NOT NULL DEFAULT 'Medium',
    status public.task_status NOT NULL DEFAULT 'To Do',
    category TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.13 shopping_lists
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.14 shopping_items
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    estimated_price NUMERIC(12, 2) CHECK (estimated_price IS NULL OR estimated_price >= 0),
    category TEXT,
    assigned_to UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    is_purchased BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.15 packing_templates
CREATE TABLE IF NOT EXISTS public.packing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.16 packing_items
CREATE TABLE IF NOT EXISTS public.packing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Clothing',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    assigned_to UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    is_packed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.17 memories
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_path TEXT,
    location TEXT,
    rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_couple_members_user ON public.couple_members(user_id);
CREATE INDEX IF NOT EXISTS idx_couple_members_couple ON public.couple_members(couple_id);
CREATE INDEX IF NOT EXISTS idx_trips_couple_status ON public.trips(couple_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_user ON public.trip_members(trip_id, user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_date ON public.itinerary_days(trip_id, date);
CREATE INDEX IF NOT EXISTS idx_itinerary_events_day_sort ON public.itinerary_events(day_id, sort_order, start_time);
CREATE INDEX IF NOT EXISTS idx_itinerary_events_trip ON public.itinerary_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_trip ON public.budget_categories(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_date ON public.expenses(trip_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_trip_category ON public.documents(trip_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_trip_status_due ON public.tasks(trip_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_trip ON public.shopping_lists(trip_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON public.shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_trip ON public.packing_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_places_trip_status ON public.places(trip_id, visit_status);
CREATE INDEX IF NOT EXISTS idx_memories_trip ON public.memories(trip_id, created_at DESC);

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles', 'couples', 'trips', 'itinerary_days', 'itinerary_events',
        'budget_categories', 'documents', 'expenses', 'tasks', 'shopping_lists',
        'shopping_items', 'packing_templates', 'packing_items', 'places', 'memories'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 6. BUSINESS LOGIC TRIGGERS & RPC FUNCTIONS
-- ============================================================================

-- 6.1 Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, preferred_language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Traveler'),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'he')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6.2 Auto-initialize trip_members, budget_categories, and itinerary_days on new trip
CREATE OR REPLACE FUNCTION public.handle_new_trip_initialization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cat public.budget_category_type;
    curr_date DATE;
    day_idx INT := 1;
BEGIN
    -- Add all couple members to trip_members
    INSERT INTO public.trip_members (trip_id, user_id, role)
    SELECT NEW.id, cm.user_id, CASE WHEN cm.user_id = NEW.created_by THEN 'owner' ELSE 'editor' END
    FROM public.couple_members cm
    WHERE cm.couple_id = NEW.couple_id
    ON CONFLICT (trip_id, user_id) DO NOTHING;

    -- Initialize the 8 standard budget categories
    FOREACH cat IN ARRAY ARRAY[
        'Flights', 'Accommodation', 'Transportation', 'Food',
        'Attractions', 'Shopping', 'Insurance', 'Other'
    ]::public.budget_category_type[] LOOP
        INSERT INTO public.budget_categories (trip_id, name, allocated_amount)
        VALUES (NEW.id, cat, 0)
        ON CONFLICT (trip_id, name) DO NOTHING;
    END LOOP;

    -- Generate itinerary days for date range (capped at 60 days safety check)
    curr_date := NEW.start_date;
    WHILE curr_date <= NEW.end_date AND day_idx <= 60 LOOP
        INSERT INTO public.itinerary_days (trip_id, day_number, date, location)
        VALUES (NEW.id, day_idx, curr_date, NEW.destination)
        ON CONFLICT (trip_id, day_number) DO NOTHING;

        curr_date := curr_date + INTERVAL '1 day';
        day_idx := day_idx + 1;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_initialize_new_trip ON public.trips;
CREATE TRIGGER trg_initialize_new_trip
    AFTER INSERT ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip_initialization();

-- 6.3 RPC: Create a new Couple Workspace and add current user as owner
CREATE OR REPLACE FUNCTION public.create_couple_workspace(workspace_name TEXT, base_currency CHAR(3) DEFAULT 'ILS')
RETURNS public.couples
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_couple public.couples;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.couples (name, default_currency, created_by)
    VALUES (workspace_name, base_currency, auth.uid())
    RETURNING * INTO new_couple;

    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (new_couple.id, auth.uid(), 'owner');

    RETURN new_couple;
END;
$$;

-- 6.4 RPC: Join an existing Couple Workspace by invite_code
CREATE OR REPLACE FUNCTION public.join_couple_by_invite_code(invite_code_input TEXT)
RETURNS public.couples
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_couple public.couples;
    member_count INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO target_couple
    FROM public.couples
    WHERE upper(trim(invite_code)) = upper(trim(invite_code_input));

    IF target_couple.id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    SELECT count(*) INTO member_count
    FROM public.couple_members
    WHERE couple_id = target_couple.id;

    -- Add user to couple_members
    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (target_couple.id, auth.uid(), 'partner')
    ON CONFLICT (couple_id, user_id) DO NOTHING;

    -- Also add user to all existing trips of this couple
    INSERT INTO public.trip_members (trip_id, user_id, role)
    SELECT t.id, auth.uid(), 'editor'
    FROM public.trips t
    WHERE t.couple_id = target_couple.id
    ON CONFLICT (trip_id, user_id) DO NOTHING;

    RETURN target_couple;
END;
$$;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS & POLICIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_couple_member(target_couple_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.couple_members cm
        WHERE cm.couple_id = target_couple_id
          AND cm.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_trip(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.trips t
        JOIN public.couple_members cm ON cm.couple_id = t.couple_id
        WHERE t.id = target_trip_id
          AND cm.user_id = auth.uid()
    );
$$;

-- Enable RLS on all 17 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- 7.1 profiles policies
CREATE POLICY "Users can view own and partner profiles"
    ON public.profiles FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.couple_members cm1
            JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
            WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
        )
    );

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7.2 couples policies
CREATE POLICY "Couple members can view their couple workspace"
    ON public.couples FOR SELECT
    USING (public.is_couple_member(id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create couple workspace"
    ON public.couples FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Couple members can update their couple workspace"
    ON public.couples FOR UPDATE
    USING (public.is_couple_member(id))
    WITH CHECK (public.is_couple_member(id));

-- 7.3 couple_members policies
CREATE POLICY "Couple members can view members of their couple"
    ON public.couple_members FOR SELECT
    USING (public.is_couple_member(couple_id) OR user_id = auth.uid());

CREATE POLICY "Users can join couple"
    ON public.couple_members FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_couple_member(couple_id));

CREATE POLICY "Users can leave couple"
    ON public.couple_members FOR DELETE
    USING (user_id = auth.uid() OR public.is_couple_member(couple_id));

-- 7.4 Couple-scoped tables (trips, packing_templates)
CREATE POLICY "Couple access for trips"
    ON public.trips FOR ALL
    USING (public.is_couple_member(couple_id))
    WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Couple access for packing_templates"
    ON public.packing_templates FOR ALL
    USING (public.is_couple_member(couple_id))
    WITH CHECK (public.is_couple_member(couple_id));

-- 7.5 Trip-scoped tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'trip_members', 'itinerary_days', 'itinerary_events', 'budget_categories',
        'documents', 'expenses', 'tasks', 'shopping_lists', 'packing_items',
        'places', 'memories'
    ] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Couple trip access on %I" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "Couple trip access on %I" ON public.%I FOR ALL USING (public.can_access_trip(trip_id)) WITH CHECK (public.can_access_trip(trip_id));',
            tbl, tbl
        );
    END LOOP;
END $$;

-- 7.6 shopping_items policy (linked via shopping_lists.trip_id)
CREATE POLICY "Couple access for shopping_items"
    ON public.shopping_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            WHERE sl.id = shopping_items.list_id
              AND public.can_access_trip(sl.trip_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            WHERE sl.id = shopping_items.list_id
              AND public.can_access_trip(sl.trip_id)
        )
    );

-- ============================================================================
-- 8. PRIVATE STORAGE BUCKETS & STORAGE RLS POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents-vault',
    'documents-vault',
    false,
    20971520, -- 20MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-memories',
    'trip-memories',
    false,
    20971520, -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: First folder segment must be couple_id that the user belongs to
CREATE POLICY "Couple members can read own private files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id IN ('documents-vault', 'trip-memories')
        AND public.is_couple_member((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "Couple members can upload own private files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('documents-vault', 'trip-memories')
        AND public.is_couple_member((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "Couple members can delete own private files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('documents-vault', 'trip-memories')
        AND public.is_couple_member((storage.foldername(name))[1]::uuid)
    );
