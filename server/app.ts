import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { pool, query } from './db';
import {
  AuthenticatedRequest,
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
  verifyToken,
} from './auth';
import { broadcastCoupleUpdate, subscribeCoupleClient } from './realtime';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const STANDARD_BUDGET_CATEGORIES = [
  'Flights',
  'Accommodation',
  'Transportation',
  'Food',
  'Attractions',
  'Shopping',
  'Insurance',
  'Other',
];

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function getUserCoupleId(userId: string): Promise<string | null> {
  const rows = await query<{ couple_id: string }>(
    'SELECT couple_id FROM couple_members WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return rows[0]?.couple_id || null;
}

async function assertTripAccess(userId: string, tripId: string): Promise<string> {
  const rows = await query<{ couple_id: string }>(
    `SELECT t.couple_id
     FROM trips t
     JOIN couple_members cm ON cm.couple_id = t.couple_id
     WHERE t.id = $1 AND cm.user_id = $2
     LIMIT 1`,
    [tripId, userId]
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Forbidden: You do not have access to this trip'), {
      statusCode: 403,
    });
  }
  return rows[0].couple_id;
}

function getDateRange(startStr: string, endStr: string): string[] {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const dates: string[] = [];
  let cursor = new Date(start);
  let count = 0;
  while (cursor <= end && count < 60) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
    count++;
  }
  return dates;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'neon-postgresql' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName, preferredLanguage } = req.body as {
      email: string;
      password: string;
      fullName: string;
      preferredLanguage?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password || password.length < 6 || !fullName?.trim()) {
      res.status(400).json({ error: 'Valid email, full name, and password (6+ chars) are required' });
      return;
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const [user] = await query<{ id: string }>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [cleanEmail, passwordHash]
    );

    const [profile] = await query(
      `INSERT INTO profiles (user_id, email, full_name, preferred_language)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, cleanEmail, fullName.trim(), preferredLanguage === 'en' ? 'en' : 'he']
    );

    const token = signToken({ userId: user.id });
    res.status(201).json({ token, profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const cleanEmail = (email || '').trim().toLowerCase();

    const [user] = await query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (!user || !verifyPassword(password || '', user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const [profile] = await query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
    const token = signToken({ userId: user.id });
    res.json({ token, profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// REALTIME SSE STREAM (Per Couple Workspace)
// ============================================================================
app.get('/api/realtime', requireAuth, async (req: AuthenticatedRequest, res) => {
  const coupleId = await getUserCoupleId(req.userId!);
  if (!coupleId) {
    res.status(400).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected', coupleId })}\n\n`);

  subscribeCoupleClient(coupleId, res);
});

