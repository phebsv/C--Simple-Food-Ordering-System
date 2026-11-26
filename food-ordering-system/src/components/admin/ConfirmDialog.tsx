import { useEffect, useId } from "react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();

  // Esc closes the dialog, the same as clicking Cancel.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-dialog-header ${isDangerous ? "dangerous" : ""}`}>
          <h3 id={titleId}>{title}</h3>
        </div>
        <div id={messageId} className="confirm-dialog-message">
          {message}
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-cancel"
            onClick={onCancel}
            disabled={isLoading}
            // Start on the safe choice so pressing Enter doesn't delete anything by accident.
            autoFocus
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-dialog-confirm ${isDangerous ? "dangerous" : ""}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
