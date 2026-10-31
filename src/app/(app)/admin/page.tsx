import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getPunishments, getRules, getTiers, type Punishment, type Rule, type Tier } from "@/lib/data";
import { getSettings } from "@/lib/game";
import {
  createInvite,
  deleteInvite,
  deletePunishment,
  deleteRule,
  deleteTier,
  resetPassword,
  saveSettings,
  savePunishment,
  saveRule,
  saveTier,
  toggleActive,
  toggleAdmin,
  togglePunishment,
  toggleRule,
} from "@/lib/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { TimeAgo } from "@/components/TimeAgo";

export const metadata: Metadata = { title: "Admin" };

type AdminMember = {
  id: number;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_media_id: number | null;
  is_admin: boolean;
  active: boolean;
};

export default async function AdminPage() {
  const me = await requireAdmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const [settings, members, invites, rules, tiers, punishments] = await Promise.all([
    getSettings(),
    query<AdminMember>(
      "SELECT id, username, display_name, avatar_emoji, avatar_media_id, is_admin, active FROM members ORDER BY active DESC, display_name",
    ),
    query<{ code: string; created_at: Date }>(
      "SELECT code, created_at FROM invites WHERE used_by IS NULL ORDER BY created_at DESC",
    ),
    getRules(true),
    getTiers(),
    getPunishments(true),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Admin-Thron 👑</h1>
        <p className="text-sm text-wine-soft">Mit großer Macht kommt große Verantwortung. Und viele Strafpunkte für andere.</p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          ["#einladungen", "💌 Einladungen"],
          ["#mitglieder", "🤵 Mitglieder"],
          ["#kodex", "📜 Kodex"],
          ["#strafen", "🎡 Strafen"],
          ["#regeln", "⚙️ Spielregeln"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="chip px-3 py-1">{label}</a>
        ))}
      </nav>

      {/* Einladungen */}
      <section id="einladungen" className="card scroll-mt-20 space-y-3">
        <h2 className="text-xl font-black">💌 Einladungen</h2>
        <p className="text-sm text-wine-soft">Jeder Link funktioniert genau einmal. Schick ihn per WhatsApp an einen der Jungs.</p>
        <form action={createInvite}>
          <SubmitButton pendingText="Erstellt…">Neuen Einladungslink erstellen</SubmitButton>
        </form>
        {invites.length > 0 && (
          <ul className="space-y-2">
            {invites.map((inv) => {
              const url = `${origin}/einladung/${inv.code}`;
              const wa = `https://wa.me/?text=${encodeURIComponent(`Du wurdest zu den LoverBoys eingeladen 💘 ${url}`)}`;
              return (
                <li key={inv.code} className="rounded-2xl bg-blush/40 p-3">
                  <p className="font-mono text-xs break-all">{url}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CopyButton text={url} label="Link kopieren" />
                    <a href={wa} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">WhatsApp</a>
                    <form action={deleteInvite.bind(null, inv.code)}>
                      <SubmitButton className="btn btn-danger btn-sm">Löschen</SubmitButton>
                    </form>
                    <span className="text-xs text-wine-soft">erstellt <TimeAgo date={inv.created_at} /></span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Mitglieder */}
      <section id="mitglieder" className="card scroll-mt-20 space-y-3">
        <h2 className="text-xl font-black">🤵 Mitglieder ({members.filter((m) => m.active).length})</h2>
        <ul className="divide-y divide-petal/50">
          {members.map((m) => (
            <li key={m.id} className={`space-y-2 py-3 ${m.active ? "" : "opacity-50"}`}>
              <div className="flex items-center gap-3">
                <Avatar member={m} size="sm" />
                <span className="flex-1">
                  <b>{m.display_name}</b> <span className="text-xs text-wine-soft">@{m.username}</span>
                  {m.is_admin && <span className="ml-1">👑</span>}
                  {!m.active && <span className="ml-1 chip">deaktiviert</span>}
                </span>
              </div>
              {m.id !== me.id && (
                <div className="flex flex-wrap gap-2">
                  <form action={toggleAdmin.bind(null, m.id)}>
                    <SubmitButton className="btn btn-ghost btn-sm" confirm={m.is_admin ? `${m.display_name} die Krone abnehmen?` : `${m.display_name} zum Admin machen?`}>
                      {m.is_admin ? "Admin entziehen" : "Zum Admin machen"}
                    </SubmitButton>
                  </form>
                  <form action={toggleActive.bind(null, m.id)}>
                    <SubmitButton className="btn btn-ghost btn-sm" confirm={m.active ? `${m.display_name} deaktivieren? (kann sich nicht mehr einloggen)` : `${m.display_name} wieder aktivieren?`}>
                      {m.active ? "Deaktivieren" : "Aktivieren"}
                    </SubmitButton>
                  </form>
                  <ActionForm action={resetPassword} className="flex flex-col gap-2">
                    <input type="hidden" name="member_id" value={m.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" confirm={`Passwort von ${m.display_name} zurücksetzen?`}>
                      Passwort zurücksetzen
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Kodex */}
      <section id="kodex" className="card scroll-mt-20 space-y-3">
        <h2 className="text-xl font-black">📜 Kodex (Regeln)</h2>
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className={`rounded-2xl bg-blush/40 p-3 ${r.active ? "" : "opacity-60"}`}>
              <details>
                <summary className="cursor-pointer font-bold">
                  {r.emoji} {r.title} <span className="chip">+{r.points}</span>
                  {!r.active && <span className="ml-1 chip">inaktiv</span>}
                </summary>
                <div className="mt-3 space-y-2">
                  <RuleForm rule={r} />
                  <div className="flex gap-2">
                    <form action={toggleRule.bind(null, r.id)}>
                      <SubmitButton className="btn btn-ghost btn-sm">{r.active ? "Deaktivieren" : "Aktivieren"}</SubmitButton>
                    </form>
                    <form action={deleteRule.bind(null, r.id)}>
                      <SubmitButton className="btn btn-danger btn-sm" confirm="Regel löschen? (Mit bestehenden Meldungen wird sie nur deaktiviert.)">
                        Löschen
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="rounded-2xl border border-dashed border-petal p-3">
          <summary className="cursor-pointer font-bold text-rose-dark">+ Neue Regel</summary>
          <div className="mt-3"><RuleForm /></div>
        </details>
      </section>

      {/* Stufen & Strafen */}
      <section id="strafen" className="card scroll-mt-20 space-y-4">
        <h2 className="text-xl font-black">🎡 Stufen & Strafen-Pool</h2>
        {tiers.map((t) => (
          <div key={t.id} className="space-y-2 rounded-2xl bg-blush/30 p-3">
            <details>
              <summary className="cursor-pointer font-extrabold">
                {t.emoji} ab {t.threshold} Punkten: {t.name}
              </summary>
              <div className="mt-3 space-y-2">
                <TierForm tier={t} />
                <form action={deleteTier.bind(null, t.id)}>
                  <SubmitButton className="btn btn-danger btn-sm" confirm="Stufe samt ihrer Strafen löschen?">Stufe löschen</SubmitButton>
                </form>
              </div>
            </details>
            <ul className="space-y-1.5">
              {punishments.filter((p) => p.tier_id === t.id).map((p) => (
                <li key={p.id} className={`rounded-xl bg-white p-2 text-sm ${p.active ? "" : "opacity-60"}`}>
                  <details>
                    <summary className="cursor-pointer">
                      <b>{p.title}</b> {!p.active && <span className="chip">inaktiv</span>}
                      <span className="block text-xs text-wine-soft">{p.description}</span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <PunishmentForm punishment={p} tiers={tiers} />
                      <div className="flex gap-2">
                        <form action={togglePunishment.bind(null, p.id)}>
                          <SubmitButton className="btn btn-ghost btn-sm">{p.active ? "Deaktivieren" : "Aktivieren"}</SubmitButton>
                        </form>
                        <form action={deletePunishment.bind(null, p.id)}>
                          <SubmitButton className="btn btn-danger btn-sm" confirm="Strafe löschen?">Löschen</SubmitButton>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {tiers.length > 0 && (
          <details className="rounded-2xl border border-dashed border-petal p-3">
            <summary className="cursor-pointer font-bold text-rose-dark">+ Neue Strafe</summary>
            <div className="mt-3"><PunishmentForm tiers={tiers} /></div>
          </details>
        )}
        <details className="rounded-2xl border border-dashed border-petal p-3">
          <summary className="cursor-pointer font-bold text-rose-dark">+ Neue Stufe</summary>
          <div className="mt-3"><TierForm /></div>
        </details>
      </section>

      {/* Spielregeln */}
      <section id="regeln" className="card scroll-mt-20 space-y-3">
        <h2 className="text-xl font-black">⚙️ Spielregeln</h2>
        <ActionForm action={saveSettings}>
          <NumberField name="votes_required" label="Schuldig-Stimmen für einen Punkt" value={settings.votes_required} />
          <NumberField name="rejects_required" label="Unschuldig-Stimmen für einen Freispruch" value={settings.rejects_required} />
          <NumberField
            name="repeat_every"
            label="Nach der höchsten Stufe: neue Strafe alle X Punkte (0 = aus)"
            value={settings.repeat_every}
          />
          <SubmitButton pendingText="Speichert…">Speichern</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}

function NumberField({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} max={100} defaultValue={value} className="input" required />
    </div>
  );
}

function RuleForm({ rule }: { rule?: Rule }) {
  return (
    <ActionForm action={saveRule} resetOnSuccess={!rule}>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="flex gap-2">
        <input name="emoji" defaultValue={rule?.emoji ?? "⚠️"} className="input w-16 text-center" aria-label="Emoji" />
        <input name="title" defaultValue={rule?.title} className="input" placeholder="Titel der Regel" required />
      </div>
      <textarea name="description" defaultValue={rule?.description} rows={2} className="input" placeholder="Was genau ist verboten?" />
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-wine-soft" htmlFor={`pts-${rule?.id ?? "new"}`}>Punkte</label>
        <input id={`pts-${rule?.id ?? "new"}`} name="points" type="number" min={1} max={20} defaultValue={rule?.points ?? 1} className="input w-20" />
        <SubmitButton className="btn btn-primary btn-sm ml-auto">{rule ? "Speichern" : "Hinzufügen"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function TierForm({ tier }: { tier?: Tier }) {
  return (
    <ActionForm action={saveTier} resetOnSuccess={!tier}>
      {tier && <input type="hidden" name="id" value={tier.id} />}
      <div className="flex gap-2">
        <input name="emoji" defaultValue={tier?.emoji ?? "💔"} className="input w-16 text-center" aria-label="Emoji" />
        <input name="name" defaultValue={tier?.name} className="input" placeholder="Name der Stufe" required />
      </div>
      <input name="description" defaultValue={tier?.description} className="input" placeholder="Kurze Beschreibung" />
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-wine-soft" htmlFor={`thr-${tier?.id ?? "new"}`}>Ab Punkten</label>
        <input id={`thr-${tier?.id ?? "new"}`} name="threshold" type="number" min={1} defaultValue={tier?.threshold} className="input w-24" required />
        <SubmitButton className="btn btn-primary btn-sm ml-auto">{tier ? "Speichern" : "Hinzufügen"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function PunishmentForm({ punishment, tiers }: { punishment?: Punishment; tiers: Tier[] }) {
  return (
    <ActionForm action={savePunishment} resetOnSuccess={!punishment}>
      {punishment && <input type="hidden" name="id" value={punishment.id} />}
      <input name="title" defaultValue={punishment?.title} className="input" placeholder="Titel der Strafe" required />
      <textarea name="description" defaultValue={punishment?.description} rows={2} className="input" placeholder="Was genau muss gemacht werden?" />
      <div className="flex items-center gap-2">
        <select name="tier_id" defaultValue={punishment?.tier_id ?? tiers[0]?.id} className="input">
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>{t.emoji} ab {t.threshold}: {t.name}</option>
          ))}
        </select>
        <SubmitButton className="btn btn-primary btn-sm">{punishment ? "Speichern" : "Hinzufügen"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
