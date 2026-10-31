import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { registerWithInvite } from "@/lib/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { EmojiPicker } from "@/components/EmojiPicker";

export const metadata: Metadata = { title: "Einladung" };

export default async function InvitePage({ params }: PageProps<"/einladung/[code]">) {
  const { code } = await params;
  if (await getCurrentMember()) redirect("/");
  const invite = await queryOne<{ inviter: string | null }>(
    `SELECT m.display_name AS inviter FROM invites i LEFT JOIN members m ON m.id = i.created_by
      WHERE i.code = $1
        AND (i.max_uses IS NULL OR i.max_uses > (SELECT COUNT(*) FROM members u WHERE u.invite_code = i.code))`,
    [code],
  );
  if (!invite) {
    return (
      <div className="card text-center">
        <p className="text-4xl">🥀</p>
        <h2 className="mt-2 font-black tracking-tight text-2xl text-rose-dark">Einladung abgelaufen</h2>
        <p className="mt-1 text-sm text-wine-soft">Dieser Link ist ungültig, gelöscht oder schon voll. Frag nach einem neuen.</p>
        <Link href="/login" className="btn btn-ghost mt-4">Zum Login</Link>
      </div>
    );
  }
  return (
    <div className="card">
      <h2 className="font-black tracking-tight text-2xl text-rose-dark">Du wurdest erwählt 💌</h2>
      <p className="mt-1 mb-4 text-sm text-wine-soft">
        {invite.inviter ?? "Die Jungs"} lädt dich zu den LoverBoys ein. Mit der Anmeldung akzeptierst du den Kodex und alle Konsequenzen.
      </p>
      <ActionForm action={registerWithInvite}>
        <input type="hidden" name="code" value={code} />
        <div>
          <label className="label" htmlFor="display_name">Anzeigename</label>
          <input id="display_name" name="display_name" className="input" placeholder="So sehen dich die anderen" required />
        </div>
        <div>
          <label className="label" htmlFor="username">Benutzername (zum Einloggen)</label>
          <input id="username" name="username" className="input" autoCapitalize="none" placeholder="klein, ohne Leerzeichen" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Passwort</label>
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={6} />
        </div>
        <div>
          <span className="label">Dein Wappentier</span>
          <EmojiPicker name="avatar_emoji" />
        </div>
        <SubmitButton className="btn btn-primary w-full" pendingText="Wird vereidigt…">Ich schwöre auf den Kodex 🌹</SubmitButton>
      </ActionForm>
    </div>
  );
}
