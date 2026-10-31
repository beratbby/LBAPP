import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { memberCount } from "@/lib/auth";
import { setupAdmin } from "@/lib/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Ersteinrichtung" };

export default async function SetupPage() {
  await connection();
  if ((await memberCount()) > 0) redirect("/login");
  return (
    <div className="card">
      <h2 className="font-black tracking-tight text-2xl text-rose-dark">Willkommen, Gründervater</h2>
      <p className="mt-1 mb-4 text-sm text-wine-soft">
        Die App ist noch leer. Der erste Account wird <b>Admin</b> und kann danach die anderen LoverBoys einladen.
      </p>
      <ActionForm action={setupAdmin}>
        <div>
          <label className="label" htmlFor="display_name">Anzeigename</label>
          <input id="display_name" name="display_name" className="input" placeholder="z. B. Berat" required />
        </div>
        <div>
          <label className="label" htmlFor="username">Benutzername (zum Einloggen)</label>
          <input id="username" name="username" className="input" autoCapitalize="none" placeholder="z. B. berat" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Passwort</label>
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={6} />
        </div>
        <SubmitButton className="btn btn-primary w-full" pendingText="Krone wird geschmiedet…">Admin-Account erstellen 👑</SubmitButton>
      </ActionForm>
    </div>
  );
}
