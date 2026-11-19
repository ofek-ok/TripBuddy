import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalDrawer,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  CURRENCIES,
  formatCurrency,
  formatDate,
  formatShortDate,
  getDaysDifference,
} from '@/lib/utils/formatters';
import {
  CurrencyCode,
  Trip,
  TripDestinationStop,
  TripStatus,
} from '@/types/database.types';
import {
  Archive,
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  ImagePlus,
  MapPin,
  Plus,
  Route,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

const TRIP_STATUSES: TripStatus[] = ['Planning', 'Upcoming', 'Active', 'Completed', 'Archived'];

const TIMEZONES = [
  'Asia/Jerusalem',
  'Europe/Warsaw',
  'Europe/Budapest',
  'Europe/Rome',
  'Europe/Paris',
  'Europe/London',
  'Europe/Athens',
  'Asia/Tokyo',
  'Asia/Bangkok',
  'America/New_York',
  'UTC',
];

function clampDate(dateVal: string | null | undefined, minDate: string, maxDate: string): string {
  if (!dateVal) return minDate;
  if (dateVal < minDate) return minDate;
  if (dateVal > maxDate) return maxDate;
  return dateVal;
}

export const TripsPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    trips,
    activeTrip,
    setActiveTripId,
    createTrip,
    updateTrip,
    uploadTripCover,
    duplicateTrip,
    deleteTrip,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state
  const [name, setName] = useState('');
  const [stops, setStops] = useState<TripDestinationStop[]>([
    { id: 'stop-1', city: '', country: '', start_date: '', end_date: '' },
  ]);
  const [startDate, setStartDate] = useState('2026-12-10');
  const [endDate, setEndDate] = useState('2026-12-16');
  const [timezone, setTimezone] = useState('Europe/Warsaw');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [plannedBudget, setPlannedBudget] = useState('12000');
  const [status, setStatus] = useState<TripStatus>('Upcoming');
  const [coverImage, setCoverImage] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingTrip(null);
    setName('');
    setStartDate(today);
    setEndDate(today);
    setStops([
      {
        id: crypto.randomUUID(),
        city: '',
        country: '',
        start_date: today,
        end_date: today,
      },
    ]);
    setTimezone('Europe/Warsaw');
    setCurrency('EUR');
    setPlannedBudget('10000');
    setStatus('Upcoming');
    setCoverImage('');
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setDescription('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Automatically clamp all stop dates whenever overall trip startDate / endDate changes
  const handleStartDateChange = (nextStart: string) => {
    setStartDate(nextStart);
    const effectiveEnd = endDate < nextStart ? nextStart : endDate;
    if (endDate < nextStart) setEndDate(nextStart);
    setStops((prev) =>
      prev.map((s) => ({
        ...s,
        start_date: clampDate(s.start_date, nextStart, effectiveEnd),
        end_date: clampDate(s.end_date, nextStart, effectiveEnd),
      }))
    );
  };

  const handleEndDateChange = (nextEnd: string) => {
    setEndDate(nextEnd);
    setStops((prev) =>
      prev.map((s) => ({
        ...s,
        start_date: clampDate(s.start_date, startDate, nextEnd),
        end_date: clampDate(s.end_date, startDate, nextEnd),
      }))
    );
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setName(trip.name);
    setStartDate(trip.start_date);
    setEndDate(trip.end_date);

    if (trip.destinations && trip.destinations.length > 0) {
      setStops(
        trip.destinations.map((s) => ({
          ...s,
          start_date: clampDate(s.start_date, trip.start_date, trip.end_date),
          end_date: clampDate(s.end_date, trip.start_date, trip.end_date),
        }))
      );
    } else {
      setStops([
        {
          id: crypto.randomUUID(),
          city: trip.city || trip.destination,
          country: trip.country,
          start_date: trip.start_date,
          end_date: trip.end_date,
        },
      ]);
    }

    setTimezone(trip.timezone || 'Europe/Warsaw');
    setCurrency(trip.currency);
    setPlannedBudget(String(trip.planned_budget));
    setStatus(trip.status);
    setCoverImage(trip.cover_image || '');
    setCoverFile(null);
    setCoverPreviewUrl(trip.cover_image || null);
    setDescription(trip.description || '');
    setDrawerOpen(true);
  };

  const handleAddStop = () => {
    const lastStop = stops[stops.length - 1];
    const defaultStart = clampDate(lastStop?.end_date || startDate, startDate, endDate);
    setStops((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        city: '',
        country: '',
        start_date: defaultStart,
        end_date: endDate,
      },
    ]);
  };

  const handleUpdateStop = (
    stopId: string,
    field: keyof TripDestinationStop,
    value: string
  ) => {
    setStops((prev) =>
      prev.map((s) => {
        if (s.id !== stopId) return s;
        if (field === 'start_date' || field === 'end_date') {
          const clamped = clampDate(value, startDate, endDate);
          const nextStop = { ...s, [field]: clamped };
          if (nextStop.start_date && nextStop.end_date && nextStop.end_date < nextStop.start_date) {
            nextStop.end_date = nextStop.start_date;
          }
          return nextStop;
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleRemoveStop = (stopId: string) => {
    if (stops.length <= 1) return;
    setStops((prev) => prev.filter((s) => s.id !== stopId));
  };

  const handleCoverFileSelect = (file: File | null) => {
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCoverPreviewUrl(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setCoverPreviewUrl(coverImage || null);
    }
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (endDate < startDate) {
        throw new Error(
          lang === 'he'
            ? 'תאריך הסיום חייב להיות שווה או מאוחר מתאריך ההתחלה'
            : 'End date must be on or after start date'
        );
      }

      const cleanedStops = stops
        .map((s) => {
          const clampedStart = s.start_date ? clampDate(s.start_date, startDate, endDate) : null;
          const clampedEnd = s.end_date ? clampDate(s.end_date, clampedStart || startDate, endDate) : null;
          return {
            id: s.id || crypto.randomUUID(),
            city: s.city.trim(),
            country: s.country.trim(),
            start_date: clampedStart,
            end_date: clampedEnd,
          };
        })
        .filter((s) => s.city || s.country);

      if (cleanedStops.length === 0) {
        throw new Error(
          lang === 'he'
            ? 'נא להזין לפחות יעד אחד (עיר ומדינה)'
            : 'Please enter at least one destination (city and country)'
        );
      }

      const citiesList = cleanedStops.map((s) => s.city).filter(Boolean);
      const uniqueCountries = Array.from(
        new Set(cleanedStops.map((s) => s.country).filter(Boolean))
      );

      const payload = {
        name: name.trim(),
        destination: citiesList.join(' • '),
        country: uniqueCountries.join(', '),
        city: citiesList.join(', ') || null,
        destinations: cleanedStops,
        timezone,
        start_date: startDate,
        end_date: endDate,
        cover_image: coverImage.trim() || null,
        description: description.trim() || null,
        currency,
        planned_budget: Math.max(0, Number(plannedBudget) || 0),
        status,
      };

      let savedTripId: string;
      if (editingTrip) {
        await updateTrip(editingTrip.id, payload);
        savedTripId = editingTrip.id;
      } else {
        const created = await createTrip(payload);
        savedTripId = created.id;
      }

      if (coverFile) {
        await uploadTripCover(savedTripId, coverFile);
      }

      notify(
        editingTrip
          ? lang === 'he'
            ? 'הטיול עודכן בהצלחה'
            : 'Trip updated'
          : lang === 'he'
            ? 'הטיול נוצר בהצלחה!'
            : 'Trip created!',
        'success'
      );
      setDrawerOpen(false);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTrips = trips.filter((tr) =>
    statusFilter === 'ALL' ? true : tr.status === statusFilter
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.trips.title}</h1>
          <p className="text-xs text-navy/65">
            {lang === 'he'
              ? 'נהלו את כל החופשות שלכם (כולל טיולים מרובי יעדים ומדינות), שכפלו מסלולים או העבירו לארכיון'
              : 'Manage all your journeys (including multi-city & multi-country trips), duplicate itineraries or archive past trips'}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>{t.trips.newTrip}</span>
        </Button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            statusFilter === 'ALL'
              ? 'bg-navy text-white'
              : 'bg-surface text-navy/70 border border-navy/10'
          }`}
        >
          {t.common.all} ({trips.length})
        </button>
        {TRIP_STATUSES.map((st) => {
          const count = trips.filter((x) => x.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                statusFilter === st
                  ? 'bg-navy text-white'
                  : 'bg-surface text-navy/70 border border-navy/10'
              }`}
            >
              {t.trips.statuses[st]} ({count})
            </button>
          );
        })}
      </div>

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-navy">{t.common.noActiveTrip}</p>
          <p className="text-xs text-navy/60">{t.common.selectOrCreateTrip}</p>
          <Button onClick={openCreateModal} variant="sand">
            <Plus className="w-4 h-4" />
            <span>{t.trips.newTrip}</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => {
            const isSelected = activeTrip?.id === trip.id;
            const daysCount = getDaysDifference(trip.start_date, trip.end_date);
            const tripStops =
              trip.destinations && trip.destinations.length > 0 ? trip.destinations : null;

            return (
              <Card
                key={trip.id}
                className={`overflow-hidden p-0 flex flex-col justify-between transition-all ${
                  isSelected ? 'ring-2 ring-sand border-sand' : ''
                }`}
              >
                {/* Cover Header with reliable <img> rendering */}
                <div className="h-40 bg-gradient-to-br from-navy via-navy-light to-sand relative flex items-end p-4 text-white overflow-hidden">
                  {trip.cover_image && (
                    <>
                      <img
                        src={trip.cover_image}
                        alt={trip.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-navy/15" />
                    </>
                  )}
                  <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between">
                    <Badge variant={trip.status === 'Active' ? 'sand' : 'sage'}>
                      {t.trips.statuses[trip.status]}
                    </Badge>
                    {isSelected && (
                      <Badge variant="navy" className="bg-sand text-white">
                        {t.common.activeTrip}
                      </Badge>
                    )}
                  </div>
                  <div className="w-full relative z-10">
                    <h3 className="text-lg font-bold leading-tight drop-shadow-xs">{trip.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-ivory/95 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-sand shrink-0" />
                      <span className="truncate">
                        {trip.destination} ({trip.country})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {tripStops && tripStops.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tripStops.map((stop, idx) => (
                        <React.Fragment key={stop.id || idx}>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-ivory text-navy text-xs font-semibold border border-navy/10">
                            <MapPin className="w-3 h-3 text-sand" />
                            <span>
                              {stop.city}
                              {stop.country ? `, ${stop.country}` : ''}
                            </span>
                            {stop.start_date && stop.end_date && (
                              <span className="text-[10px] text-navy/55 ms-1">
                                ({formatShortDate(stop.start_date, lang)}-
                                {formatShortDate(stop.end_date, lang)})
                              </span>
                            )}
                          </span>
                          {idx < tripStops.length - 1 && (
                            <span className="text-xs text-sand font-bold">
                              {lang === 'he' ? '←' : '→'}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-ivory/70 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-navy/60 shrink-0" />
                      <div>
                        <div className="text-navy/60">
                          {daysCount} {lang === 'he' ? 'ימים' : 'days'}
                        </div>
                        <div className="font-semibold text-navy">
                          {formatDate(trip.start_date, lang)}
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-ivory/70 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-sand shrink-0" />
                      <div>
                        <div className="text-navy/60">{t.trips.plannedBudget}</div>
                        <div className="font-semibold text-navy">
                          {formatCurrency(trip.planned_budget, trip.currency, lang)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {trip.description && (
                    <p className="text-xs text-navy/70 line-clamp-2">{trip.description}</p>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-navy/10 flex flex-wrap items-center justify-between gap-2">
                    {!isSelected ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveTripId(trip.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.trips.setActive}</span>
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-sage-dark flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {t.common.activeTrip}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditModal(trip)}
                        title={t.common.edit}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => duplicateTrip(trip.id)}
                        title={t.trips.duplicate}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {trip.status !== 'Archived' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateTrip(trip.id, { status: 'Archived' })}
                          title={t.trips.archive}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setTripToDelete(trip)}
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Trip Drawer */}
      <ModalDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingTrip ? t.trips.editTrip : t.trips.newTrip}
      >
        <form onSubmit={handleSaveTrip} className="space-y-4">
          <Input
            label={t.trips.tripName}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              lang === 'he'
                ? 'למשל: חופשת חורף בקרקוב ובודפשט'
                : 'e.g., Krakow & Budapest Winter Trip'
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label={t.trips.startDate}
              required
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
            <Input
              type="date"
              label={t.trips.endDate}
              required
              min={startDate}
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>

          {/* Multi-Destination Stops Builder (Date Pickers Restricted Strictly to Trip Range) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-ivory/80 border border-navy/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <Route className="w-4 h-4 text-sand" />
                <span>{t.trips.destinationsSection}</span>
              </label>
              <Badge variant="sand">{stops.length}</Badge>
            </div>
            <p className="text-[11px] text-navy/60">
              {lang === 'he'
                ? `טווח תאריכי היעדים מוגבל אוטומטית לטווח החופשה (${formatShortDate(startDate, lang)} – ${formatShortDate(endDate, lang)})`
                : `Stop dates are constrained to your trip range (${formatShortDate(startDate, lang)} – ${formatShortDate(endDate, lang)})`}
            </p>

            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="p-3 rounded-xl bg-surface border border-navy/10 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sand">
                      {lang === 'he' ? `יעד #${index + 1}` : `Stop #${index + 1}`}
                    </span>
                    {stops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(stop.id)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      label={t.trips.destination}
                      required
                      value={stop.city}
                      onChange={(e) => handleUpdateStop(stop.id, 'city', e.target.value)}
                      placeholder={
                        index === 0
                          ? lang === 'he'
                            ? 'קרקוב'
                            : 'Krakow'
                          : lang === 'he'
                            ? 'בודפשט'
                            : 'Budapest'
                      }
                    />
                    <Input
                      label={t.trips.country}
                      required
                      value={stop.country}
                      onChange={(e) => handleUpdateStop(stop.id, 'country', e.target.value)}
                      placeholder={
                        index === 0
                          ? lang === 'he'
                            ? 'פולין'
                            : 'Poland'
                          : lang === 'he'
                            ? 'הונגריה'
                            : 'Hungary'
                      }
                    />
                  </div>

                  {stops.length > 1 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        type="date"
                        label={t.trips.stopStartDate}
                        min={startDate}
                        max={endDate}
                        value={stop.start_date || startDate}
                        onChange={(e) =>
                          handleUpdateStop(stop.id, 'start_date', e.target.value)
                        }
                      />
                      <Input
                        type="date"
                        label={t.trips.stopEndDate}
                        min={stop.start_date || startDate}
                        max={endDate}
                        value={stop.end_date || endDate}
                        onChange={(e) =>
                          handleUpdateStop(stop.id, 'end_date', e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed border-sand text-navy hover:bg-sand/10"
              onClick={handleAddStop}
            >
              <Plus className="w-4 h-4 text-sand" />
              <span>{t.trips.addDestinationStop}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.currency}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {lang === 'he' ? c.labelHe : c.labelEn}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              label={t.trips.plannedBudget}
              required
              value={plannedBudget}
              onChange={(e) => setPlannedBudget(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.status}
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
            >
              {TRIP_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.trips.statuses[st]}
                </option>
              ))}
            </Select>
            <Select
              label={t.trips.timezone}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>

          {/* Cover Image Upload (Direct Photo Upload Only) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-ivory/70 border border-sand/25">
            <label className="text-xs font-bold text-navy flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4 text-sand" />
              <span>{lang === 'he' ? 'תמונת נושא לטיול' : 'Trip Cover Photo'}</span>
            </label>

            {coverPreviewUrl ? (
              <div className="relative h-36 rounded-2xl overflow-hidden border border-sand/30 shadow-sm group">
                <img
                  src={coverPreviewUrl}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/65 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md text-navy text-xs font-bold shadow-sm hover:bg-surface transition-colors">
                    <ImagePlus className="w-3.5 h-3.5 text-sand" />
                    <span>{lang === 'he' ? 'החלפת תמונה' : 'Change Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverFileSelect(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverImage('');
                      setCoverPreviewUrl(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-navy/80 backdrop-blur-md text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'he' ? 'הסרה' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border-2 border-dashed border-sand/45 bg-surface/80 hover:bg-sand/10 hover:border-sand transition-all text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-sand/15 text-sand flex items-center justify-center">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-navy">
                    {lang === 'he' ? 'לחצו להעלאת תמונת נושא מהגלריה' : 'Tap to upload a cover photo'}
                  </div>
                  <div className="text-[11px] text-navy/55 mt-0.5">
                    {lang === 'he' ? 'JPG, PNG, WEBP, HEIC • דחיסה אוטומטית מהירה' : 'JPG, PNG, WEBP, HEIC • Auto-compressed'}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <Textarea
            label={t.trips.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t.common.loading : t.common.save}
            </Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(tripToDelete)}
        onClose={() => setTripToDelete(null)}
        onConfirm={() => {
          if (tripToDelete) {
            deleteTrip(tripToDelete.id);
            notify(lang === 'he' ? 'הטיול נמחק לצמיתות' : 'Trip deleted', 'info');
          }
        }}
        title={t.trips.deleteConfirmTitle}
        description={t.trips.deleteConfirmDesc}
      />
    </div>
  );
};
