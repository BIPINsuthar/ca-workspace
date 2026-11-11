"use client";

import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { resetPassword, saveEmployee, toggleEmployeeActive } from "@/app/actions/employees";
import { ActionForm, ConfirmButton, Modal, Submit } from "@/components/forms";
import { Field } from "@/components/ui";

type U = { id: string; name: string; email: string; role: "ADMIN" | "EMPLOYEE"; designation: string | null; mobile: string | null; joinedOn: string; active: boolean };

export function EmployeeFormModal({ user, self }: { user?: U; self?: boolean }) {
  const router = useRouter();
  return (
    <Modal
      title={user ? `Edit ${user.name}` : "New employee login"}
      description={user ? undefined : "Creates the employee's workspace account immediately. Share the email and initial password with them."}
      trigger={(open) =>
        user ? (
          <button onClick={open} className="icon-btn" title="Edit" aria-label="Edit"><Pencil className="size-4" /></button>
        ) : (
          <button onClick={open} className="btn-primary"><Plus className="size-4" /> New employee</button>
        )
      }
    >
      {(close) => (
        <ActionForm action={saveEmployee} onDone={() => { close(); router.refresh(); }}>
          {user && <input type="hidden" name="id" value={user.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" className="sm:col-span-2"><input name="name" required defaultValue={user?.name} className="field" /></Field>
            <Field label="Login email *"><input name="email" type="email" required defaultValue={user?.email} className="field" placeholder="name@cafirm.in" /></Field>
            {!user && (
              <Field label="Initial password *" hint="At least 8 characters"><input name="password" type="text" required minLength={8} className="field font-mono" autoComplete="off" /></Field>
            )}
            <Field label="Designation"><input name="designation" defaultValue={user?.designation ?? ""} className="field" placeholder="Tax Associate" /></Field>
            <Field label="Mobile"><input name="mobile" type="tel" defaultValue={user?.mobile ?? ""} className="field" /></Field>
            <Field label="Joined on"><input name="joinedOn" type="date" defaultValue={user?.joinedOn ?? ""} className="field" /></Field>
            <Field label="Access" hint="Admins can manage clients, employees and all tasks">
              <select name="role" defaultValue={user?.role ?? "EMPLOYEE"} className="field" disabled={self}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
              {self && <input type="hidden" name="role" value="ADMIN" />}
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
            <Submit>{user ? "Save" : "Create login"}</Submit>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ user }: { user: U }) {
  return (
    <Modal
      title={`Reset password — ${user.name}`}
      description="Set a new password and share it with the employee. They can change it later from My profile."
      trigger={(open) => <button onClick={open} className="icon-btn" title="Reset password" aria-label="Reset password"><KeyRound className="size-4" /></button>}
    >
      {(close) => (
        <ActionForm action={resetPassword} resetOnSuccess>
          <input type="hidden" name="id" value={user.id} />
          <Field label="New password" hint="At least 8 characters"><input name="password" type="text" required minLength={8} className="field font-mono" autoComplete="off" /></Field>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={close} className="btn-ghost">Close</button>
            <Submit>Reset password</Submit>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function EmployeeActions({ user, self }: { user: U; self: boolean }) {
  return (
    <div className="flex justify-end">
      <EmployeeFormModal user={user} self={self} />
      <ResetPasswordModal user={user} />
      {!self && (
        <ConfirmButton
          action={() => toggleEmployeeActive(user.id)}
          label={user.active ? "Deactivate" : "Reactivate"}
          confirm={user.active ? `Deactivate ${user.name}? They won't be able to sign in. Their tasks stay assigned until you reassign them.` : `Reactivate ${user.name}?`}
          className={user.active ? "icon-btn hover:text-red-400" : "icon-btn hover:text-emerald-400"}
        >
          {user.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
        </ConfirmButton>
      )}
    </div>
  );
}
