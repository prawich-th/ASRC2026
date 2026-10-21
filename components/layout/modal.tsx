"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./modal.module.scss";

type ModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Called on Escape or a click on the backdrop. */
  onClose: () => void;
  children?: ReactNode;
};

/**
 * A centred dialog on a dimmed backdrop. Built on the native <dialog>, which
 * traps focus and handles Escape for us.
 */
export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on its backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <h2 id="modal-title">{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </div>
    </dialog>
  );
}
