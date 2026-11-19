import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { Card } from '@/components/ui/primitives';
import {
  ChevronLeft,
  ChevronRight,
  FolderLock,
  HeartHandshake,
  ListChecks,
  MapPin,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export const MoreHubPage: React.FC = () => {
  const { lang, dir, t } = useI18n();
  const {
    activeDocuments,
    activeTasks,
    activePackingItems,
    activePlaces,
    activeMemories,
    coupleMembers,
  } = useAppStore();
  const navigate = useNavigate();

  const ArrowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const modules = [
    {
      to: '/documents',
      title: t.nav.documents,
      subtitle:
        lang === 'he'
          ? 'כרטיסי טיסה, הזמנות מלון, ביטוח, דרכונים וקבלות בכספת מאובטחת'
          : 'Boarding passes, hotel vouchers, insurance & passports in a private vault',
      count: activeDocuments.length,
      icon: FolderLock,
      color: 'bg-navy text-white',
    },
    {
      to: '/tasks',
      title: t.nav.tasks,
      subtitle:
        lang === 'he'
          ? 'משימות הכנה משותפות, תאריכי יעד ושיוך לבן/בת הזוג'
          : 'Shared preparation tasks, due dates and partner assignments',
      count: activeTasks.length,
      icon: ListChecks,
      color: 'bg-sage/30 text-navy',
    },
    {
      to: '/lists',
      title: t.nav.lists,
      subtitle:
        lang === 'he'
          ? 'רשימות קניות ורשימת אריזה חכמה עם תבניות רב-פעמיות'
          : 'Shopping lists and smart packing checklists with reusable templates',
      count: activePackingItems.length,
      icon: ShoppingBag,
      color: 'bg-sand/25 text-navy',
    },
    {
      to: '/places',
      title: t.nav.places,
      subtitle:
        lang === 'he'
          ? 'מסעדות, אטרקציות ומקומות שמורים עם העברה ישירה למסלול היומי'
          : 'Saved restaurants & attractions with one-click scheduling into itinerary',
      count: activePlaces.length,
      icon: MapPin,
      color: 'bg-navy/10 text-navy',
    },
    {
      to: '/memories',
      title: t.nav.memories,
      subtitle:
        lang === 'he'
          ? 'גלריית תמונות, דירוג חוויות וסיכום החופשה הזוגית'
          : 'Photo gallery, experience ratings and couple trip summary',
      count: activeMemories.length,
      icon: Sparkles,
      color: 'bg-sand text-white',
    },
    {
      to: '/workspace',
      title: t.nav.settings,
      subtitle:
        lang === 'he'
          ? 'ניהול סביבת העבודה הזוגית, קוד הזמנה לבן/בת הזוג והגדרות חשבון'
          : 'Couple workspace settings, partner invite code and account preferences',
      count: coupleMembers.length,
      icon: HeartHandshake,
      color: 'bg-sage text-navy',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t.nav.more}</h1>
        <p className="text-xs text-navy/65">{t.tagline}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.to}
              onClick={() => navigate(mod.to)}
              className="p-4 flex items-center justify-between gap-3.5 cursor-pointer hover:border-sand transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${mod.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-navy">{mod.title}</h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-ivory text-navy/70">
                      {mod.count}
                    </span>
                  </div>
                  <p className="text-xs text-navy/65 mt-0.5 line-clamp-2">{mod.subtitle}</p>
                </div>
              </div>
              <ArrowIcon className="w-4 h-4 text-navy/40 shrink-0" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
