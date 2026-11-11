"use client";

import { login } from "@/app/actions/auth";
import { ActionForm, Submit } from "@/components/forms";

export function LoginForm() {
  return (
    <ActionForm action={login} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
        <input name="email" type="email" autoComplete="username" required className="field" placeholder="you@cafirm.in" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      <Submit className="btn-primary w-full py-2.5" pendingText="Signing in…">Sign in</Submit>
      <p className="text-center text-xs text-faint">Forgot your password? Ask your firm admin to reset it.</p>
    </ActionForm>
  );
}
