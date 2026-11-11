"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

/** Modal built on <dialog>. `trigger` renders the opener; children get a `close` callback. */
export function Modal({
  trigger,
  title,
  description,
  children,
  wide,
  defaultOpen = false,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => React.ReactNode;
  wide?: boolean;
  defaultOpen?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={ref}
        onClose={close}
        onClick={(e) => e.target === ref.current && close()}
        className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-line bg-panel p-0 text-fg shadow-2xl`}
      >
        {open && (
          <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={close} className="icon-btn -mr-2 -mt-1" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
  );
}

const PendingContext = createContext(false);

export function Submit({ children, className = "btn-primary", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) || status.pending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}

/** A form bound to a server action that returns ActionState; shows errors, calls onDone on success. */
export function ActionForm({
  action,
  children,
  onDone,
  className,
  resetOnSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  onDone?: () => void;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <PendingContext.Provider value={pending}>
      {/* Submit via onSubmit (not the `action` prop) so React doesn't wipe the
          user's input when the server returns a validation error. */}
      <form
        ref={formRef}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state.error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-red-300">{state.error}</p>}
        {state.ok && state.message && <p className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-emerald-300">{state.message}</p>}
      </form>
    </PendingContext.Provider>
  );
}

export function ConfirmButton({
  action,
  label,
  confirm,
  className = "icon-btn hover:text-red-400",
  children,
}: {
  action: () => Promise<unknown>;
  label: string;
  confirm: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={busy}
      className={className}
      onClick={async () => {
        if (!window.confirm(confirm)) return;
        setBusy(true);
        try {
          await action();
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </button>
  );
}
