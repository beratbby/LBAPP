import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getPendingReports, getRecentResolvedReports } from "@/lib/data";
import { getSettings } from "@/lib/game";
import { adminResolve, setDefense, vote, withdrawReport } from "@/lib/actions/reports";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { TimeAgo } from "@/components/TimeAgo";

export const metadata: Metadata = { title: "Abstimmen" };

export default async function VotePage({ searchParams }: PageProps<"/abstimmen">) {
  const me = await requireMember();
  const sp = await searchParams;
  const [pending, resolved, settings] = await Promise.all([
    getPendingReports(),
    getRecentResolvedReports(10),
    getSettings(),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Das Gericht tagt 🗳️</h1>
        <p className="text-sm text-wine-soft">
          {settings.votes_required}× &quot;Schuldig&quot; = Punkt. {settings.rejects_required}× &quot;Unschuldig&quot; = Freispruch.
          Melder und Beschuldigter stimmen nicht mit.
        </p>
      </div>

      {sp.gemeldet && (
        <div className="card bg-blush/60 text-center text-sm font-semibold">📨 Anzeige eingereicht. Jetzt entscheiden die Jungs.</div>
      )}

      {pending.length === 0 && (
        <div className="card text-center">
          <p className="text-4xl">😇</p>
          <p className="mt-1 font-bold">Keine offenen Fälle.</p>
          <p className="text-sm text-wine-soft">Entweder sind alle brav, oder keiner petzt.</p>
          <Link href="/melden" className="btn btn-primary mt-3">Jemanden melden</Link>
        </div>
      )}

      {pending.map((r) => {
        const myVote = r.votes.find((v) => v.member_id === me.id);
        const yes = r.votes.filter((v) => v.approve);
        const no = r.votes.filter((v) => !v.approve);
        const isAccused = r.accused.id === me.id;
        const isReporter = r.reporter.id === me.id;
        const canVote = !isAccused && !isReporter;
        return (
          <article key={r.id} className="card space-y-3">
            <header className="flex items-center gap-3">
              <Avatar member={r.accused} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wider text-wine-soft uppercase">Angeklagt</p>
                <p className="text-xl font-black">{r.accused.display_name}</p>
                <p className="text-xs text-wine-soft">
                  gemeldet von {r.reporter.display_name} · <TimeAgo date={r.created_at} />
                </p>
              </div>
              <span className="chip text-sm">+{r.points}</span>
            </header>

            <div className="rounded-2xl bg-blush/50 p-3">
              <p className="font-bold">{r.rule_emoji} {r.rule_title}</p>
              {r.description && <p className="mt-1 text-sm whitespace-pre-line">&ldquo;{r.description}&rdquo;</p>}
            </div>

            {r.evidence_media_id && (
              <a href={`/api/media/${r.evidence_media_id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${r.evidence_media_id}`} alt="Beweisfoto" className="max-h-72 rounded-2xl border border-petal" />
              </a>
            )}

            {r.defense && (
              <div className="rounded-2xl border-l-4 border-wine-soft bg-white p-3 text-sm">
                <p className="text-xs font-bold text-wine-soft">🧑‍⚖️ Verteidigung von {r.accused.display_name}:</p>
                <p className="whitespace-pre-line">{r.defense}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-rose">👎 Schuldig {yes.length}/{settings.votes_required}</span>
              <span className="text-wine-soft">{yes.map((v) => v.avatar_emoji).join(" ")}</span>
              <span className="ml-auto font-bold text-emerald-700">🕊️ Unschuldig {no.length}/{settings.rejects_required}</span>
              <span className="text-wine-soft">{no.map((v) => v.avatar_emoji).join(" ")}</span>
            </div>

            {canVote && (
              <div className="grid grid-cols-2 gap-2">
                <form action={vote.bind(null, r.id, true)}>
                  <SubmitButton className={`btn w-full ${myVote?.approve === true ? "btn-primary" : "btn-ghost"}`}>
                    Schuldig 👎
                  </SubmitButton>
                </form>
                <form action={vote.bind(null, r.id, false)}>
                  <SubmitButton
                    className={`btn w-full ${myVote?.approve === false ? "bg-emerald-600 text-white" : "btn-ghost"}`}
                  >
                    Unschuldig 🕊️
                  </SubmitButton>
                </form>
              </div>
            )}
            {isAccused && (
              <form action={setDefense.bind(null, r.id)} className="space-y-2">
                <label className="label" htmlFor={`def-${r.id}`}>Deine Verteidigung</label>
                <textarea id={`def-${r.id}`} name="defense" rows={2} maxLength={600} defaultValue={r.defense} className="input" placeholder="Euer Ehren, ich kann das erklären…" />
                <SubmitButton className="btn btn-ghost btn-sm">Einspruch einlegen 🧑‍⚖️</SubmitButton>
              </form>
            )}
            {isReporter && (
              <form action={withdrawReport.bind(null, r.id)}>
                <SubmitButton className="btn btn-ghost btn-sm" confirm="Anzeige wirklich zurückziehen?">Anzeige zurückziehen</SubmitButton>
              </form>
            )}
            {me.is_admin && (
              <div className="flex flex-wrap gap-2 border-t border-petal/60 pt-3">
                <span className="text-xs font-bold text-wine-soft">👑 Admin-Machtwort:</span>
                <form action={adminResolve.bind(null, r.id, true)}>
                  <SubmitButton className="btn btn-danger btn-sm" confirm="Sofort als schuldig werten?">Schuldig</SubmitButton>
                </form>
                <form action={adminResolve.bind(null, r.id, false)}>
                  <SubmitButton className="btn btn-ghost btn-sm" confirm="Sofort freisprechen?">Freispruch</SubmitButton>
                </form>
              </div>
            )}
          </article>
        );
      })}

      {resolved.length > 0 && (
        <section className="card">
          <h2 className="page-title mb-2 text-2xl">Letzte Urteile</h2>
          <ul className="divide-y divide-petal/50 text-sm">
            {resolved.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <Avatar member={r.accused} size="sm" />
                <span className="min-w-0 flex-1">
                  <b>{r.accused.display_name}</b>: {r.rule_emoji} {r.rule_title}
                  {r.resolved_by_admin && <span title="Admin-Entscheidung"> 👑</span>}
                </span>
                {r.status === "approved" ? (
                  <span className="chip">+{r.points} schuldig</span>
                ) : (
                  <span className="chip bg-emerald-50 text-emerald-700">freigesprochen</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
