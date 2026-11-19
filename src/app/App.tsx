import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ToastProvider } from '@/lib/errors/errorHandler';
import { AppStoreProvider, useAppStore } from '@/app/providers/AppStoreProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AuthWorkspacePage } from '@/features/auth/AuthWorkspacePage';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TripsPage = lazy(() =>
  import('@/features/trips/TripsPage').then((m) => ({ default: m.TripsPage }))
);
const ItineraryPage = lazy(() =>
  import('@/features/itinerary/ItineraryPage').then((m) => ({ default: m.ItineraryPage }))
);
const BudgetPage = lazy(() =>
  import('@/features/budget/BudgetPage').then((m) => ({ default: m.BudgetPage }))
);
const DocumentsPage = lazy(() =>
  import('@/features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const TasksPage = lazy(() =>
  import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const ListsPage = lazy(() =>
  import('@/features/lists/ListsPage').then((m) => ({ default: m.ListsPage }))
);
const PlacesPage = lazy(() =>
  import('@/features/places/PlacesPage').then((m) => ({ default: m.PlacesPage }))
);
const MemoriesPage = lazy(() =>
  import('@/features/memories/MemoriesPage').then((m) => ({ default: m.MemoriesPage }))
);
const MoreHubPage = lazy(() =>
  import('@/features/more/MoreHubPage').then((m) => ({ default: m.MoreHubPage }))
);

const PageFallback: React.FC = () => (
  <div className="py-20 flex items-center justify-center text-sm font-semibold text-navy/60">
    Loading...
  </div>
);

const AppRoutes: React.FC = () => {
  const { isLoading, currentUser, currentCouple } = useAppStore();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ivory text-navy text-sm font-semibold">
        Loading TripBuddy...
      </div>
    );
  }

  if (!currentUser || !currentCouple) {
    return <AuthWorkspacePage />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/more" element={<MoreHubPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/workspace" element={<AuthWorkspacePage manageMode />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppStoreProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppStoreProvider>
      </ToastProvider>
    </I18nProvider>
  );
};
