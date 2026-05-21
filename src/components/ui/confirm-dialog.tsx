"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  /** The element that opens the dialog when clicked */
  trigger: React.ReactNode;
  /** Dialog title (bold, shown at top) */
  title?: string;
  /** Descriptive body text */
  description?: string;
  /** Label for the destructive confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Called when the user confirms. May be async — spinner shows during execution */
  onConfirm: () => void | Promise<void>;
  /** Variant controls the confirm button colour */
  variant?: "danger" | "warning" | "default";
  className?: string;
}

/**
 * ConfirmDialog — accessible Radix UI modal for irreversible actions
 * (delete, archive, reset …).
 *
 * @example
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Löschen</Button>}
 *   title="Eintrag löschen?"
 *   description="Dieser Vorgang kann nicht rückgängig gemacht werden."
 *   confirmLabel="Ja, löschen"
 *   onConfirm={() => handleDelete(id)}
 * />
 */
export function ConfirmDialog({
  trigger,
  title = "Aktion bestätigen",
  description = "Möchten Sie diese Aktion wirklich durchführen?",
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  onConfirm,
  variant = "danger",
  className,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const confirmCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : "bg-[--primary] hover:bg-[--primary]/90 text-white";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl bg-[--background] border border-[--border] shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                variant === "danger"
                  ? "bg-red-100 text-red-600"
                  : variant === "warning"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[--primary-light] text-[--primary]"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Dialog.Title className="text-base font-semibold text-[--foreground] leading-snug">
              {title}
            </Dialog.Title>
          </div>

          <Dialog.Description className="text-sm text-[--muted-foreground] mb-6 leading-relaxed">
            {description}
          </Dialog.Description>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
                confirmCls
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
