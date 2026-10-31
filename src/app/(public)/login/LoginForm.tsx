"use client";

import { login } from "@/lib/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  return (
    <ActionForm action={login} className="card space-y-4">
      <div>
        <label className="label" htmlFor="username">Benutzername</label>
        <input id="username" name="username" className="input" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingText="Herz klopft…">Einloggen 💘</SubmitButton>
      <p className="text-center text-xs text-wine-soft">Noch kein Account? Lass dir vom Admin einen Einladungslink schicken.</p>
    </ActionForm>
  );
}
