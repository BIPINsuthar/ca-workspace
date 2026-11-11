"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { saveTask } from "@/app/actions/tasks";
import { PRIORITIES, RECURRENCES, STATUSES, TASK_CATEGORIES } from "@/lib/format";
import { ActionForm, Modal, Submit } from "./forms";
import { Field } from "./ui";

export type Option = { id: string; name: string };
export type TaskFormValues = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  period: string | null;
  clientId: string | null;
  assigneeId: string | null;
  priority: string;
  recurrence: string;
  dueDate: string;
};

export function TaskFormModal({
  employees,
  clients,
  task,
  isAdmin,
  defaultOpen,
  defaultClientId,
  variant = "button",
}: {
  employees: Option[];
  clients: Option[];
  task?: TaskFormValues;
  isAdmin: boolean;
  defaultOpen?: boolean;
  defaultClientId?: string;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  return (
    <Modal
      title={task ? "Edit task" : "Assign a new task"}
      description={task ? undefined : "Set the work, assignee and client. Recurring compliance tasks schedule their next occurrence automatically when completed."}
      defaultOpen={defaultOpen}
      wide
      trigger={(open) =>
        task ? (
          variant === "icon" ? (
            <button onClick={open} className="icon-btn" aria-label="Edit task" title="Edit"><Pencil className="size-4" /></button>
          ) : (
            <button onClick={open} className="btn-ghost"><Pencil className="size-4" /> Edit</button>
          )
        ) : (
          <button onClick={open} className="btn-primary"><Plus className="size-4" /> New task</button>
        )
      }
    >
      {(close) => (
        <ActionForm
          action={saveTask}
          onDone={() => {
            close();
            if (defaultOpen) router.replace("/tasks");
            router.refresh();
          }}
        >
          {task && <input type="hidden" name="id" value={task.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title *" className="sm:col-span-2">
              <input name="title" required defaultValue={task?.title} className="field" placeholder="e.g. GSTR-3B filing — October" autoFocus />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea name="description" rows={3} defaultValue={task?.description ?? ""} className="field" placeholder="Checklist, documents needed, notes…" />
            </Field>
            <Field label="Assign to">
              {isAdmin ? (
                <select name="assigneeId" defaultValue={task?.assigneeId ?? ""} className="field">
                  <option value="">Unassigned</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              ) : (
                <input disabled value="Me" className="field" />
              )}
            </Field>
            <Field label="Client">
              <select name="clientId" defaultValue={task?.clientId ?? defaultClientId ?? ""} className="field">
                <option value="">No client (internal)</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select name="category" defaultValue={task?.category ?? ""} className="field">
                <option value="">—</option>
                {TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Period / FY" hint="e.g. Oct 2026, Q2 FY 26-27">
              <input name="period" defaultValue={task?.period ?? ""} className="field" />
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={task?.priority ?? "MEDIUM"} className="field">
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" name="dueDate" defaultValue={task?.dueDate ?? ""} className="field" />
            </Field>
            <Field label="Repeats" hint="Next occurrence is created when this one is completed">
              <select name="recurrence" defaultValue={task?.recurrence ?? "NONE"} className="field">
                {Object.entries(RECURRENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            {!task && (
              <Field label="Starting status">
                <select name="status" defaultValue="PENDING" className="field">
                  {Object.entries(STATUSES).filter(([k]) => k !== "COMPLETED").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
            <Submit>{task ? "Save changes" : "Assign task"}</Submit>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}
