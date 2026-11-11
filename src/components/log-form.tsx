"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteClientLog, saveClientLog } from "@/app/actions/clients";
import { LOG_TYPES, todayIST } from "@/lib/format";
import { ActionForm, ConfirmButton, Modal, Submit } from "./forms";
import { Field } from "./ui";

export type LogValues = { id: string; clientId: string; date: string; type: string; summary: string; contactPerson: string | null; followUpOn: string };

export function LogFormModal({ clients, fixedClientId, log }: { clients: { id: string; name: string }[]; fixedClientId?: string; log?: LogValues }) {
  const router = useRouter();
  return (
    <Modal
      title={log ? "Edit communication" : "Log client communication"}
      description={log ? undefined : "Record calls, meetings, emails and notices so the whole team has the context."}
      trigger={(open) =>
        log ? (
          <button onClick={open} className="icon-btn" aria-label="Edit" title="Edit"><Pencil className="size-4" /></button>
        ) : (
          <button onClick={open} className="btn-primary"><Plus className="size-4" /> Log communication</button>
        )
      }
    >
      {(close) => (
        <ActionForm action={saveClientLog} onDone={() => { close(); router.refresh(); }}>
          {log && <input type="hidden" name="id" value={log.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {fixedClientId ? (
              <input type="hidden" name="clientId" value={fixedClientId} />
            ) : (
              <Field label="Client *" className="sm:col-span-2">
                <select name="clientId" required defaultValue={log?.clientId ?? ""} className="field">
                  <option value="" disabled>Choose a client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Date *"><input type="date" name="date" required defaultValue={log?.date ?? todayIST()} className="field" /></Field>
            <Field label="Type">
              <select name="type" defaultValue={log?.type ?? "CALL"} className="field">
                {Object.entries(LOG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Summary *" className="sm:col-span-2">
              <textarea name="summary" rows={4} required defaultValue={log?.summary} className="field" placeholder="What was discussed or received, and what's next" />
            </Field>
            <Field label="Contact person"><input name="contactPerson" defaultValue={log?.contactPerson ?? ""} className="field" /></Field>
            <Field label="Follow up on"><input type="date" name="followUpOn" defaultValue={log?.followUpOn ?? ""} className="field" /></Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
            <Submit>{log ? "Save" : "Add entry"}</Submit>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function DeleteLogButton({ id }: { id: string }) {
  return (
    <ConfirmButton action={() => deleteClientLog(id)} label="Delete entry" confirm="Delete this communication entry?">
      <Trash2 className="size-4" />
    </ConfirmButton>
  );
}
