"use client";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetActions } from "@/components/ui/Sheet";

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Sheet
      title={title}
      description={body}
      onClose={onCancel}
      footer={
        <SheetActions>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </SheetActions>
      }
    >
      {children}
    </Sheet>
  );
}
