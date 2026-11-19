import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/app/providers/I18nProvider';
import { ToastProvider } from '@/lib/errors/errorHandler';
import { AppStoreProvider, useAppStore } from '@/app/providers/AppStoreProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AuthWorkspacePage } from '@/features/auth/AuthWorkspacePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TripsPage } from '@/features/trips/TripsPage';
import { ItineraryPage } from '@/features/itinerary/ItineraryPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { ListsPage } from '@/features/lists/ListsPage';
import { PlacesPage } from '@/features/places/PlacesPage';
import { MemoriesPage } from '@/features/memories/MemoriesPage';
import { MoreHubPage } from '@/features/more/MoreHubPage';

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
