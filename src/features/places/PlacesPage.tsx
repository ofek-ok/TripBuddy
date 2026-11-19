import React, { useState } from 'react';
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
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Place, PlaceVisitStatus } from '@/types/database.types';
import { CalendarPlus, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';

const VISIT_STATUSES: PlaceVisitStatus[] = ['Want to Visit', 'Planned', 'Visited'];

export const PlacesPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    activeDays,
    activePlaces,
    createPlace,
    updatePlace,
    deletePlace,
    convertPlaceToItineraryEvent,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  // Place to Itinerary modal
  const [placeToSchedule, setPlaceToSchedule] = useState<Place | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('11:00');

  // Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Attraction');
  const [address, setAddress] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [rating, setRating] = useState('5');
  const [visitStatus, setVisitStatus] = useState<PlaceVisitStatus>('Want to Visit');
  const [notes, setNotes] = useState('');

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const filteredPlaces = activePlaces.filter((pl) =>
    statusFilter === 'ALL' ? true : pl.visit_status === statusFilter
  );

  const openCreatePlaceModal = () => {
    setEditingPlace(null);
    setName('');
    setCategory('Attraction');
    setAddress('');
    setEstimatedCost('');
    setRating('5');
    setVisitStatus('Want to Visit');
    setNotes('');
    setModalOpen(true);
  };

  const openEditPlaceModal = (pl: Place) => {
    setEditingPlace(pl);
    setName(pl.name);
    setCategory(pl.category);
    setAddress(pl.address || '');
    setEstimatedCost(pl.estimated_cost !== null ? String(pl.estimated_cost) : '');
    setRating(pl.rating !== null ? String(pl.rating) : '5');
    setVisitStatus(pl.visit_status);
    setNotes(pl.notes || '');
    setModalOpen(true);
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        category,
        address: address.trim() || null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        rating: rating ? Number(rating) : null,
        notes: notes.trim() || null,
        visit_status: visitStatus,
      };
      if (editingPlace) {
        await updatePlace(editingPlace.id, payload);
        notify(lang === 'he' ? 'המקום עודכן בהצלחה!' : 'Place updated!', 'success');
      } else {
        await createPlace({
          trip_id: activeTrip.id,
          ...payload,
          latitude: null,
          longitude: null,
          image_url: null,
          currency: activeTrip.currency,
        });
        notify(lang === 'he' ? 'המקום נשמר ברשימה!' : 'Place saved to wishlist!', 'success');
      }
      setModalOpen(false);
      setEditingPlace(null);
      setName('');
      setAddress('');
      setEstimatedCost('');
      setNotes('');
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.places.title}</h1>
          <p className="text-xs text-navy/65">{activeTrip.name}</p>
        </div>
        <Button onClick={openCreatePlaceModal}>
          <Plus className="w-4 h-4" />
          <span>{t.places.addPlace}</span>
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${
            statusFilter === 'ALL'
              ? 'bg-navy text-white'
              : 'bg-surface text-navy border border-navy/10'
          }`}
        >
          {t.common.all} ({activePlaces.length})
        </button>
        {VISIT_STATUSES.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              statusFilter === st
                ? 'bg-navy text-white'
                : 'bg-surface text-navy border border-navy/10'
            }`}
          >
            {t.places.statuses[st]}
          </button>
        ))}
      </div>

      {/* Places Grid */}
      {filteredPlaces.length === 0 ? (
        <Card className="p-8 text-center text-sm text-navy/60">
          {lang === 'he' ? 'אין מקומות שמורים עדיין' : 'No saved places yet'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlaces.map((pl) => (
            <Card key={pl.id} className="space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="sage">{pl.category}</Badge>
                  <Select
                    className="h-7 w-auto text-xs py-0 px-2"
                    value={pl.visit_status}
                    onChange={(e) =>
                      updatePlace(pl.id, {
                        visit_status: e.target.value as PlaceVisitStatus,
                      })
                    }
                  >
                    {VISIT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t.places.statuses[st]}
                      </option>
                    ))}
                  </Select>
                </div>

                <h3 className="font-bold text-base text-navy">{pl.name}</h3>
                {pl.address && (
                  <p className="text-xs text-navy/65 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sand" />
                    <span>{pl.address}</span>
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs pt-1">
                  {pl.rating && (
                    <span className="flex items-center gap-1 font-bold text-sand-dark">
                      <Star className="w-3.5 h-3.5 fill-sand text-sand" />
                      {pl.rating}
                    </span>
                  )}
                  {pl.estimated_cost !== null && pl.estimated_cost > 0 && (
                    <span className="font-semibold text-navy">
                      {formatCurrency(
                        pl.estimated_cost,
                        pl.currency || activeTrip.currency,
                        lang
                      )}
                    </span>
                  )}
                </div>
                {pl.notes && <p className="text-xs text-navy/70">{pl.notes}</p>}
              </div>

              <div className="pt-2.5 border-t border-navy/10 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="sand"
                  onClick={() => {
                    setPlaceToSchedule(pl);
                    setSelectedDayId(activeDays[0]?.id || '');
                  }}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>{t.places.sendToItinerary}</span>
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-navy/70"
                    onClick={() => openEditPlaceModal(pl)}
                    title={t.common.edit}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deletePlace(pl.id)}
                    title={t.common.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Place Modal */}
      <ModalDrawer
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlace(null);
        }}
        title={
          editingPlace
            ? lang === 'he'
              ? 'עריכת מקום'
              : 'Edit Place'
            : t.places.addPlace
        }
      >
        <form onSubmit={handleSavePlace} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'שם המקום' : 'Place Name'}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: מזרקת טרווי / גלריית אופיצי' : 'e.g., Trevi Fountain'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.category}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Attraction">{t.itinerary.categories.Attraction}</option>
              <option value="Restaurant">{t.itinerary.categories.Restaurant}</option>
              <option value="Shopping">{t.itinerary.categories.Shopping}</option>
              <option value="Hotel">{t.itinerary.categories.Hotel}</option>
              <option value="Activity">{t.itinerary.categories.Activity}</option>
            </Select>
            <Select
              label={t.common.status}
              value={visitStatus}
              onChange={(e) => setVisitStatus(e.target.value as PlaceVisitStatus)}
            >
              {VISIT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.places.statuses[st]}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label={t.itinerary.address}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              step="0.01"
              label={t.itinerary.estimatedCost}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
            <Input
              type="number"
              min="1"
              max="5"
              step="0.5"
              label={t.places.rating}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>
          <Textarea
            label={t.common.notes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" className="w-full">
            {t.common.save}
          </Button>
        </form>
      </ModalDrawer>

      {/* Convert Saved Place to Daily Itinerary Event Modal */}
      <ModalDrawer
        open={Boolean(placeToSchedule)}
        onClose={() => setPlaceToSchedule(null)}
        title={t.places.sendToItinerary}
      >
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-navy">{placeToSchedule?.name}</p>
          <Select
            label={t.itinerary.day}
            value={selectedDayId}
            onChange={(e) => setSelectedDayId(e.target.value)}
          >
            {activeDays.map((d) => (
              <option key={d.id} value={d.id}>
                {t.itinerary.day} {d.day_number} ({formatDate(d.date, lang)})
              </option>
            ))}
          </Select>
          <Input
            type="time"
            label={t.itinerary.startTime}
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={async () => {
              if (placeToSchedule && selectedDayId) {
                await convertPlaceToItineraryEvent(
                  placeToSchedule.id,
                  selectedDayId,
                  scheduleTime
                );
                setPlaceToSchedule(null);
                notify(
                  lang === 'he'
                    ? 'המקום שובץ במסלול היומי בהצלחה!'
                    : 'Place added to daily itinerary!',
                  'success'
                );
              }
            }}
          >
            {t.common.confirm}
          </Button>
        </div>
      </ModalDrawer>
    </div>
  );
};
