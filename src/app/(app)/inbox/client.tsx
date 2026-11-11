"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { deleteReminder, markNotificationsRead, saveReminder, sendMessage, toggleReminder } from "@/app/actions/inbox";
import { ActionForm, ConfirmButton, Modal, Submit } from "@/components/forms";
import { Field } from "@/components/ui";
import { todayIST } from "@/lib/format";

export function ThreadScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  });
  return <div ref={ref} className="flex max-h-[55dvh] flex-1 flex-col gap-3 overflow-y-auto p-5">{children}</div>;
}

export function MessageComposer({ recipientId, name }: { recipientId: string; name: string }) {
  const router = useRouter();
  return (
    <ActionForm action={sendMessage} resetOnSuccess onDone={() => router.refresh()} className="border-t border-line p-3">
      <input type="hidden" name="recipientId" value={recipientId} />
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={1}
          required
          placeholder={`Write to ${name}…`}
          className="field max-h-40 min-h-10 resize-y"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Submit pendingText="…" className="btn-primary h-10 px-3"><Send className="size-4" /></Submit>
      </div>
      <p className="mt-1 text-[11px] text-faint">Enter to send · Shift+Enter for a new line</p>
    </ActionForm>
  );
}

type R = { id: string; title: string; note: string | null; remindOn: string; done: boolean };

export function ReminderFormModal({ r }: { r?: R }) {
  const router = useRouter();
  return (
    <Modal
      title={r ? "Edit reminder" : "New reminder"}
      trigger={(open) =>
        r ? (
          <button onClick={open} className="icon-btn" aria-label="Edit" title="Edit"><Pencil className="size-4" /></button>
        ) : (
          <button onClick={open} className="btn-primary"><Plus className="size-4" /> New reminder</button>
        )
      }
    >
      {(close) => (
        <ActionForm action={saveReminder} onDone={() => { close(); router.refresh(); }}>
          {r && <input type="hidden" name="id" value={r.id} />}
          <div className="space-y-4">
            <Field label="Title *"><input name="title" required defaultValue={r?.title} className="field" placeholder="Renew practising certificate" /></Field>
            <Field label="Note"><textarea name="note" rows={3} defaultValue={r?.note ?? ""} className="field" /></Field>
            <Field label="Remind on *"><input type="date" name="remindOn" required defaultValue={r?.remindOn ?? todayIST()} className="field" /></Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
            <Submit>Save</Submit>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function ReminderActions({ r }: { r: R }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0">
      <button disabled={pending} onClick={() => start(() => toggleReminder(r.id))} className="icon-btn hover:text-emerald-400" title={r.done ? "Mark not done" : "Mark done"} aria-label="Toggle done">
        {r.done ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
      </button>
      <ReminderFormModal r={r} />
      <ConfirmButton action={() => deleteReminder(r.id)} label="Delete reminder" confirm="Delete this reminder?"><Trash2 className="size-4" /></ConfirmButton>
    </div>
  );
}

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => markNotificationsRead())} className="text-xs text-blue-300 hover:underline">
      Mark all read
    </button>
  );
}
