"use client";

import { changePassword, updateProfile } from "@/app/actions/auth";
import { ActionForm, Submit } from "@/components/forms";
import { Field } from "@/components/ui";

export function ProfileForm({ name, mobile }: { name: string; mobile: string }) {
  return (
    <ActionForm action={updateProfile}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><input name="name" required defaultValue={name} className="field" /></Field>
        <Field label="Mobile"><input name="mobile" type="tel" defaultValue={mobile} className="field" /></Field>
      </div>
      <div className="mt-4 flex justify-end"><Submit>Save</Submit></div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess>
      <div className="grid gap-4">
        <Field label="Current password"><input name="current" type="password" required autoComplete="current-password" className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" hint="At least 8 characters"><input name="next" type="password" required minLength={8} autoComplete="new-password" className="field" /></Field>
          <Field label="Confirm new password"><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" /></Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end"><Submit>Update password</Submit></div>
    </ActionForm>
  );
}
