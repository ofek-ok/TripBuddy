import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { Badge, Button, Card } from '@/components/ui/primitives';
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  getCountdownDays,
} from '@/lib/utils/formatters';
import {
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Clock,
  Compass,
  FolderLock,
  ListChecks,
  MapPin,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    trips,
    activeTrip,
    setActiveTripId,
    activeDays,
    activeEvents,
    activeExpenses,
    activeTasks,
    activePackingItems,
  } = useAppStore();
  const navigate = useNavigate();

  if (!activeTrip) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-navy to-navy-light text-white border-0">
          <div className="w-14 h-14 rounded-2xl bg-sand/25 text-sand mx-auto flex items-center justify-center">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h1 className="text-2xl font-bold">{t.common.noActiveTrip}</h1>
            <p className="text-xs text-ivory/80">{t.common.selectOrCreateTrip}</p>
          </div>
          <Button variant="sand" size="lg" onClick={() => navigate('/trips?action=new')}>
            <Plus className="w-4 h-4" />
            <span>{t.dashboard.qaCreateTrip}</span>
          </Button>
        </Card>
      </div>
    );
  }

  const totalActualExpenses = activeExpenses.reduce(
    (sum, ex) => sum + Number(ex.base_amount || 0),
    0
  );
  const remainingBudget = activeTrip.planned_budget - totalActualExpenses;
  const budgetPercentUsed =
    activeTrip.planned_budget > 0
      ? Math.min(100, Math.round((totalActualExpenses / activeTrip.planned_budget) * 100))
      : 0;

  const completedTasksCount = activeTasks.filter((tk) => tk.status === 'Completed').length;
  const packedItemsCount = activePackingItems.filter((pi) => pi.is_packed).length;
  const totalPrepItems = activeTasks.length + activePackingItems.length;
  const prepProgressPercent =
    totalPrepItems > 0
      ? Math.round(((completedTasksCount + packedItemsCount) / totalPrepItems) * 100)
      : 0;

  const daysUntilStart = getCountdownDays(activeTrip.start_date);
  const daysUntilEnd = getCountdownDays(activeTrip.end_date);

  const pendingTasks = activeTasks.filter((tk) => tk.status !== 'Completed').slice(0, 5);
  const upcomingEvents = activeEvents
    .filter((ev) => ev.status !== 'Cancelled')
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Hero Upcoming Trip Card with Countdown */}
      <div
        className="rounded-3xl p-5 sm:p-6 text-white shadow-soft relative overflow-hidden bg-cover bg-center"
        style={
          activeTrip.cover_image
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(23,43,58,0.92) 0%, rgba(23,43,58,0.65) 100%), url(${activeTrip.cover_image})`,
              }
            : {
                backgroundImage:
                  'linear-gradient(135deg, #172B3A 0%, #243F54 65%, #C49B70 100%)',
              }
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Badge variant="sand" className="bg-sand text-white border-0">
            {t.trips.statuses[activeTrip.status]}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-xs px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 text-sand" />
            {daysUntilStart > 0 ? (
              <span className="font-bold">
                {daysUntilStart} {t.dashboard.daysLeft}
              </span>
            ) : daysUntilEnd >= 0 ? (
              <span className="font-bold text-sage">{t.dashboard.tripActiveNow}</span>
            ) : (
              <span>{t.dashboard.tripCompleted}</span>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{activeTrip.name}</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-ivory/85 mt-2">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-sand" />
            {activeTrip.destination} ({activeTrip.country})
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4 text-sage" />
            {formatDate(activeTrip.start_date, lang)} – {formatDate(activeTrip.end_date, lang)}
          </span>
        </div>

        {activeTrip.destinations && activeTrip.destinations.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {activeTrip.destinations.map((stop, idx) => (
              <React.Fragment key={stop.id || idx}>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-ivory text-xs font-medium">
                  {stop.city}, {stop.country}
                </span>
                {idx < activeTrip.destinations!.length - 1 && (
                  <span className="text-sand text-xs font-bold">
                    {lang === 'he' ? '←' : '→'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Preparation Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-ivory/85 font-medium">{t.dashboard.prepProgress}</span>
            <span className="font-bold text-sand">{prepProgressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-sage transition-all duration-500 rounded-full"
              style={{ width: `${prepProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions Strip - Opens Creation Drawer Directly */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-navy/60 px-1">
          {t.dashboard.quickActions}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => navigate('/trips?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-navy/10 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaCreateTrip}</span>
          </button>

          <button
            onClick={() => navigate('/budget?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-navy/10 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-sand/20 text-sand-dark flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaAddExpense}</span>
          </button>

          <button
            onClick={() => navigate('/tasks?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-navy/10 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-sage/25 text-navy flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaAddTask}</span>
          </button>

          <button
            onClick={() => navigate('/itinerary?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-navy/10 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaAddActivity}</span>
          </button>

          <button
            onClick={() => navigate('/documents?action=new')}
            className="col-span-2 sm:col-span-1 flex items-center gap-2.5 p-3 rounded-2xl bg-surface border border-navy/10 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-sand/20 text-navy flex items-center justify-center shrink-0">
              <FolderLock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaUploadDoc}</span>
          </button>
        </div>
      </div>

      {/* Budget Overview Cards (Planned, Actual, Remaining) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="p-3.5 sm:p-4">
          <div className="text-[11px] text-navy/60 font-medium">{t.dashboard.plannedBudget}</div>
          <div className="text-base sm:text-xl font-bold text-navy mt-1 truncate">
            {formatCurrency(activeTrip.planned_budget, activeTrip.currency, lang)}
          </div>
        </Card>
        <Card className="p-3.5 sm:p-4">
          <div className="text-[11px] text-navy/60 font-medium">{t.dashboard.actualExpenses}</div>
          <div className="text-base sm:text-xl font-bold text-sand-dark mt-1 truncate">
            {formatCurrency(totalActualExpenses, activeTrip.currency, lang)}
          </div>
          <div className="text-[10px] text-navy/50 mt-0.5">{budgetPercentUsed}%</div>
        </Card>
        <Card className="p-3.5 sm:p-4">
          <div className="text-[11px] text-navy/60 font-medium">{t.dashboard.remainingBudget}</div>
          <div
            className={`text-base sm:text-xl font-bold mt-1 truncate ${
              remainingBudget < 0 ? 'text-red-600' : 'text-sage-dark'
            }`}
          >
            {formatCurrency(remainingBudget, activeTrip.currency, lang)}
          </div>
        </Card>
      </div>

      {/* Two Column Widgets: Upcoming Activities & Pending Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-sand" />
              <span>{t.dashboard.upcomingActivities}</span>
            </h3>
            <button
              onClick={() => navigate('/itinerary')}
              className="text-xs font-semibold text-sand hover:underline flex items-center gap-0.5"
            >
              <span>{t.nav.itinerary}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-navy/55">
              {lang === 'he'
                ? 'אין פעילויות משובצות עדיין במסלול'
                : 'No activities scheduled yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev) => {
                const dayObj = activeDays.find((d) => d.id === ev.day_id);
                return (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-ivory/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-navy truncate">{ev.title}</div>
                      <div className="text-navy/60 truncate">
                        {dayObj ? `${t.itinerary.day} ${dayObj.day_number}` : ''}{' '}
                        {ev.start_time ? `• ${ev.start_time.slice(0, 5)}` : ''}
                      </div>
                    </div>
                    <Badge variant="sage">{t.itinerary.categories[ev.category]}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-sage-dark" />
              <span>{t.dashboard.pendingTasks}</span>
            </h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs font-semibold text-sand hover:underline flex items-center gap-0.5"
            >
              <span>{t.nav.tasks}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-navy/55 flex flex-col items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-sage" />
              <span>
                {lang === 'he' ? 'כל המשימות הושלמו!' : 'All tasks are completed!'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((tk) => (
                <div
                  key={tk.id}
                  className="p-2.5 rounded-xl bg-ivory/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-navy truncate">{tk.title}</div>
                    {tk.due_date && (
                      <div className="text-navy/60">
                        {t.tasks.dueDate}: {formatShortDate(tk.due_date, lang)}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      tk.priority === 'High'
                        ? 'danger'
                        : tk.priority === 'Medium'
                          ? 'sand'
                          : 'ivory'
                    }
                  >
                    {t.tasks.priorities[tk.priority]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent / All Couple Trips Strip */}
      {trips.length > 1 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sand" />
              <span>{t.dashboard.recentTrips}</span>
            </h3>
            <button
              onClick={() => navigate('/trips')}
              className="text-xs font-semibold text-sand hover:underline"
            >
              {t.nav.trips} ({trips.length})
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {trips.slice(0, 3).map((tr) => (
              <button
                key={tr.id}
                onClick={() => setActiveTripId(tr.id)}
                className={`p-3 rounded-xl border text-start transition-all ${
                  tr.id === activeTrip.id
                    ? 'bg-navy text-white border-navy'
                    : 'bg-ivory/50 border-navy/10 hover:bg-ivory'
                }`}
              >
                <div className="font-bold text-xs truncate">{tr.name}</div>
                <div
                  className={`text-[11px] mt-0.5 truncate ${
                    tr.id === activeTrip.id ? 'text-ivory/75' : 'text-navy/60'
                  }`}
                >
                  {tr.destination} • {formatShortDate(tr.start_date, lang)}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