// ============================================================================
// WORKSPACE SNAPSHOT (Strictly Scoped to Authenticated User's Couple)
// ============================================================================
app.get('/api/workspace', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const [currentProfile] = await query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (!currentProfile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      res.json({
        profiles: [currentProfile],
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
      });
      return;
    }

    const [
      couples,
      couple_members,
      profiles,
      trips,
      trip_members,
      itinerary_days,
      itinerary_events,
      budget_categories,
      documents,
      expenses,
      tasks,
      shopping_lists,
      shopping_items,
      packing_templates,
      packing_items,
      places,
      memories,
    ] = await Promise.all([
      query('SELECT * FROM couples WHERE id = $1', [coupleId]),
      query('SELECT * FROM couple_members WHERE couple_id = $1 ORDER BY joined_at ASC', [coupleId]),
      query(
        `SELECT p.* FROM profiles p
         JOIN couple_members cm ON cm.user_id = p.user_id
         WHERE cm.couple_id = $1`,
        [coupleId]
      ),
      query('SELECT * FROM trips WHERE couple_id = $1 ORDER BY start_date ASC', [coupleId]),
      query(
        `SELECT tm.* FROM trip_members tm
         JOIN trips t ON t.id = tm.trip_id
         WHERE t.couple_id = $1`,
        [coupleId]
      ),
      query(
        `SELECT d.* FROM itinerary_days d
         JOIN trips t ON t.id = d.trip_id
         WHERE t.couple_id = $1 ORDER BY d.day_number ASC`,
        [coupleId]
      ),
      query(
        `SELECT e.* FROM itinerary_events e
         JOIN trips t ON t.id = e.trip_id
         WHERE t.couple_id = $1 ORDER BY e.sort_order ASC, e.start_time ASC`,
        [coupleId]
      ),
      query(
        `SELECT bc.* FROM budget_categories bc
         JOIN trips t ON t.id = bc.trip_id
         WHERE t.couple_id = $1`,
        [coupleId]
      ),
      query(
        `SELECT doc.* FROM documents doc
         JOIN trips t ON t.id = doc.trip_id
         WHERE t.couple_id = $1 ORDER BY doc.created_at DESC`,
        [coupleId]
      ),
      query(
        `SELECT ex.* FROM expenses ex
         JOIN trips t ON t.id = ex.trip_id
         WHERE t.couple_id = $1 ORDER BY ex.expense_date DESC, ex.created_at DESC`,
        [coupleId]
      ),
      query(
        `SELECT tk.* FROM tasks tk
         JOIN trips t ON t.id = tk.trip_id
         WHERE t.couple_id = $1 ORDER BY tk.due_date ASC NULLS LAST`,
        [coupleId]
      ),
      query(
        `SELECT sl.* FROM shopping_lists sl
         JOIN trips t ON t.id = sl.trip_id
         WHERE t.couple_id = $1 ORDER BY sl.created_at ASC`,
        [coupleId]
      ),
      query(
        `SELECT si.* FROM shopping_items si
         JOIN shopping_lists sl ON sl.id = si.list_id
         JOIN trips t ON t.id = sl.trip_id
         WHERE t.couple_id = $1 ORDER BY si.created_at ASC`,
        [coupleId]
      ),
      query('SELECT * FROM packing_templates WHERE couple_id = $1 ORDER BY created_at DESC', [coupleId]),
      query(
        `SELECT pi.* FROM packing_items pi
         JOIN trips t ON t.id = pi.trip_id
         WHERE t.couple_id = $1 ORDER BY pi.created_at ASC`,
        [coupleId]
      ),
      query(
        `SELECT pl.* FROM places pl
         JOIN trips t ON t.id = pl.trip_id
         WHERE t.couple_id = $1 ORDER BY pl.created_at DESC`,
        [coupleId]
      ),
      query(
        `SELECT m.* FROM memories m
         JOIN trips t ON t.id = m.trip_id
         WHERE t.couple_id = $1 ORDER BY m.memory_date DESC, m.created_at DESC`,
        [coupleId]
      ),
    ]);

    res.json({
      profiles,
      couples,
      couple_members,
      trips,
      trip_members,
      itinerary_days,
      itinerary_events,
      budget_categories,
      documents,
      expenses,
      tasks,
      shopping_lists,
      shopping_items,
      packing_templates,
      packing_items,
      places,
      memories,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// COUPLE WORKSPACE ENDPOINTS
// ============================================================================
app.post('/api/couples', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { name, default_currency } = req.body as { name: string; default_currency?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const inviteCode = generateInviteCode();
    const [couple] = await query<{ id: string }>(
      `INSERT INTO couples (name, invite_code, default_currency, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), inviteCode, (default_currency || 'ILS').trim(), userId]
    );

    await query(
      `INSERT INTO couple_members (couple_id, user_id, role)
       VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
      [couple.id, userId]
    );

    res.status(201).json(couple);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/couples/join', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { inviteCode } = req.body as { inviteCode: string };
    const cleanCode = (inviteCode || '').trim().toUpperCase();

    const [couple] = await query<{ id: string }>(
      'SELECT * FROM couples WHERE UPPER(invite_code) = $1',
      [cleanCode]
    );
    if (!couple) {
      res.status(404).json({ error: 'Invalid invite code. Please check the code from your partner.' });
      return;
    }

    await query(
      `INSERT INTO couple_members (couple_id, user_id, role)
       VALUES ($1, $2, 'partner') ON CONFLICT (couple_id, user_id) DO NOTHING`,
      [couple.id, userId]
    );

    // Sync membership to all existing trips of the couple
    await query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       SELECT id, $1, 'editor' FROM trips WHERE couple_id = $2
       ON CONFLICT (trip_id, user_id) DO NOTHING`,
      [userId, couple.id]
    );

    broadcastCoupleUpdate(couple.id, 'partner_joined');
    res.json(couple);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/couples/partner', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await getUserCoupleId(req.userId!);
    if (!coupleId) {
      res.status(400).json({ error: 'No couple workspace found' });
      return;
    }
    const { fullName, email } = req.body as { fullName: string; email?: string };
    const placeholderEmail =
      email?.trim().toLowerCase() || `partner_${crypto.randomBytes(4).toString('hex')}@tripbuddy.local`;

    const [user] = await query<{ id: string }>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [placeholderEmail, hashPassword(crypto.randomBytes(16).toString('hex'))]
    );
    await query(
      'INSERT INTO profiles (user_id, email, full_name) VALUES ($1, $2, $3)',
      [user.id, email?.trim() || null, fullName.trim()]
    );
    await query(
      `INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1, $2, 'partner')`,
      [coupleId, user.id]
    );

    broadcastCoupleUpdate(coupleId, 'partner_added');
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// TRIPS CRUD (Auto-initializes itinerary_days, budget_categories & trip_members)
// ============================================================================
app.post('/api/trips', requireAuth, async (req: AuthenticatedRequest, res) => {
  const client = await pool.connect();
  try {
    const userId = req.userId!;
    const coupleId = await getUserCoupleId(userId);
    if (!coupleId) {
      res.status(400).json({ error: 'Please create or join a couple workspace first' });
      return;
    }

    const b = req.body;
    await client.query('BEGIN');

    const tripRes = await client.query(
      `INSERT INTO trips (
        couple_id, name, destination, country, city, destinations, timezone,
        start_date, end_date, cover_image, description, currency, planned_budget, status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        coupleId,
        b.name,
        b.destination,
        b.country,
        b.city || null,
        JSON.stringify(b.destinations || []),
        b.timezone || 'Asia/Jerusalem',
        b.start_date,
        b.end_date,
        b.cover_image || null,
        b.description || null,
        (b.currency || 'EUR').trim(),
        Number(b.planned_budget || 0),
        b.status || 'Planning',
        userId,
      ]
    );
    const trip = tripRes.rows[0];

    // Add all couple members to trip_members
    await client.query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       SELECT $1, user_id, CASE WHEN user_id = $2 THEN 'owner' ELSE 'editor' END
       FROM couple_members WHERE couple_id = $3 ON CONFLICT DO NOTHING`,
      [trip.id, userId, coupleId]
    );

    // Initialize 8 standard budget categories
    for (const cat of STANDARD_BUDGET_CATEGORIES) {
      await client.query(
        'INSERT INTO budget_categories (trip_id, name, allocated_amount) VALUES ($1, $2, 0)',
        [trip.id, cat]
      );
    }

    // Generate itinerary_days with smart multi-destination location mapping
    const dates = getDateRange(b.start_date, b.end_date);
    const stops: Array<{ city: string; country: string; start_date?: string; end_date?: string }> =
      Array.isArray(b.destinations) ? b.destinations : [];

    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      let loc = b.destination;
      if (stops.length > 0) {
        const matched = stops.find(
          (s) => s.start_date && s.end_date && dateStr >= s.start_date && dateStr <= s.end_date
        );
        if (matched) {
          loc = `${matched.city}, ${matched.country}`;
        } else {
          const stopIdx = Math.min(stops.length - 1, Math.floor((i / Math.max(1, dates.length)) * stops.length));
          loc = `${stops[stopIdx].city}, ${stops[stopIdx].country}`;
        }
      }
      await client.query(
        'INSERT INTO itinerary_days (trip_id, day_number, date, location) VALUES ($1, $2, $3, $4)',
        [trip.id, i + 1, dateStr, loc]
      );
    }

    await client.query('COMMIT');
    broadcastCoupleUpdate(coupleId, 'trip_created');
    res.status(201).json(trip);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

app.patch('/api/trips/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await assertTripAccess(req.userId!, req.params.id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE trips SET
        name = COALESCE($1, name),
        destination = COALESCE($2, destination),
        country = COALESCE($3, country),
        city = COALESCE($4, city),
        destinations = COALESCE($5::jsonb, destinations),
        timezone = COALESCE($6, timezone),
        start_date = COALESCE($7, start_date),
        end_date = COALESCE($8, end_date),
        cover_image = COALESCE($9, cover_image),
        description = COALESCE($10, description),
        currency = COALESCE($11, currency),
        planned_budget = COALESCE($12, planned_budget),
        status = COALESCE($13, status),
        updated_at = now()
      WHERE id = $14 RETURNING *`,
      [
        b.name ?? null,
        b.destination ?? null,
        b.country ?? null,
        b.city ?? null,
        b.destinations ? JSON.stringify(b.destinations) : null,
        b.timezone ?? null,
        b.start_date ?? null,
        b.end_date ?? null,
        b.cover_image ?? null,
        b.description ?? null,
        b.currency ?? null,
        b.planned_budget ?? null,
        b.status ?? null,
        req.params.id,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'trip_updated');
    res.json(updated);
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode || 500;
    res.status(code).json({ error: (err as Error).message });
  }
});

