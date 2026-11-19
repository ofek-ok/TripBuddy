import React, { useEffect, useMemo, useState } from 'react';
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
import {
  CURRENCIES,
  formatCurrency,
  formatDate,
  formatDateWithWeekday,
} from '@/lib/utils/formatters';
import {
  CurrencyCode,
  EventCategory,
  EventStatus,
  ItineraryEvent,
} from '@/types/database.types';
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  MapPin,
  MoveRight,
  Plane,
  Plus,
  Receipt,
  Ticket,
  Trash2,
} from 'lucide-react';

const EVENT_CATEGORIES: EventCategory[] = [
  'Flight',
  'Hotel',
  'Restaurant',
  'Attraction',
  'Transportation',
  'Shopping',
  'Activity',
  'Other',
];

const EVENT_STATUSES: EventStatus[] = ['Planned', 'Booked', 'Completed', 'Cancelled'];

export const ItineraryPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    activeDays,
    activeEvents,
    updateDay,
    addDay,
    createEvent,
    updateEvent,
    deleteEvent,
    reorderEvent,
    moveEventToDay,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayLocation, setDayLocation] = useState('');
  const [dayNotes, setDayNotes] = useState('');

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [moveModalEvent, setMoveModalEvent] = useState<ItineraryEvent | null>(null);
  const [targetMoveDayId, setTargetMoveDayId] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Event Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Attraction');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('11:30');
  const [address, setAddress] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(activeTrip?.currency || 'EUR');
  const [bookingUrl, setBookingUrl] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<EventStatus>('Planned');

  useEffect(() => {
    if (searchParams.get('action') === 'new' && activeTrip) {
      openCreateEvent();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, activeTrip]);

  useEffect(() => {
    if (activeDays.length > 0 && !activeDays.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(activeDays[0].id);
    }
  }, [activeDays, selectedDayId]);

  const selectedDay = activeDays.find((d) => d.id === selectedDayId) || activeDays[0];

  // Hourly chronological sort for timeline view
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return activeEvents
      .filter((e) => e.day_id === selectedDay.id)
      .sort((a, b) => {
        const timeA = a.start_time || '99:99';
        const timeB = b.start_time || '99:99';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return a.sort_order - b.sort_order;
      });
  }, [activeEvents, selectedDay]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const openEditDayModal = () => {
    if (!selectedDay) return;
    setDayLocation(selectedDay.location || '');
    setDayNotes(selectedDay.notes || '');
    setDayModalOpen(true);
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    try {
      await updateDay(selectedDay.id, {
        location: dayLocation.trim() || null,
        notes: dayNotes.trim() || null,
      });
      setDayModalOpen(false);
      notify(lang === 'he' ? 'פרטי היום עודכנו' : 'Day details updated', 'success');
    } catch (err) {
      handleError(err);
    }
  };

  function openCreateEvent() {
    setEditingEvent(null);
    setTitle('');
    setCategory('Attraction');
    setStartTime('10:00');
    setEndTime('12:00');
    setAddress('');
    setEstimatedCost('');
    setCurrency(activeTrip?.currency || 'EUR');
    setBookingUrl('');
    setFlightNumber('');
    setConfirmationCode('');
    setNotes('');
    setStatus('Planned');
    setEventModalOpen(true);
  }

  const openEditEvent = (ev: ItineraryEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setCategory(ev.category);
    setStartTime(ev.start_time ? ev.start_time.slice(0, 5) : '');
    setEndTime(ev.end_time ? ev.end_time.slice(0, 5) : '');
    setAddress(ev.address || '');
    setEstimatedCost(ev.estimated_cost !== null ? String(ev.estimated_cost) : '');
    setCurrency(ev.currency || activeTrip.currency);
    setBookingUrl(ev.booking_url || '');
    setFlightNumber(ev.flight_number || '');
    setConfirmationCode(ev.confirmation_code || '');
    setNotes(ev.notes || '');
    setStatus(ev.status);
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    try {
      const costVal = estimatedCost ? Number(estimatedCost) : null;
      const payload = {
        day_id: editingEvent ? editingEvent.day_id : selectedDay.id,
        trip_id: activeTrip.id,
        title: title.trim(),
        category,
        start_time: startTime || null,
        end_time: endTime || null,
        address: address.trim() || null,
        latitude: editingEvent?.latitude ?? null,
        longitude: editingEvent?.longitude ?? null,
        estimated_cost: costVal,
        currency,
        booking_url: bookingUrl.trim() || null,
        flight_number: flightNumber.trim() || null,
        confirmation_code: confirmationCode.trim() || null,
        notes: notes.trim() || null,
        status,
        source_place_id: editingEvent?.source_place_id || null,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
      } else {
        await createEvent(payload);
      }

      if (status === 'Booked' && costVal && costVal > 0) {
        notify(
          lang === 'he'
            ? 'הפעילות נשמרה והמחיר נמשך אוטומטית למסך ההוצאות!'
            : 'Saved & automatically synced to Budget Expenses!',
          'success'
        );
      } else {
        notify(
          editingEvent
            ? lang === 'he'
              ? 'הפעילות עודכנה'
              : 'Activity updated'
            : lang === 'he'
              ? 'הפעילות נוספה ללו״ז'
              : 'Activity added',
          'success'
        );
      }
      setEventModalOpen(false);
    } catch (err) {
      handleError(err);
    }
  };

  const getGoogleMapsUrl = (ev: ItineraryEvent) => {
    if (ev.latitude !== null && ev.longitude !== null) {
      return `https://www.google.com/maps/search/?api=1&query=${ev.latitude},${ev.longitude}`;
    }
    const query = encodeURIComponent(
      `${ev.title} ${ev.address || selectedDay?.location || activeTrip.destination}`
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    notify(lang === 'he' ? `הועתק: ${txt}` : `Copied: ${txt}`, 'info');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">{t.itinerary.title}</h1>
        <p className="text-xs text-navy/65">
          {activeTrip.name} • {activeDays.length}{' '}
          {lang === 'he' ? 'ימים • לו״ז מסודר לפי שעות' : 'days • Hourly Timeline'}
        </p>
      </div>

      {/* Sticky Action Bar (Add Day + Add Activity stay pinned while scrolling) */}
      <div className="sticky top-[62px] z-20 -mx-1 px-2.5 py-2 rounded-2xl bg-surface/92 backdrop-blur-md border border-sand/25 shadow-soft flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-navy/80 truncate ps-1">
          {selectedDay
            ? `${t.itinerary.day} ${selectedDay.day_number} • ${formatDateWithWeekday(selectedDay.date, lang)}`
            : activeTrip.name}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={addDay}>
            <CalendarPlus className="w-4 h-4" />
            <span>{t.itinerary.addDay}</span>
          </Button>
          <Button size="sm" onClick={openCreateEvent}>
            <Plus className="w-4 h-4" />
            <span>{t.itinerary.addEvent}</span>
          </Button>
        </div>
      </div>

      {/* Horizontal Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
        {activeDays.map((day) => {
          const isSelected = selectedDay?.id === day.id;
          const count = activeEvents.filter((e) => e.day_id === day.id).length;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`px-4 py-2.5 rounded-2xl border text-start shrink-0 transition-all ${
                isSelected
                  ? 'bg-navy text-white border-navy shadow-sm'
                  : 'bg-surface text-navy border-navy/10 hover:bg-ivory'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold">
                  {t.itinerary.day} {day.day_number}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-sand text-white' : 'bg-ivory text-navy/70'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isSelected ? 'text-ivory/85' : 'text-navy/60'
                }`}
              >
                {formatDateWithWeekday(day.date, lang)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Header Card */}
      {selectedDay && (
        <Card className="bg-gradient-to-r from-surface to-ivory/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="navy">
                {t.itinerary.day} {selectedDay.day_number}
              </Badge>
              <span className="text-sm font-bold text-navy">
                {formatDateWithWeekday(selectedDay.date, lang)}
              </span>
              {selectedDay.location && (
                <span className="text-xs text-sand font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedDay.location}
                </span>
              )}
            </div>
            {selectedDay.notes && (
              <p className="text-xs text-navy/70">{selectedDay.notes}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={openEditDayModal}>
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t.common.edit}</span>
          </Button>
        </Card>
      )}

      {/* Hourly Timeline Schedule */}
      {dayEvents.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-navy">
            {lang === 'he'
              ? 'טרם נוספו פעילויות ליום זה'
              : 'No activities scheduled for this day yet'}
          </p>
          <Button variant="sand" size="sm" onClick={openCreateEvent}>
            <Plus className="w-4 h-4" />
            <span>{t.itinerary.addEvent}</span>
          </Button>
        </Card>
      ) : (
        <div className="relative space-y-3">
          {dayEvents.map((ev, idx) => (
            <div key={ev.id} className="flex items-stretch gap-3 sm:gap-4">
              {/* Left/Start Hourly Time Column */}
              <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center pt-3">
                <div className="px-2 py-1 rounded-xl bg-navy text-white text-xs font-bold font-mono tracking-tight shadow-xs">
                  {ev.start_time ? ev.start_time.slice(0, 5) : '--:--'}
                </div>
                {ev.end_time && (
                  <div className="text-[10px] font-mono text-navy/55 mt-1">
                    {ev.end_time.slice(0, 5)}
                  </div>
                )}
                {idx < dayEvents.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-sand/60 to-navy/15 my-2 rounded-full min-h-[24px]" />
                )}
              </div>

              {/* Event Card */}
              <Card className="flex-1 space-y-3 hover:border-sand/50 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={ev.category === 'Flight' ? 'navy' : 'sage'}>
                        {ev.category === 'Flight' && <Plane className="w-3 h-3 me-1" />}
                        {t.itinerary.categories[ev.category]}
                      </Badge>
                      <Badge
                        variant={
                          ev.status === 'Booked'
                            ? 'sand'
                            : ev.status === 'Completed'
                              ? 'sage'
                              : 'ivory'
                        }
                      >
                        {ev.status}
                        {ev.status === 'Booked' && ev.estimated_cost && ev.estimated_cost > 0
                          ? lang === 'he'
                            ? ' • סונכרן להוצאות'
                            : ' • In Budget'
                          : ''}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-navy">{ev.title}</h3>

                    {/* Dedicated Flight Number & Confirmation Code Badges */}
                    {(ev.flight_number || ev.confirmation_code) && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {ev.flight_number && (
                          <button
                            type="button"
                            onClick={() => copyText(ev.flight_number!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-navy/10 text-navy text-xs font-bold hover:bg-navy/15"
                          >
                            <Plane className="w-3.5 h-3.5 text-sand" />
                            <span>
                              {lang === 'he' ? 'טיסה' : 'Flight'}:{' '}
                              <span className="font-mono">{ev.flight_number}</span>
                            </span>
                            <Copy className="w-3 h-3 opacity-60" />
                          </button>
                        )}
                        {ev.confirmation_code && (
                          <button
                            type="button"
                            onClick={() => copyText(ev.confirmation_code!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sand/20 text-navy text-xs font-bold hover:bg-sand/30"
                          >
                            <Ticket className="w-3.5 h-3.5 text-sand-dark" />
                            <span>
                              {lang === 'he' ? 'מס׳ אישור' : 'Conf #'}:{' '}
                              <span className="font-mono">{ev.confirmation_code}</span>
                            </span>
                            <Copy className="w-3 h-3 opacity-60" />
                          </button>
                        )}
                      </div>
                    )}

                    {ev.address && (
                      <p className="text-xs text-navy/65 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sand shrink-0" />
                        <span>{ev.address}</span>
                      </p>
                    )}
                    {ev.notes && <p className="text-xs text-navy/70 pt-0.5">{ev.notes}</p>}
                  </div>

                  {ev.estimated_cost !== null && ev.estimated_cost > 0 && (
                    <div className="text-end shrink-0">
                      <div className="text-sm font-bold text-navy">
                        {formatCurrency(
                          ev.estimated_cost,
                          ev.currency || activeTrip.currency,
                          lang
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-2.5 border-t border-navy/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <a
                      href={getGoogleMapsUrl(ev)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sand hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t.itinerary.openInMaps}</span>
                    </a>
                    {ev.booking_url && (
                      <a
                        href={ev.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy/75 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Booking</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => reorderEvent(ev.id, 'up')}
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === dayEvents.length - 1}
                      onClick={() => reorderEvent(ev.id, 'down')}
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setMoveModalEvent(ev);
                        setTargetMoveDayId(ev.day_id);
                      }}
                      title={t.itinerary.moveDay}
                    >
                      <MoveRight className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditEvent(ev)}
                      title={t.common.edit}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteEvent(ev.id)}
                      title={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Day Edit Drawer */}
      <ModalDrawer
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={`${t.itinerary.day} ${selectedDay?.day_number || ''}`}
      >
        <form onSubmit={handleSaveDay} className="space-y-4">
          <Input
            label={t.itinerary.location}
            value={dayLocation}
            onChange={(e) => setDayLocation(e.target.value)}
          />
          <Textarea
            label={t.itinerary.dayNotes}
            value={dayNotes}
            onChange={(e) => setDayNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDayModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Event Create/Edit Drawer */}
      <ModalDrawer
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? t.itinerary.editEvent : t.itinerary.addEvent}
      >
        <form onSubmit={handleSaveEvent} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'שם הפעילות / האירוע' : 'Event Title'}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: טיסה תל אביב → קרקוב' : 'e.g., Flight TLV → KRK'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.category}
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            >
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.itinerary.categories[cat]}
                </option>
              ))}
            </Select>
            <Select
              label={t.common.status}
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              {EVENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </div>

          {/* Dedicated Flight Number & Confirmation Number Fields */}
          {(category === 'Flight' ||
            category === 'Hotel' ||
            category === 'Transportation' ||
            category === 'Attraction' ||
            flightNumber ||
            confirmationCode) && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-ivory/80 border border-sand/30">
              {category === 'Flight' && (
                <Input
                  label={lang === 'he' ? 'מספר טיסה' : 'Flight Number'}
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="LY353 / FR4012"
                />
              )}
              <div className={category === 'Flight' ? '' : 'col-span-2'}>
                <Input
                  label={lang === 'he' ? 'מספר אישור / הזמנה (PNR)' : 'Confirmation / Booking #'}
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="X9K2LP"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label={t.itinerary.startTime}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              type="time"
              label={t.itinerary.endTime}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Input
            label={t.itinerary.address}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Piazza del Colosseo, 1, Rome"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              label={t.itinerary.estimatedCost}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
            <Select
              label={t.common.currency}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>

          {status === 'Booked' && Number(estimatedCost) > 0 && (
            <div className="p-2.5 rounded-xl bg-sage/20 border border-sage/40 text-xs text-navy font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sage-dark shrink-0" />
              <span>
                {lang === 'he'
                  ? 'סטטוס Booked: הסכום יימשך אוטומטית למסך התקציב וההוצאות!'
                  : 'Status is Booked: This cost will automatically sync to Budget Expenses!'}
              </span>
            </div>
          )}

          <Input
            type="url"
            label={t.itinerary.bookingUrl}
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            placeholder="https://..."
          />

          <Textarea
            label={t.common.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEventModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Move Event Between Days Drawer */}
      <ModalDrawer
        open={Boolean(moveModalEvent)}
        onClose={() => setMoveModalEvent(null)}
        title={t.itinerary.moveDay}
      >
        <div className="space-y-4">
          <Select
            label={t.itinerary.day}
            value={targetMoveDayId}
            onChange={(e) => setTargetMoveDayId(e.target.value)}
          >
            {activeDays.map((d) => (
              <option key={d.id} value={d.id}>
                {t.itinerary.day} {d.day_number} ({formatDateWithWeekday(d.date, lang)})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMoveModalEvent(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={async () => {
                if (moveModalEvent && targetMoveDayId) {
                  await moveEventToDay(moveModalEvent.id, targetMoveDayId);
                  setSelectedDayId(targetMoveDayId);
                  setMoveModalEvent(null);
                  notify(
                    lang === 'he' ? 'הפעילות הועברה ליום הנבחר' : 'Moved to selected day',
                    'success'
                  );
                }
              }}
            >
              {t.common.confirm}
            </Button>
          </div>
        </div>
      </ModalDrawer>
    </div>
  );
};
