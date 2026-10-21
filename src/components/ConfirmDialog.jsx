import React from "react";
import Modal from "./Modal.jsx";
import { btnDanger, btnOutline, btnPrimary } from "./ui.jsx";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm" persistent={busy}>
      <p className="text-sm text-secondary">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" className={btnOutline} onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="button" className={danger ? btnDanger : btnPrimary} onClick={onConfirm} disabled={busy}>
          {busy ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
