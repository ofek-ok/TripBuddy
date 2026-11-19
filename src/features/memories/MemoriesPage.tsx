import React, { useEffect, useState } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalDrawer,
  Textarea,
} from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils/formatters';
import { MapPin, Plus, Sparkles, Star, Trash2 } from 'lucide-react';

export const MemoriesPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    activeMemories,
    createMemory,
    getMemoryImageUrl,
    deleteMemory,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState('5');
  const [memoryDate, setMemoryDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function resolveImages() {
      const nextMap: Record<string, string> = {};
      for (const mem of activeMemories) {
        if (mem.image_path) {
          try {
            nextMap[mem.id] = await getMemoryImageUrl(mem.image_path);
          } catch {
            // ignore missing blob
          }
        }
      }
      if (mounted) setSignedUrls(nextMap);
    }
    resolveImages();
    return () => {
      mounted = false;
    };
  }, [activeMemories, getMemoryImageUrl]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMemory(
        {
          trip_id: activeTrip.id,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          rating: rating ? Number(rating) : 5,
          memory_date: memoryDate,
        },
        imageFile
      );
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setImageFile(null);
      notify(lang === 'he' ? 'הזיכרון נשמר באלבום הטיול!' : 'Memory saved!', 'success');
    } catch (err) {
      handleError(err);
    }
  };

  const averageRating =
    activeMemories.length > 0
      ? (
          activeMemories.reduce((sum, m) => sum + (m.rating || 5), 0) /
          activeMemories.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.memories.title}</h1>
          <p className="text-xs text-navy/65">{activeTrip.name}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>{t.memories.addMemory}</span>
        </Button>
      </div>

      {/* Trip Summary Banner */}
      <Card className="bg-gradient-to-r from-navy to-navy-light text-white border-0 flex items-center justify-between p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sand text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{t.memories.tripSummary}</span>
          </div>
          <h2 className="text-lg font-bold">
            {activeTrip.name} • {activeTrip.destination}
          </h2>
          <p className="text-xs text-ivory/75">
            {activeMemories.length} {lang === 'he' ? 'רגעים מתועדים' : 'captured memories'}
          </p>
        </div>
        {averageRating && (
          <div className="text-center bg-white/10 px-4 py-2.5 rounded-2xl">
            <div className="flex items-center gap-1 text-sand font-bold text-lg">
              <Star className="w-4 h-4 fill-sand" />
              <span>{averageRating}</span>
            </div>
            <div className="text-[10px] text-ivory/70">{t.places.rating}</div>
          </div>
        )}
      </Card>

      {/* Memories Gallery */}
      {activeMemories.length === 0 ? (
        <Card className="p-8 text-center text-sm text-navy/60">
          {lang === 'he'
            ? 'הוסיפו תמונות וחוויות כדי לבנות את אלבום הזיכרונות של הטיול'
            : 'Add photos and stories to build your trip memory album'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMemories.map((mem) => (
            <Card key={mem.id} className="overflow-hidden p-0 flex flex-col justify-between">
              {signedUrls[mem.id] && (
                <img
                  src={signedUrls[mem.id]}
                  alt={mem.title}
                  className="w-full h-52 object-cover"
                />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="sand">{formatDate(mem.memory_date, lang)}</Badge>
                  {mem.rating && (
                    <span className="flex items-center gap-1 text-xs font-bold text-sand-dark">
                      <Star className="w-3.5 h-3.5 fill-sand text-sand" />
                      {mem.rating}/5
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-navy">{mem.title}</h3>
                {mem.location && (
                  <p className="text-xs text-navy/60 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sand" />
                    <span>{mem.location}</span>
                  </p>
                )}
                {mem.description && (
                  <p className="text-xs text-navy/75 leading-relaxed">{mem.description}</p>
                )}
                <div className="pt-2 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteMemory(mem)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Memory Drawer */}
      <ModalDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.memories.addMemory}
      >
        <form onSubmit={handleSaveMemory} className="space-y-3.5">
          <Input
            label={lang === 'he' ? 'כותרת החוויה / הזיכרון' : 'Memory Title'}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: שקיעה מרהיבה מעל פירנצה' : 'e.g., Sunset over Piazzale Michelangelo'}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t.itinerary.location}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              type="date"
              label={t.common.date}
              value={memoryDate}
              onChange={(e) => setMemoryDate(e.target.value)}
            />
          </div>
          <Input
            type="number"
            min="1"
            max="5"
            label={`${t.places.rating} (1-5)`}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">
              {lang === 'he' ? 'תמונה (אופציונלי)' : 'Photo (Optional)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-navy file:me-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white"
            />
          </div>
          <Textarea
            label={t.common.notes}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" className="w-full">
            {t.common.save}
          </Button>
        </form>
      </ModalDrawer>
    </div>
  );
};
