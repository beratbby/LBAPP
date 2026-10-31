import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getDoneAssigned, getOpenAssigned, getPunishments, getTiers } from "@/lib/data";
import { getSettings } from "@/lib/game";
import { confirmDone } from "@/lib/actions/punishments";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { TimeAgo } from "@/components/TimeAgo";
import { Wheel } from "@/components/Wheel";

export const metadata: Metadata = { title: "Strafen" };

export default async function PunishmentsPage() {
  const me = await requireMember();
  const [open, done, tiers, pool, settings] = await Promise.all([
    getOpenAssigned(),
    getDoneAssigned(20),
    getTiers(),
    getPunishments(),
    getSettings(),
  ]);
  const allActive = pool;

  return (
    <>
      <div>
        <h1 className="page-title">Strafen & Glücksrad 🎡</h1>
        <p className="text-sm text-wine-soft">Wer eine Stufe erreicht, dreht am Rad. Ein anderer LoverBoy bestätigt, wenn die Strafe erledigt ist.</p>
      </div>

      {open.length === 0 && (
        <div className="card text-center text-sm text-wine-soft">Gerade keine offenen Strafen. Noch. 😈</div>
      )}

      {open.map((ap) => {
        const mine = ap.member_id === me.id;
        const candidates = pool.filter((p) => p.tier_id === ap.tier_id);
        return (
          <article key={ap.id} className={`card space-y-3 ${mine ? "border-2 border-rose" : ""}`}>
            <header className="flex items-center gap-3">
              <Avatar member={ap.member} size="lg" />
              <div className="flex-1">
                <p className="text-xs font-bold tracking-wider text-wine-soft uppercase">
                  {ap.milestone} Punkte erreicht
                </p>
                <p className="text-xl font-black">{ap.member.display_name}</p>
                <p className="text-sm text-rose-dark">{ap.tier_emoji} {ap.tier_name ?? "Strafe"}</p>
              </div>
            </header>
            {ap.status === "spin" ? (
              <Wheel
                assignedId={ap.id}
                candidates={(candidates.length > 0 ? candidates : allActive).map((c) => ({ id: c.id, title: c.title }))}
                canSpin={mine || me.is_admin}
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-blush/60 p-4 text-center">
                  <p className="font-script text-2xl text-rose-dark">{ap.punishment_title}</p>
                  <p className="text-sm">{ap.punishment_description}</p>
                  {ap.spun_at && <p className="mt-1 text-xs text-wine-soft">gedreht <TimeAgo date={ap.spun_at} /></p>}
                </div>
                {!mine || me.is_admin ? (
                  <form action={confirmDone.bind(null, ap.id)} className="text-center">
                    <SubmitButton className="btn btn-primary" confirm={`Hat ${ap.member.display_name} die Strafe wirklich erledigt?`}>
                      Erledigt bestätigen ✅
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="text-center text-sm text-wine-soft">Zieh es durch. Ein anderer LoverBoy muss es dann bestätigen. 📸</p>
                )}
              </div>
            )}
          </article>
        );
      })}

      <section className="card">
        <h2 className="page-title mb-1 text-2xl">Die Stufen</h2>
        <p className="mb-3 text-xs text-wine-soft">
          {settings.repeat_every > 0 && tiers.length > 0
            ? `Ab ${tiers[tiers.length - 1].threshold} Punkten gibt es alle ${settings.repeat_every} weiteren Punkte eine neue Strafe der höchsten Stufe.`
            : ""}
        </p>
        <div className="space-y-4">
          {tiers.map((t) => (
            <div key={t.id}>
              <p className="font-extrabold">
                {t.emoji} ab {t.threshold} Punkten: {t.name}
              </p>
              {t.description && <p className="text-xs text-wine-soft">{t.description}</p>}
              <ul className="mt-1.5 space-y-1">
                {pool.filter((p) => p.tier_id === t.id).map((p) => (
                  <li key={p.id} className="rounded-xl bg-blush/40 px-3 py-1.5 text-sm">
                    <b>{p.title}</b> <span className="text-wine-soft">· {p.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {me.is_admin && <Link href="/admin#strafen" className="btn btn-ghost btn-sm mt-3">Strafen bearbeiten 👑</Link>}
      </section>

      {done.length > 0 && (
        <section className="card">
          <h2 className="page-title mb-2 text-2xl">Abgesessen ✅</h2>
          <ul className="divide-y divide-petal/50 text-sm">
            {done.map((ap) => (
              <li key={ap.id} className="flex items-center gap-3 py-2">
                <Avatar member={ap.member} size="sm" />
                <span className="flex-1">
                  <b>{ap.member.display_name}</b>: {ap.punishment_title}
                  <span className="block text-xs text-wine-soft">
                    bestätigt von {ap.confirmed_by_name ?? "?"} · {ap.done_at && <TimeAgo date={ap.done_at} />}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