app.delete('/api/trips/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await assertTripAccess(req.userId!, req.params.id);
    await query('DELETE FROM trips WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'trip_deleted');
    res.json({ ok: true });
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode || 500;
    res.status(code).json({ error: (err as Error).message });
  }
});

// ============================================================================
// ITINERARY DAYS & EVENTS
// ============================================================================
app.post('/api/trips/:tripId/days', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await assertTripAccess(req.userId!, req.params.tripId);
    const { day_number, date, location } = req.body;
    const [day] = await query(
      `INSERT INTO itinerary_days (trip_id, day_number, date, location)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.tripId, day_number, date, location || null]
    );
    broadcastCoupleUpdate(coupleId, 'day_added');
    res.status(201).json(day);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/days/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [day] = await query<{ trip_id: string }>('SELECT trip_id FROM itinerary_days WHERE id = $1', [req.params.id]);
    if (!day) { res.status(404).json({ error: 'Day not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, day.trip_id);
    const { location, notes } = req.body;
    const [updated] = await query(
      'UPDATE itinerary_days SET location = $1, notes = $2, updated_at = now() WHERE id = $3 RETURNING *',
      [location ?? null, notes ?? null, req.params.id]
    );
    broadcastCoupleUpdate(coupleId, 'day_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/events', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const coupleId = await assertTripAccess(req.userId!, b.trip_id);
    const [event] = await query(
      `INSERT INTO itinerary_events (
        day_id, trip_id, title, category, start_time, end_time, address,
        latitude, longitude, estimated_cost, currency, booking_url, notes, status, sort_order, source_place_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        b.day_id, b.trip_id, b.title, b.category || 'Activity',
        b.start_time || null, b.end_time || null, b.address || null,
        b.latitude ?? null, b.longitude ?? null, b.estimated_cost ?? null,
        b.currency || null, b.booking_url || null, b.notes || null,
        b.status || 'Planned', b.sort_order ?? 1, b.source_place_id || null,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'event_created');
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/events/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [existing] = await query<{ trip_id: string }>('SELECT trip_id FROM itinerary_events WHERE id = $1', [req.params.id]);
    if (!existing) { res.status(404).json({ error: 'Event not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, existing.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE itinerary_events SET
        day_id = COALESCE($1, day_id),
        title = COALESCE($2, title),
        category = COALESCE($3, category),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        address = COALESCE($6, address),
        estimated_cost = COALESCE($7, estimated_cost),
        currency = COALESCE($8, currency),
        booking_url = COALESCE($9, booking_url),
        notes = COALESCE($10, notes),
        status = COALESCE($11, status),
        sort_order = COALESCE($12, sort_order),
        updated_at = now()
      WHERE id = $13 RETURNING *`,
      [
        b.day_id ?? null, b.title ?? null, b.category ?? null,
        b.start_time ?? null, b.end_time ?? null, b.address ?? null,
        b.estimated_cost ?? null, b.currency ?? null, b.booking_url ?? null,
        b.notes ?? null, b.status ?? null, b.sort_order ?? null, req.params.id,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'event_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/events/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [existing] = await query<{ trip_id: string }>('SELECT trip_id FROM itinerary_events WHERE id = $1', [req.params.id]);
    if (!existing) { res.status(404).json({ error: 'Event not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, existing.trip_id);
    await query('DELETE FROM itinerary_events WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'event_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// BUDGET CATEGORIES & EXPENSES
// ============================================================================
app.patch('/api/budget-categories/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [cat] = await query<{ trip_id: string }>('SELECT trip_id FROM budget_categories WHERE id = $1', [req.params.id]);
    if (!cat) { res.status(404).json({ error: 'Category not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, cat.trip_id);
    const [updated] = await query(
      'UPDATE budget_categories SET allocated_amount = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [Number(req.body.allocated_amount || 0), req.params.id]
    );
    broadcastCoupleUpdate(coupleId, 'budget_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/expenses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const coupleId = await assertTripAccess(req.userId!, b.trip_id);
    const [expense] = await query(
      `INSERT INTO expenses (
        trip_id, category_id, title, amount, currency, base_amount,
        exchange_rate, exchange_rate_date, paid_by, expense_date,
        payment_method, receipt_document_id, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        b.trip_id, b.category_id, b.title, b.amount, b.currency, b.base_amount,
        b.exchange_rate || 1, b.exchange_rate_date, b.paid_by || null,
        b.expense_date, b.payment_method || 'Credit Card',
        b.receipt_document_id || null, b.notes || null,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'expense_created');
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/expenses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [ex] = await query<{ trip_id: string }>('SELECT trip_id FROM expenses WHERE id = $1', [req.params.id]);
    if (!ex) { res.status(404).json({ error: 'Expense not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, ex.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE expenses SET
        category_id = COALESCE($1, category_id),
        title = COALESCE($2, title),
        amount = COALESCE($3, amount),
        currency = COALESCE($4, currency),
        base_amount = COALESCE($5, base_amount),
        exchange_rate = COALESCE($6, exchange_rate),
        exchange_rate_date = COALESCE($7, exchange_rate_date),
        paid_by = COALESCE($8, paid_by),
        expense_date = COALESCE($9, expense_date),
        payment_method = COALESCE($10, payment_method),
        receipt_document_id = $11,
        notes = $12,
        updated_at = now()
      WHERE id = $13 RETURNING *`,
      [
        b.category_id ?? null, b.title ?? null, b.amount ?? null,
        b.currency ?? null, b.base_amount ?? null, b.exchange_rate ?? null,
        b.exchange_rate_date ?? null, b.paid_by ?? null, b.expense_date ?? null,
        b.payment_method ?? null, b.receipt_document_id ?? null, b.notes ?? null, req.params.id,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'expense_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/expenses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [ex] = await query<{ trip_id: string }>('SELECT trip_id FROM expenses WHERE id = $1', [req.params.id]);
    if (!ex) { res.status(404).json({ error: 'Expense not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, ex.trip_id);
    await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'expense_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// PRIVATE DOCUMENTS VAULT & SIGNED URLS
// ============================================================================
app.post('/api/documents', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const file = req.file;
    const { trip_id, name, category, expiration_date, description } = req.body;
    if (!file || !trip_id) {
      res.status(400).json({ error: 'File and trip_id are required' });
      return;
    }
    const coupleId = await assertTripAccess(req.userId!, trip_id);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${coupleId}/${trip_id}/${crypto.randomUUID()}-${sanitized}`;

    await query(
      `INSERT INTO private_file_blobs (file_path, bucket, couple_id, trip_id, mime_type, file_size, data)
       VALUES ($1, 'documents-vault', $2, $3, $4, $5, $6)`,
      [filePath, coupleId, trip_id, file.mimetype, file.size, file.buffer]
    );

    const [doc] = await query(
      `INSERT INTO documents (
        trip_id, name, category, file_path, file_type, file_size, expiration_date, description, uploaded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        trip_id, (name || file.originalname).trim(), category || 'Other',
        filePath, file.mimetype, file.size,
        expiration_date || null, description || null, req.userId!,
      ]
    );

    broadcastCoupleUpdate(coupleId, 'document_uploaded');
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/files/sign', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filePath } = req.body as { filePath: string };
    const [blob] = await query<{ couple_id: string }>(
      'SELECT couple_id FROM private_file_blobs WHERE file_path = $1',
      [filePath]
    );
    if (!blob) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    const userCoupleId = await getUserCoupleId(req.userId!);
    if (userCoupleId !== blob.couple_id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const signedToken = signToken({ filePath }, 120); // 120 seconds short-lived signed URL
    res.json({ signedUrl: `/api/files/signed/${signedToken}` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/files/signed/:token', async (req, res) => {
  try {
    const decoded = verifyToken<{ filePath: string }>(req.params.token);
    if (!decoded?.filePath) {
      res.status(403).send('Signed URL expired or invalid');
      return;
    }
    const [blob] = await query<{ mime_type: string; data: Buffer }>(
      'SELECT mime_type, data FROM private_file_blobs WHERE file_path = $1',
      [decoded.filePath]
    );
    if (!blob) {
      res.status(404).send('File not found');
      return;
    }
    res.setHeader('Content-Type', blob.mime_type);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(blob.data);
  } catch (err) {
    res.status(500).send((err as Error).message);
  }
});

app.delete('/api/documents/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [doc] = await query<{ trip_id: string; file_path: string }>(
      'SELECT trip_id, file_path FROM documents WHERE id = $1',
      [req.params.id]
    );
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, doc.trip_id);
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    await query('DELETE FROM private_file_blobs WHERE file_path = $1', [doc.file_path]);
    broadcastCoupleUpdate(coupleId, 'document_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// TASKS
// ============================================================================
app.post('/api/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const coupleId = await assertTripAccess(req.userId!, b.trip_id);
    const [task] = await query(
      `INSERT INTO tasks (trip_id, title, description, assigned_to, due_date, priority, status, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        b.trip_id, b.title, b.description || null, b.assigned_to || null,
        b.due_date || null, b.priority || 'Medium', b.status || 'To Do', b.category || 'General',
      ]
    );
    broadcastCoupleUpdate(coupleId, 'task_created');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [tk] = await query<{ trip_id: string }>('SELECT trip_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!tk) { res.status(404).json({ error: 'Task not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, tk.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = COALESCE($3, assigned_to),
        due_date = COALESCE($4, due_date),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        category = COALESCE($7, category),
        updated_at = now()
      WHERE id = $8 RETURNING *`,
      [
        b.title ?? null, b.description ?? null, b.assigned_to ?? null,
        b.due_date ?? null, b.priority ?? null, b.status ?? null, b.category ?? null, req.params.id,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'task_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [tk] = await query<{ trip_id: string }>('SELECT trip_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!tk) { res.status(404).json({ error: 'Task not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, tk.trip_id);
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'task_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// SHOPPING LISTS & ITEMS
// ============================================================================
app.post('/api/shopping-lists', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { trip_id, name } = req.body;
    const coupleId = await assertTripAccess(req.userId!, trip_id);
    const [list] = await query(
      'INSERT INTO shopping_lists (trip_id, name, created_by) VALUES ($1, $2, $3) RETURNING *',
      [trip_id, name.trim(), req.userId!]
    );
    broadcastCoupleUpdate(coupleId, 'shopping_list_created');
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/shopping-lists/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [list] = await query<{ trip_id: string }>('SELECT trip_id FROM shopping_lists WHERE id = $1', [req.params.id]);
    if (!list) { res.status(404).json({ error: 'List not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, list.trip_id);
    await query('DELETE FROM shopping_lists WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'shopping_list_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/shopping-items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const [list] = await query<{ trip_id: string }>('SELECT trip_id FROM shopping_lists WHERE id = $1', [b.list_id]);
    if (!list) { res.status(404).json({ error: 'List not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, list.trip_id);
    const [item] = await query(
      `INSERT INTO shopping_items (list_id, item_name, quantity, estimated_price, category, assigned_to, is_purchased, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        b.list_id, b.item_name, b.quantity || 1, b.estimated_price ?? null,
        b.category || null, b.assigned_to || null, Boolean(b.is_purchased), b.notes || null,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'shopping_item_created');
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/shopping-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await query<{ trip_id: string }>(
      `SELECT sl.trip_id FROM shopping_items si JOIN shopping_lists sl ON sl.id = si.list_id WHERE si.id = $1`,
      [req.params.id]
    );
    if (!row) { res.status(404).json({ error: 'Item not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, row.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE shopping_items SET
        item_name = COALESCE($1, item_name),
        quantity = COALESCE($2, quantity),
        estimated_price = COALESCE($3, estimated_price),
        is_purchased = COALESCE($4, is_purchased),
        updated_at = now()
      WHERE id = $5 RETURNING *`,
      [b.item_name ?? null, b.quantity ?? null, b.estimated_price ?? null, b.is_purchased ?? null, req.params.id]
    );
    broadcastCoupleUpdate(coupleId, 'shopping_item_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/shopping-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await query<{ trip_id: string }>(
      `SELECT sl.trip_id FROM shopping_items si JOIN shopping_lists sl ON sl.id = si.list_id WHERE si.id = $1`,
      [req.params.id]
    );
    if (!row) { res.status(404).json({ error: 'Item not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, row.trip_id);
    await query('DELETE FROM shopping_items WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'shopping_item_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// PACKING ITEMS & TEMPLATES
// ============================================================================
app.post('/api/packing-items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const coupleId = await assertTripAccess(req.userId!, b.trip_id);
    const [item] = await query(
      `INSERT INTO packing_items (trip_id, item_name, category, quantity, assigned_to, is_packed, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        b.trip_id, b.item_name, b.category || 'Clothing', b.quantity || 1,
        b.assigned_to || null, Boolean(b.is_packed), b.notes || null,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'packing_item_created');
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/packing-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await query<{ trip_id: string }>('SELECT trip_id FROM packing_items WHERE id = $1', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Item not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, row.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE packing_items SET
        item_name = COALESCE($1, item_name),
        category = COALESCE($2, category),
        quantity = COALESCE($3, quantity),
        assigned_to = COALESCE($4, assigned_to),
        is_packed = COALESCE($5, is_packed),
        updated_at = now()
      WHERE id = $6 RETURNING *`,
      [b.item_name ?? null, b.category ?? null, b.quantity ?? null, b.assigned_to ?? null, b.is_packed ?? null, req.params.id]
    );
    broadcastCoupleUpdate(coupleId, 'packing_item_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/packing-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await query<{ trip_id: string }>('SELECT trip_id FROM packing_items WHERE id = $1', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Item not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, row.trip_id);
    await query('DELETE FROM packing_items WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'packing_item_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/packing-templates', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await getUserCoupleId(req.userId!);
    if (!coupleId) { res.status(400).json({ error: 'No couple workspace' }); return; }
    const { name, items } = req.body;
    const [tpl] = await query(
      'INSERT INTO packing_templates (couple_id, name, items) VALUES ($1, $2, $3::jsonb) RETURNING *',
      [coupleId, name.trim(), JSON.stringify(items || [])]
    );
    broadcastCoupleUpdate(coupleId, 'packing_template_created');
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/packing-templates/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const coupleId = await getUserCoupleId(req.userId!);
    if (!coupleId) { res.status(403).json({ error: 'Forbidden' }); return; }
    await query('DELETE FROM packing_templates WHERE id = $1 AND couple_id = $2', [req.params.id, coupleId]);
    broadcastCoupleUpdate(coupleId, 'packing_template_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// PLACES & MEMORIES
// ============================================================================
app.post('/api/places', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const coupleId = await assertTripAccess(req.userId!, b.trip_id);
    const [place] = await query(
      `INSERT INTO places (
        trip_id, name, category, address, latitude, longitude, image_url,
        estimated_cost, currency, rating, notes, visit_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        b.trip_id, b.name, b.category || 'Attraction', b.address || null,
        b.latitude ?? null, b.longitude ?? null, b.image_url || null,
        b.estimated_cost ?? null, b.currency || null, b.rating ?? null,
        b.notes || null, b.visit_status || 'Want to Visit',
      ]
    );
    broadcastCoupleUpdate(coupleId, 'place_created');
    res.status(201).json(place);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/places/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [pl] = await query<{ trip_id: string }>('SELECT trip_id FROM places WHERE id = $1', [req.params.id]);
    if (!pl) { res.status(404).json({ error: 'Place not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, pl.trip_id);
    const b = req.body;
    const [updated] = await query(
      `UPDATE places SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        address = COALESCE($3, address),
        estimated_cost = COALESCE($4, estimated_cost),
        rating = COALESCE($5, rating),
        notes = COALESCE($6, notes),
        visit_status = COALESCE($7, visit_status),
        updated_at = now()
      WHERE id = $8 RETURNING *`,
      [
        b.name ?? null, b.category ?? null, b.address ?? null,
        b.estimated_cost ?? null, b.rating ?? null, b.notes ?? null,
        b.visit_status ?? null, req.params.id,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'place_updated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/places/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [pl] = await query<{ trip_id: string }>('SELECT trip_id FROM places WHERE id = $1', [req.params.id]);
    if (!pl) { res.status(404).json({ error: 'Place not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, pl.trip_id);
    await query('DELETE FROM places WHERE id = $1', [req.params.id]);
    broadcastCoupleUpdate(coupleId, 'place_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/memories', requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
  try {
    const { trip_id, title, description, location, rating, memory_date } = req.body;
    const coupleId = await assertTripAccess(req.userId!, trip_id);
    let imagePath: string | null = null;

    if (req.file) {
      const sanitized = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      imagePath = `${coupleId}/${trip_id}/${crypto.randomUUID()}-${sanitized}`;
      await query(
        `INSERT INTO private_file_blobs (file_path, bucket, couple_id, trip_id, mime_type, file_size, data)
         VALUES ($1, 'trip-memories', $2, $3, $4, $5, $6)`,
        [imagePath, coupleId, trip_id, req.file.mimetype, req.file.size, req.file.buffer]
      );
    }

    const [memory] = await query(
      `INSERT INTO memories (trip_id, title, description, image_path, location, rating, memory_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        trip_id, title.trim(), description || null, imagePath,
        location || null, rating ? Number(rating) : null,
        memory_date || new Date().toISOString().split('T')[0], req.userId!,
      ]
    );
    broadcastCoupleUpdate(coupleId, 'memory_created');
    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/memories/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [mem] = await query<{ trip_id: string; image_path: string | null }>(
      'SELECT trip_id, image_path FROM memories WHERE id = $1',
      [req.params.id]
    );
    if (!mem) { res.status(404).json({ error: 'Memory not found' }); return; }
    const coupleId = await assertTripAccess(req.userId!, mem.trip_id);
    await query('DELETE FROM memories WHERE id = $1', [req.params.id]);
    if (mem.image_path) {
      await query('DELETE FROM private_file_blobs WHERE file_path = $1', [mem.image_path]);
    }
    broadcastCoupleUpdate(coupleId, 'memory_deleted');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default app;
