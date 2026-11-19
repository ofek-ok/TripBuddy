import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextValue {
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleError: (error: unknown, fallbackMessage?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallbackMessage = 'An unexpected error occurred') => {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : fallbackMessage;
      console.error('[TravelCompanion Error]:', error);
      notify(msg || fallbackMessage, 'error');
    },
    [notify]
  );

  return (
    <ToastContext.Provider value={{ notify, handleError }}>
      {children}
      <div className="fixed top-4 inset-x-4 z-50 flex flex-col items-center gap-2 pointer-events-none sm:max-w-md sm:mx-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium transition-all ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : toast.type === 'success'
                  ? 'bg-navy text-white border-navy-light'
                  : 'bg-surface text-navy border-navy/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="opacity-70 hover:opacity-100 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
