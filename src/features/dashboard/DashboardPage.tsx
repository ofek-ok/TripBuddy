import React, { useEffect, useState } from 'react';
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
  Compass,
  FolderLock,
  ListChecks,
  MapPin,
  Plane,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';

function getDetailedCountdown(startDateStr: string) {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0).getTime();
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes, totalMs: target - Date.now() };
}

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

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

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
  const countdown = getDetailedCountdown(activeTrip.start_date);

  const pendingTasks = activeTasks.filter((tk) => tk.status !== 'Completed').slice(0, 5);
  const upcomingEvents = activeEvents
    .filter((ev) => ev.status !== 'Cancelled')
    .slice(0, 5);

  return (
    <div className="relative space-y-5">
      {/* Full-Screen Fixed Trip Cover Background (Crisp & Luminous behind Frosted Glass Cards) */}
      {activeTrip.cover_image && (
        <div
          aria-hidden="true"
          className="fixed inset-0 md:ms-64 lg:ms-72 pointer-events-none z-0 overflow-hidden"
        >
          <img
            src={activeTrip.cover_image}
            alt=""
            className="w-full h-full object-cover object-center opacity-55 scale-[1.02]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ivory/25 via-ivory/50 to-ivory/80" />
        </div>
      )}

      {/* Editorial Magazine Hero Card — Showcases Vivid Trip Cover Photo */}
      <div className="relative z-10 space-y-5">
      <div className="relative rounded-3xl text-white shadow-xl overflow-hidden bg-gradient-to-br from-navy via-navy-light to-sand-dark min-h-[400px] sm:min-h-[450px] flex flex-col justify-between p-5 sm:p-7 border border-white/25">
        {activeTrip.cover_image && (
          <>
            <img
              src={activeTrip.cover_image}
              alt={activeTrip.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Light top, rich bottom scrim so the upper 60% of the photo stays vivid & unobstructed */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent" />
          </>
        )}

        {/* Top Floating Glass Pills (leaves middle of photo open & vivid!) */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="sand" className="bg-sand/95 backdrop-blur-md text-white border-0 shadow-md">
            {t.trips.statuses[activeTrip.status]}
          </Badge>
          <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-navy/50 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm">
            <CalendarRange className="w-3.5 h-3.5 text-sand-light" />
            {formatDate(activeTrip.start_date, lang)} – {formatDate(activeTrip.end_date, lang)}
          </span>
        </div>

        {/* Bottom Editorial Overlay: Title + Multi-Destination + Countdown + Progress */}
        <div className="relative z-10 space-y-4 pt-24 sm:pt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-sm">
                {activeTrip.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/95 drop-shadow-xs">
                <MapPin className="w-4 h-4 text-sand-light shrink-0" />
                <span>
                  {activeTrip.destination} ({activeTrip.country})
                </span>
              </div>

              {activeTrip.destinations && activeTrip.destinations.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {activeTrip.destinations.map((stop, idx) => (
                    <React.Fragment key={stop.id || idx}>
                      <span className="px-2.5 py-0.5 rounded-full bg-navy/55 backdrop-blur-md border border-white/15 text-white text-xs font-medium">
                        {stop.city}, {stop.country}
                      </span>
                      {idx < activeTrip.destinations!.length - 1 && (
                        <span className="text-sand-light text-xs font-bold">
                          {lang === 'he' ? '←' : '→'}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Prominent Visual Countdown Block */}
            {daysUntilStart > 0 ? (
              <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-lg">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-sand uppercase tracking-wider mb-2">
                  <Plane className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'ספירה לאחור להמראה' : 'Countdown to Takeoff'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center" dir="ltr">
                  <div className="bg-navy/70 rounded-xl px-3 py-2 min-w-[64px]">
                    <div className="text-2xl sm:text-3xl font-black text-white leading-none">
                      {countdown.days}
                    </div>
                    <div className="text-[10px] text-ivory/75 mt-1 font-medium">
                      {lang === 'he' ? 'ימים' : 'Days'}
                    </div>
                  </div>
                  <div className="bg-navy/70 rounded-xl px-3 py-2 min-w-[64px]">
                    <div className="text-2xl sm:text-3xl font-black text-sand leading-none">
                      {String(countdown.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-ivory/75 mt-1 font-medium">
                      {lang === 'he' ? 'שעות' : 'Hours'}
                    </div>
                  </div>
                  <div className="bg-navy/70 rounded-xl px-3 py-2 min-w-[64px]">
                    <div className="text-2xl sm:text-3xl font-black text-sage leading-none">
                      {String(countdown.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-ivory/75 mt-1 font-medium">
                      {lang === 'he' ? 'דקות' : 'Mins'}
                    </div>
                  </div>
                </div>
              </div>
            ) : daysUntilEnd >= 0 ? (
              <div className="bg-sage/25 border border-sage/50 backdrop-blur-md rounded-2xl px-5 py-3 text-center shrink-0">
                <div className="text-base font-extrabold text-white flex items-center gap-2">
                  <Plane className="w-5 h-5 text-sand" />
                  <span>{t.dashboard.tripActiveNow}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 text-xs font-bold text-ivory shrink-0">
                {t.dashboard.tripCompleted}
              </div>
            )}
          </div>

          {/* Preparation Progress Bar */}
          <div className="pt-4 border-t border-white/15">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-ivory/85 font-medium">{t.dashboard.prepProgress}</span>
              <span className="font-bold text-sand">{prepProgressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sand to-sage transition-all duration-500 rounded-full"
                style={{ width: `${prepProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="relative z-10 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-navy/60 px-1">
          {t.dashboard.quickActions}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => navigate('/trips?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface/88 backdrop-blur-md border border-white/60 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaCreateTrip}</span>
          </button>

          <button
            onClick={() => navigate('/budget?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface/88 backdrop-blur-md border border-white/60 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-sand/20 text-sand-dark flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaAddExpense}</span>
          </button>

          <button
            onClick={() => navigate('/tasks?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface/88 backdrop-blur-md border border-white/60 hover:border-sand transition-all text-start shadow-card"
          >
            <div className="w-9 h-9 rounded-xl bg-sage/25 text-navy flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-navy">{t.dashboard.qaAddTask}</span>
          </button>

          <button
            onClick={() => navigate('/itinerary?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface/88 backdrop-blur-md border border-white/60 hover:border-sand transition-all text-start shadow-card"
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

      {/* Budget Overview Cards */}
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

      {/* Two Column Widgets */}
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
              {lang === 'he' ? 'אין פעילויות משובצות עדיין במסלול' : 'No activities scheduled yet'}
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
              <span>{lang === 'he' ? 'כל המשימות הושלמו!' : 'All tasks are completed!'}</span>
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
                      tk.priority === 'High' ? 'danger' : tk.priority === 'Medium' ? 'sand' : 'ivory'
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

      {/* Recent Trips Strip */}
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
    </div>
  );
};
