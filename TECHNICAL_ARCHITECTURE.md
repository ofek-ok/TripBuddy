# TRAVEL COMPANION – Technical Architecture

## 1. מחסנית טכנולוגית (Technology Stack)

| שכבה / רכיב | טכנולוגיה | תפקיד |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | בניית ממשק משתמש מבוסס קומפוננטות עם Type Safety מלא |
| **Build Tool** | Vite | סביבת פיתוח מהירה ו-Bundling מותאם ל-Production |
| **Styling** | Tailwind CSS | עיצוב Mobile-First עם תמיכה מובנית ב-Logical Properties (RTL/LTR) |
| **UI Components** | shadcn/ui (Radix UI) | רכיבי UI נגישים, מודולריים ומותאמים לשפה העיצובית |
| **State & Data Fetching** | TanStack Query v5 + React Context | ניהול מצב שרת, Caching, Optimistic Updates וסנכרון Realtime |
| **Forms & Validation** | React Hook Form + Zod | ולידציה קשיחה בצד הלקוח לכל הטפסים והקלטים |
| **Backend & Database** | Supabase (PostgreSQL) | מסד נתונים רלציוני, פונקציות RPC, Triggers ו-Row Level Security |
| **Authentication** | Supabase Auth | ניהול זהויות, JWT, והרשאות משתמשים |
| **File Storage** | Supabase Storage | אחסון מאובטח (Private Buckets) למסמכים ותמונות זיכרונות |
| **Charts** | Recharts | ויזואליזציה של תקציב והוצאות |
| **PWA** | vite-plugin-pwa (Workbox) | Web App Manifest, Service Worker ו-Offline Fallback |

---

## 2. עקרונות ארכיטקטורה והפרדת שכבות

המערכת בנויה בארכיטקטורת **Feature-Based Layered Architecture** הכוללת 3 שכבות מבודדות:

1. **Presentation Layer (`src/components`, `src/features/*/components`, `src/features/*/pages`):**
   - רכיבי UI טהורים ומסכים.
   - אינם מבצעים קריאות ישירות ל-Supabase.
   - תומכים ב-RTL/LTR וב-Mobile First (החל מ-360px).
2. **Application & Business Logic Layer (`src/features/*/hooks`, `src/features/*/schemas`, `src/app/providers`):**
   - Custom Hooks המנהלים שליפת נתונים, מוטציות, חישובי תקציב, המרות מטבע וסנכרון Realtime.
   - סכמות ולידציה של Zod לכל ישות.
   - ניהול הקשר גלובלי: `AuthProvider`, `CoupleProvider`, `ActiveTripProvider`, `I18nProvider`.
3. **Data Access Layer (`src/features/*/services`, `src/lib/supabase`):**
   - שירותי TypeScript ייעודיים לכל מודול (`tripsService`, `itineraryService`, `budgetService`, `documentsService`, וכו').
   - טיפול מרוכז בשגיאות מסד נתונים ויצירת Signed URLs לקבצים.

---

## 3. מבנה תיקיות הפרויקט

```text
travel-companion/
├── PROJECT_OVERVIEW.md
├── TECHNICAL_ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── DEVELOPMENT_ROADMAP.md
├── IMPLEMENTATION_STATUS.md
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers/
│   │       ├── AuthProvider.tsx
│   │       ├── CoupleProvider.tsx
│   │       ├── ActiveTripProvider.tsx
│   │       └── I18nProvider.tsx
│   ├── components/
│   │   ├── ui/                 # רכיבי בסיס (Button, Card, Input, Dialog, Drawer, Select, Badge, Tabs...)
│   │   ├── layout/             # AppShell, BottomNav, TopHeader, TripSwitcher, OfflineBanner
│   │   └── shared/             # ConfirmDialog, EmptyState, LoadingState, ErrorBoundary
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── trips/
│   │   ├── itinerary/
│   │   ├── budget/
│   │   ├── documents/
│   │   ├── tasks/
│   │   ├── lists/
│   │   ├── places/
│   │   └── memories/
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts
│   │   ├── i18n/
│   │   │   └── translations.ts
│   │   ├── errors/
│   │   │   └── errorHandler.ts
│   │   └── utils/
│   │       ├── cn.ts
│   │       ├── formatters.ts
│   │       └── dateUtils.ts
│   └── types/
│       └── database.types.ts
```

---

## 4. אבטחת מידע ו-PWA Caching

1. **Row Level Security (RLS):**
   - מופעל על כל 17 הטבלאות ועל `storage.objects`.
   - כל גישה נבדקת מול השתייכות המשתמש (`auth.uid()`) ל-`couple_id` של הנתון המבוקש.
2. **Documents Vault Security:**
   - Bucket פרטי (`documents-vault`) ללא גישה ציבורית.
   - בדיקת סוגי קבצים מותרים (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) והגבלת גודל קובץ (עד 20MB).
   - צפייה והורדה באמצעות **Signed URLs** קצרי-מועד (120 שניות) הנוצרים לפי דרישה.
3. **PWA & Service Worker:**
   - שומר במטמון (Cache) רק משאבים סטטיים (JS, CSS, Fonts, App Icons).
   - **איסור מוחלט** על שמירת בקשות Storage או מסמכים אישיים ב-Cache (`NetworkOnly` לנתיבי `/storage/v1/`).
