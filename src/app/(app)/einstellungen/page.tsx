import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { changePassword, updateProfile } from "@/lib/actions/profile";
import { logout } from "@/lib/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Avatar } from "@/components/Avatar";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ImageInput } from "@/components/ImageInput";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const me = await requireMember();
  return (
    <>
      <h1 className="page-title">Einstellungen</h1>

      <section className="card">
        <h2 className="mb-3 font-extrabold">Profil</h2>
        <ActionForm action={updateProfile}>
          <div className="flex items-center gap-3">
            <Avatar member={me} size="lg" />
            <div className="space-y-1">
              <ImageInput name="avatar" label="Profilbild hochladen" />
              {me.avatar_media_id && (
                <label className="flex items-center gap-2 text-xs text-wine-soft">
                  <input type="checkbox" name="remove_avatar" /> Profilbild entfernen (Emoji nutzen)
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="display_name">Anzeigename</label>
            <input id="display_name" name="display_name" defaultValue={me.display_name} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="bio">Motto / Bio</label>
            <input id="bio" name="bio" defaultValue={me.bio} maxLength={160} className="input" placeholder="z. B. Ich komme nie zu spät. (Lüge)" />
          </div>
          <div>
            <span className="label">Emoji (wenn kein Profilbild)</span>
            <EmojiPicker name="avatar_emoji" defaultValue={me.avatar_emoji} />
          </div>
          <SubmitButton pendingText="Speichert…">Speichern</SubmitButton>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-3 font-extrabold">Passwort ändern</h2>
        <ActionForm action={changePassword} resetOnSuccess>
          <input name="current" type="password" className="input" placeholder="Aktuelles Passwort" autoComplete="current-password" required />
          <input name="next" type="password" className="input" placeholder="Neues Passwort (min. 6 Zeichen)" autoComplete="new-password" required minLength={6} />
          <SubmitButton className="btn btn-ghost" pendingText="Ändert…">Passwort ändern</SubmitButton>
        </ActionForm>
      </section>

      <form action={logout} className="text-center">
        <SubmitButton className="btn btn-danger">Ausloggen 👋</SubmitButton>
      </form>
    </>
  );
}
