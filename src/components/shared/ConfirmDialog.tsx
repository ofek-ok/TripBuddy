import React from 'react';
import { Button, ModalDrawer } from '@/components/ui/primitives';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/app/providers/I18nProvider';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
}) => {
  const { t } = useI18n();
  return (
    <ModalDrawer open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel || t.common.delete}
          </Button>
        </div>
      </div>
    </ModalDrawer>
  );
};
