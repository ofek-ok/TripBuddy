import React, { useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'sand' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-navy text-white hover:bg-navy-light active:scale-[0.99] shadow-sm',
      secondary: 'bg-sage text-navy font-semibold hover:bg-sage-dark/90 hover:text-white',
      sand: 'bg-sand text-white hover:bg-sand-dark shadow-sm',
      outline: 'border border-navy/20 bg-surface text-navy hover:bg-ivory',
      ghost: 'text-navy hover:bg-navy/5',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs rounded-xl gap-1.5',
      md: 'h-11 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-2xl gap-2.5',
      icon: 'h-10 w-10 rounded-xl flex items-center justify-center p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50 disabled:pointer-events-none select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      'bg-surface rounded-2xl border border-navy/[0.07] shadow-card p-4 sm:p-5',
      className
    )}
    {...props}
  />
);

const NON_EMOJI_INPUT_TYPES = new Set([
  'password',
  'email',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'url',
  'tel',
  'file',
  'color',
  'range',
  'hidden',
]);

function insertEmojiIntoElement<T extends HTMLInputElement | HTMLTextAreaElement>(
  el: T | null,
  emoji: string,
  currentValue: string,
  onChange?: React.ChangeEventHandler<T>
) {
  const start = el?.selectionStart ?? currentValue.length;
  const end = el?.selectionEnd ?? currentValue.length;
  const nextValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);

  if (onChange) {
    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<T>;
    onChange(syntheticEvent);
  } else if (el) {
    el.value = nextValue;
  }

  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = start + emoji.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore if input type doesn't support selectionRange
    }
  });
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    disableEmoji?: boolean;
  }
>(({ className, label, error, disableEmoji, type = 'text', value, onChange, disabled, readOnly, ...props }, ref) => {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const showEmoji = !disableEmoji && !disabled && !readOnly && !NON_EMOJI_INPUT_TYPES.has(type);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-xs font-semibold text-navy/80">{label}</label>}
      <div className="relative">
        <input
          ref={setRefs}
          type={type}
          dir={type === 'date' ? 'ltr' : props.dir}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            'w-full h-11 px-3.5 rounded-xl bg-ivory/60 border border-navy/15 text-navy text-sm placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-surface transition-all',
            showEmoji && 'pe-10',
            error && 'border-red-500 focus:ring-red-200',
            className
          )}
          {...props}
        />
        {showEmoji && (
          <div className="absolute inset-y-0 end-1.5 flex items-center">
            <EmojiPickerButton
              onSelect={(emoji) =>
                insertEmojiIntoElement(
                  innerRef.current,
                  emoji,
                  String(value ?? innerRef.current?.value ?? ''),
                  onChange
                )
              }
            />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(({ className, label, error, children, ...props }, ref) => (
  <div className="w-full space-y-1.5">
    {label && <label className="block text-xs font-semibold text-navy/80">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full h-11 px-3.5 rounded-xl bg-ivory/60 border border-navy/15 text-navy text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-surface transition-all',
        error && 'border-red-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; disableEmoji?: boolean }
>(({ className, label, disableEmoji, value, onChange, disabled, readOnly, ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const showEmoji = !disableEmoji && !disabled && !readOnly;

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-xs font-semibold text-navy/80">{label}</label>}
      <div className="relative">
        <textarea
          ref={setRefs}
          rows={3}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            'w-full p-3.5 rounded-xl bg-ivory/60 border border-navy/15 text-navy text-sm placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-surface transition-all resize-none',
            showEmoji && 'pe-10',
            className
          )}
          {...props}
        />
        {showEmoji && (
          <div className="absolute top-2 end-2">
            <EmojiPickerButton
              onSelect={(emoji) =>
                insertEmojiIntoElement(
                  innerRef.current,
                  emoji,
                  String(value ?? innerRef.current?.value ?? ''),
                  onChange
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
});
Textarea.displayName = 'Textarea';

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'navy' | 'sage' | 'sand' | 'ivory' | 'danger';
  className?: string;
}> = ({ children, variant = 'ivory', className }) => {
  const styles = {
    navy: 'bg-navy text-white',
    sage: 'bg-sage/25 text-navy border border-sage/40',
    sand: 'bg-sand/20 text-navy border border-sand/40',
    ivory: 'bg-ivory text-navy/80 border border-navy/10',
    danger: 'bg-red-100 text-red-800 border border-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export const ModalDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-2xl border border-navy/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy/10 bg-ivory/40">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-navy/10 text-navy/70"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 pb-safe">{children}</div>
      </div>
    </div>
  );
};
