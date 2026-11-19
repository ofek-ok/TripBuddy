import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'travel',
    icon: '✈️',
    emojis: [
      '✈️', '🧳', '🗺️', '🏖️', '🏔️', '🏨', '🚂', '🚗', '🚢', '🎡',
      '🗽', '🗼', '🏰', '🏝️', '🌅', '🌃', '⛱️', '🎟️', '🛂', '🧭',
    ],
  },
  {
    id: 'food',
    icon: '🍕',
    emojis: [
      '🍕', '🍝', '🍣', '🍔', '☕', '🍷', '🍸', '🥂', '🍰', '🍦',
      '🥐', '🍫', '🎉', '🎶', '📸', '🎭', '🛍️', '🎁', '💆‍♀️', '🧖‍♀️',
    ],
  },
  {
    id: 'vibes',
    icon: '💖',
    emojis: [
      '💖', '💕', '😍', '🥰', '🤩', '😎', '🥳', '😂', '🙌', '✨',
      '🌟', '🔥', '💯', '🫶', '💃', '🕺', '💐', '🌸', '🎀', '🦋',
    ],
  },
  {
    id: 'gear',
    icon: '🎒',
    emojis: [
      '🎒', '💼', '🧴', '👟', '👗', '🕶️', '🔌', '📱', '🔋', '💊',
      '🪪', '💳', '💵', '🧾', '✅', '⭐', '📌', '🔔', '📝', '💡',
    ],
  },
];

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onSelect,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        aria-label="Add emoji"
        title="הוספת אימוג׳י"
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          open
            ? 'bg-sand text-white'
            : 'text-navy/45 hover:text-sand hover:bg-sand/15'
        }`}
      >
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-1.5 z-50 w-64 rounded-2xl bg-surface border border-sand/30 shadow-xl p-2.5 space-y-2"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1 border-b border-navy/10 pb-1.5">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCat(idx)}
                className={`flex-1 py-1 rounded-xl text-base transition-colors ${
                  activeCat === idx ? 'bg-sand/20 scale-105' : 'hover:bg-ivory'
                }`}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1">
            {EMOJI_CATEGORIES[activeCat].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                }}
                className="h-9 rounded-xl text-lg flex items-center justify-center hover:bg-sand/15 active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
