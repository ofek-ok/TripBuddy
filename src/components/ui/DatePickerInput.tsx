import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HE_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const EN_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseIsoDate(str: string | undefined): { y: number; m: number; d: number } | null {
  if (!str) return null;
  const parts = str.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return { y: parts[0], m: parts[1] - 1, d: parts[2] };
}

function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplayDate(str: string, isHe: boolean): string {
  const p = parseIsoDate(str);
  if (!p) return '';
  if (isHe) {
    return `${String(p.d).padStart(2, '0')}/${String(p.m + 1).padStart(2, '0')}/${p.y}`;
  }
  return `${String(p.d).padStart(2, '0')} ${EN_MONTHS[p.m].slice(0, 3)} ${p.y}`;
}

interface DatePickerInputProps {
  value: string;
  onChange?: (nextIso: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  min,
  max,
  disabled,
  required,
  className,
  error,
}) => {
  const isHe = typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : true;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialParsed = parseIsoDate(value) || parseIsoDate(min) || {
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
    d: new Date().getDate(),
  };

  const [viewYear, setViewYear] = useState(initialParsed.y);
  const [viewMonth, setViewMonth] = useState(initialParsed.m);

  useEffect(() => {
    const p = parseIsoDate(value);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const todayIso = toIsoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const isDateDisabled = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const selectDate = (iso: string) => {
    if (isDateDisabled(iso)) return;
    onChange?.(iso);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden native input for HTML5 required validation */}
      {required && (
        <input
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          required
          className="sr-only"
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full h-11 px-3.5 rounded-xl bg-ivory/60 border border-navy/15 text-navy text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-surface transition-all',
          error && 'border-red-500 focus:ring-red-200',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
      >
        <span className={value ? 'font-medium text-navy' : 'text-navy/40'}>
          {value
            ? formatDisplayDate(value, isHe)
            : isHe
              ? 'בחירת תאריך'
              : 'Select date'}
        </span>
        <Calendar className="w-4 h-4 text-sand shrink-0" />
      </button>

      {open && (
        <div className="absolute start-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-surface border border-sand/30 shadow-xl p-3 space-y-2.5">
          {/* Month & Year Navigation — Clear, Intuitive Previous / Next */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={goPrevMonth}
              title={isHe ? 'חודש קודם' : 'Previous month'}
              className="h-8 px-2 rounded-xl bg-ivory hover:bg-sand/20 text-navy flex items-center gap-0.5 text-[11px] font-bold transition-colors"
            >
              {isHe ? <ChevronRight className="w-4 h-4 text-sand" /> : <ChevronLeft className="w-4 h-4 text-sand" />}
              <span>{isHe ? 'קודם' : 'Prev'}</span>
            </button>

            <div className="text-xs font-extrabold text-navy text-center">
              {(isHe ? HE_MONTHS : EN_MONTHS)[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              title={isHe ? 'חודש הבא' : 'Next month'}
              className="h-8 px-2 rounded-xl bg-ivory hover:bg-sand/20 text-navy flex items-center gap-0.5 text-[11px] font-bold transition-colors"
            >
              <span>{isHe ? 'הבא' : 'Next'}</span>
              {isHe ? <ChevronLeft className="w-4 h-4 text-sand" /> : <ChevronRight className="w-4 h-4 text-sand" />}
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {(isHe ? HE_DAYS : EN_DAYS).map((d) => (
              <div key={d} className="text-[10px] font-bold text-navy/50 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const iso = toIsoDate(viewYear, viewMonth, day);
              const isSelected = value === iso;
              const isToday = iso === todayIso;
              const isDisabled = isDateDisabled(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(iso)}
                  className={cn(
                    'h-8 rounded-xl text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-sand text-white font-bold shadow-xs'
                      : isToday
                        ? 'bg-navy/10 text-navy font-bold ring-1 ring-sand/60'
                        : 'text-navy hover:bg-ivory',
                    isDisabled && 'opacity-25 pointer-events-none'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer: Today + Clear */}
          <div className="pt-2 border-t border-navy/10 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={isDateDisabled(todayIso)}
              onClick={() => selectDate(todayIso)}
              className="font-bold text-sand hover:underline disabled:opacity-35"
            >
              {isHe ? 'היום' : 'Today'}
            </button>
            {!required && value && (
              <button
                type="button"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
                className="font-semibold text-navy/55 hover:text-red-600"
              >
                {isHe ? 'ניקוי' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
