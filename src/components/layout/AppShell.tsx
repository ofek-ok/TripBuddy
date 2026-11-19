import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  Compass,
  FolderLock,
  Globe,
  HeartHandshake,
  Home,
  LayoutGrid,
  ListChecks,
  LogOut,
  MapPin,
  ShoppingBag,
  Sparkles,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { Badge, ModalDrawer } from '@/components/ui/primitives';
import { AppLogo } from '@/components/shared/AppLogo';
import { formatShortDate } from '@/lib/utils/formatters';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, t } = useI18n();
  const {
    currentUser,
    currentCouple,
    coupleMembers,
    trips,
    activeTrip,
    setActiveTripId,
    signOut,
  } = useAppStore();
  const [tripSwitcherOpen, setTripSwitcherOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const mainNavItems = [
    { to: '/', label: t.nav.dashboard, icon: Home, exact: true },
    { to: '/trips', label: t.nav.trips, icon: Compass },
    { to: '/itinerary', label: t.nav.itinerary, icon: CalendarRange },
    { to: '/budget', label: t.nav.budget, icon: Wallet },
    { to: '/more', label: t.nav.more, icon: LayoutGrid },
  ];

  const secondaryNavItems = [
    { to: '/documents', label: t.nav.documents, icon: FolderLock },
    { to: '/tasks', label: t.nav.tasks, icon: ListChecks },
    { to: '/lists', label: t.nav.lists, icon: ShoppingBag },
    { to: '/places', label: t.nav.places, icon: MapPin },
    { to: '/memories', label: t.nav.memories, icon: Sparkles },
    { to: '/workspace', label: t.nav.settings, icon: HeartHandshake },
  ];

  const isMoreRouteActive = secondaryNavItems.some((item) =>
    location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-ivory text-navy">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 bg-navy text-white px-4 py-6 z-30">
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-3">
            <AppLogo size="md" onClick={() => navigate('/')} />
            <div>
              <h1 className="font-bold text-base tracking-tight">{t.appName}</h1>
              <p className="text-xs text-ivory/70">{ currentCouple?.name || t.tagline }</p>
            </div>
          </div>
        </div>

        {/* Active Trip Selector Card on Desktop */}
        {activeTrip && (
          <button
            onClick={() => setTripSwitcherOpen(true)}
            className="w-full text-start bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3.5 mb-6 border border-white/10"
          >
            <div className="flex items-center justify-between text-xs text-sand font-medium mb-1">
              <span>{t.common.activeTrip}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <div className="font-bold text-sm truncate">{activeTrip.name}</div>
            <div className="text-xs text-ivory/70 mt-0.5 truncate">
              {activeTrip.destination} • {formatShortDate(activeTrip.start_date, lang)} -{' '}
              {formatShortDate(activeTrip.end_date, lang)}
            </div>
          </button>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sand text-white shadow-sm'
                      : 'text-ivory/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 pb-1 px-3 text-[11px] uppercase tracking-wider text-ivory/50 font-semibold">
            {t.nav.more}
          </div>

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sand text-white shadow-sm'
                      : 'text-ivory/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-ivory/80">
            <span className="truncate">{currentUser?.full_name}</span>
            <span className="text-sage">
              {coupleMembers.length} {lang === 'he' ? 'שותפים' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'he' ? 'English' : 'עברית'}</span>
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-ivory"
              title={t.common.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ms-64 lg:ms-72 min-w-0">
        {/* Mobile & Tablet Top Header */}
        <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-navy/[0.08] px-4 py-3 pt-safe">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <AppLogo size="sm" onClick={() => navigate('/')} />
              {activeTrip ? (
                <button
                  onClick={() => setTripSwitcherOpen(true)}
                  className="text-start min-w-0 group"
                >
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-sand">
                    <span className="truncate">{currentCouple?.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <div className="text-sm font-bold text-navy truncate">
                    {activeTrip.name} • {activeTrip.destination}
                  </div>
                </button>
              ) : (
                <div className="min-w-0">
                  <div className="text-xs text-navy/60 truncate">{currentCouple?.name}</div>
                  <div className="text-sm font-bold text-navy truncate">{t.appName}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className="h-9 px-2.5 rounded-xl bg-ivory border border-navy/10 text-xs font-semibold text-navy flex items-center gap-1 hover:bg-navy/5"
              >
                <Globe className="w-3.5 h-3.5 text-sand" />
                <span>{lang === 'he' ? 'EN' : 'עב'}</span>
              </button>
              <button
                onClick={() => navigate('/workspace')}
                className="h-9 px-2.5 rounded-xl bg-ivory border border-navy/10 text-xs font-semibold text-navy flex items-center gap-1 hover:bg-navy/5"
                title={t.nav.settings}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-navy" />
                <span className="hidden sm:inline">{coupleMembers.length}/2</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 pb-28 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-navy/10 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const customActive = item.to === '/more' ? isMoreRouteActive : undefined;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => {
                  const active = customActive || isActive;
                  return `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? 'text-navy font-bold' : 'text-navy/55 hover:text-navy'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const active = customActive || isActive;
                  return (
                    <>
                      <div
                        className={`px-3 py-1 rounded-full transition-colors ${
                          active ? 'bg-sand/25 text-navy' : ''
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="truncate max-w-[68px]">{item.label}</span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Trip Switcher Drawer */}
      <ModalDrawer
        open={tripSwitcherOpen}
        onClose={() => setTripSwitcherOpen(false)}
        title={t.common.switchTrip}
      >
        <div className="space-y-2.5">
          {trips.map((trip) => {
            const isSelected = activeTrip?.id === trip.id;
            return (
              <button
                key={trip.id}
                onClick={() => {
                  setActiveTripId(trip.id);
                  setTripSwitcherOpen(false);
                }}
                className={`w-full text-start p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-navy text-white border-navy shadow-sm'
                    : 'bg-ivory/60 hover:bg-ivory border-navy/10 text-navy'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{trip.name}</div>
                  <div
                    className={`text-xs mt-0.5 ${
                      isSelected ? 'text-ivory/80' : 'text-navy/60'
                    }`}
                  >
                    {trip.destination} ({trip.country}) • {formatShortDate(trip.start_date, lang)} -{' '}
                    {formatShortDate(trip.end_date, lang)}
                  </div>
                </div>
                <Badge variant={isSelected ? 'sand' : 'sage'}>
                  {t.trips.statuses[trip.status]}
                </Badge>
              </button>
            );
          })}
        </div>
      </ModalDrawer>
    </div>
  );
};
