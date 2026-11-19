# TRAVEL COMPANION – Database Schema & Security Specification

מסמך זה מגדיר את מבנה מסד הנתונים המלא ב-PostgreSQL (Supabase), כולל 17 הטבלאות, קשרי הגומלין, ה-Constraints, האינדקסים ומדיניות ה-Row Level Security (RLS).
קובץ המיגרציה המלא נמצא ב-`supabase/migrations/0001_initial_schema.sql`.

---

## 1. רשימת הטבלאות והקשרים (17 Tables)

| # | שם הטבלה | Primary Key | Foreign Keys מרכזיים | תיאור |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `profiles` | `user_id` (`UUID`) | `auth.users(id)` | פרטי משתמש והעדפת שפה (`he`/`en`) |
| 2 | `couples` | `id` (`UUID`) | `created_by -> profiles(user_id)` | סביבת העבודה הזוגית וקוד ההזמנה |
| 3 | `couple_members` | `id` (`UUID`) | `couple_id -> couples(id)`, `user_id -> profiles(user_id)` | שיוך משתמשים לסביבה הזוגית |
| 4 | `trips` | `id` (`UUID`) | `couple_id -> couples(id)` | פרטי הטיול, תאריכים, מטבע בסיס, תקציב וסטטוס |
| 5 | `trip_members` | `id` (`UUID`) | `trip_id -> trips(id)`, `user_id -> profiles(user_id)` | משתתפי הטיול (מתמלא אוטומטית מחברי הזוג) |
| 6 | `itinerary_days` | `id` (`UUID`) | `trip_id -> trips(id)` | ימי המסלול של הטיול (נוצרים אוטומטית לפי תאריכי הטיול) |
| 7 | `itinerary_events` | `id` (`UUID`) | `day_id -> itinerary_days(id)`, `trip_id -> trips(id)` | אירועים ופעילויות בלו"ז היומי |
| 8 | `budget_categories`| `id` (`UUID`) | `trip_id -> trips(id)` | 8 קטגוריות התקציב והסכום המוקצה לכל אחת |
| 9 | `documents` | `id` (`UUID`) | `trip_id -> trips(id)`, `uploaded_by -> profiles(user_id)` | מטא-דאטה של מסמכים בכספת הפרטית |
| 10| `expenses` | `id` (`UUID`) | `trip_id -> trips(id)`, `category_id -> budget_categories(id)`, `paid_by -> profiles(user_id)`, `receipt_document_id -> documents(id)` | הוצאות הטיול כולל המרת מטבע |
| 11| `tasks` | `id` (`UUID`) | `trip_id -> trips(id)`, `assigned_to -> profiles(user_id)` | משימות הכנה לטיול |
| 12| `shopping_lists` | `id` (`UUID`) | `trip_id -> trips(id)`, `created_by -> profiles(user_id)` | רשימות קניות לטיול |
| 13| `shopping_items` | `id` (`UUID`) | `list_id -> shopping_lists(id)`, `assigned_to -> profiles(user_id)` | פריטים בתוך רשימת קניות |
| 14| `packing_templates`| `id` (`UUID`) | `couple_id -> couples(id)` | תבניות אריזה רב-פעמיות ברמת הזוג |
| 15| `packing_items` | `id` (`UUID`) | `trip_id -> trips(id)`, `assigned_to -> profiles(user_id)` | פריטי אריזה לטיול ספציפי |
| 16| `places` | `id` (`UUID`) | `trip_id -> trips(id)` | מקומות שמורים (Wishlist) |
| 17| `memories` | `id` (`UUID`) | `trip_id -> trips(id)`, `created_by -> profiles(user_id)` | זיכרונות, תמונות וסיכום חוויות מהטיול |

---

## 2. Enums ו-Constraints מרכזיים

- **`trip_status`:** `'Planning'`, `'Upcoming'`, `'Active'`, `'Completed'`, `'Archived'`
- **`event_category`:** `'Flight'`, `'Hotel'`, `'Restaurant'`, `'Attraction'`, `'Transportation'`, `'Shopping'`, `'Activity'`, `'Other'`
- **`budget_category_type`:** `'Flights'`, `'Accommodation'`, `'Transportation'`, `'Food'`, `'Attractions'`, `'Shopping'`, `'Insurance'`, `'Other'`
- **`document_category`:** `'Flight Tickets'`, `'Hotel Reservations'`, `'Insurance'`, `'Car Rental'`, `'Attractions'`, `'Personal Documents'`, `'Receipts'`, `'Other'`
- **`task_status`:** `'To Do'`, `'In Progress'`, `'Completed'`
- **`task_priority`:** `'Low'`, `'Medium'`, `'High'`
- **`place_visit_status`:** `'Want to Visit'`, `'Planned'`, `'Visited'`

---

## 3. אוטומציות במסד הנתונים (Triggers & RPCs)

1. **`handle_new_user()`:** יוצרת רשומת `profiles` אוטומטית בעת הרשמת משתמש ב-`auth.users`.
2. **`handle_new_trip_initialization()`:** בעת יצירת טיול חדש ב-`trips`:
   - מוסיפה אוטומטית את חברי ה-`couple` לטבלת `trip_members`.
   - מייצרת אוטומטית את 8 קטגוריות התקציב בטבלת `budget_categories`.
   - מייצרת אוטומטית את ימי הטיול (`itinerary_days`) מ-`start_date` ועד `end_date`.
3. **`join_couple_by_invite_code(code TEXT)`:** פונקציית RPC מאובטחת המאפשרת לבן/בת הזוג להצטרף לסביבה הזוגית באמצעות קוד ההזמנה ולסנכרן הרשאות לכל הטיולים הקיימים של הזוג.

---

## 4. מדיניות אבטחה – Row Level Security (RLS)

הפרדת הדיירים (Multi-Tenancy Isolation) מבוססת על שתי פונקציות ליבה עם `SECURITY DEFINER`:
- `public.is_couple_member(target_couple_id UUID) RETURNS BOOLEAN`
- `public.can_access_trip(target_trip_id UUID) RETURNS BOOLEAN`

כל פעולות ה-`SELECT`, `INSERT`, `UPDATE`, `DELETE` בכל 17 הטבלאות נאכפות ע"י פוליסות אלו, כך שמשתמש מסביבה זוגית אחרת אינו יכול לקרוא, לערוך או למחוק אף רשומה או קובץ.
