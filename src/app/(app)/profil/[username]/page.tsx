import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getAssignedFor, getLeaderboard, getMemberByUsername, getReportsAgainst } from "@/lib/data";
import { titleFor } from "@/lib/game";
import { Avatar } from "@/components/Avatar";
import { TimeAgo } from "@/components/TimeAgo";

export async function generateMetadata({ params }: PageProps<"/profil/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: username };
}

export default async function ProfilePage({ params }: PageProps<"/profil/[username]">) {
  const me = await requireMember();
  const { username } = await params;
  const member = await getMemberByUsername(decodeURIComponent(username));
  if (!member) notFound();

  const [board, reports, assigned] = await Promise.all([
    getLeaderboard(),
    getReportsAgainst(member.id),
    getAssignedFor(member.id),
  ]);
  const rankIdx = board.findIndex((b) => b.id === member.id);
  const row = board[rankIdx];
  const points = row?.points ?? 0;
  const t = titleFor(points);
  const approved = reports.filter((r) => r.status === "approved");
  const acquitted = reports.filter((r) => r.status === "rejected").length;

  const counts = new Map<string, number>();
  for (const r of approved) counts.set(`${r.rule_emoji} ${r.rule_title}`, (counts.get(`${r.rule_emoji} ${r.rule_title}`) ?? 0) + 1);
  const favorite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const isMe = member.id === me.id;

  return (
    <>
      <section className="card text-center">
        <div className="flex justify-center"><Avatar member={member} size="xl" /></div>
        <h1 className="mt-3 text-3xl font-black">{member.display_name}</h1>
        <p className="text-sm text-wine-soft">@{member.username}{member.is_admin && " · 👑 Admin"}{!member.active && " · deaktiviert"}</p>
        <p className="mt-2 font-script text-2xl text-rose-dark">{t.emoji} {t.title}</p>
        {member.bio && <p className="mt-2 text-sm italic">&ldquo;{member.bio}&rdquo;</p>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Strafpunkte" value={points} />
          <Stat label="Platz" value={rankIdx >= 0 ? `#${rankIdx + 1}` : "–"} />
          <Stat label="Freisprüche" value={acquitted} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Strafen erledigt" value={assigned.filter((a) => a.status === "done").length} />
          <Stat label="Petz-Score 🕵️" value={row?.reports_filed ?? 0} />
        </div>
        {favorite && (
          <p className="mt-3 text-sm">Lieblingssünde: <b>{favorite[0]}</b> ({favorite[1]}×)</p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          {isMe ? (
            <Link href="/einstellungen" className="btn btn-ghost btn-sm">Profil bearbeiten</Link>
          ) : (
            <Link href={`/melden?wer=${member.username}`} className="btn btn-primary btn-sm">🚨 {member.display_name} melden</Link>
          )}
        </div>
      </section>

      {assigned.length > 0 && (
        <section className="card">
          <h2 className="page-title mb-2 text-2xl">Strafakte</h2>
          <ul className="space-y-2 text-sm">
            {assigned.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-2xl bg-blush/40 px-3 py-2">
                <span>{a.tier_emoji ?? "💔"}</span>
                <span className="flex-1">
                  <b>{a.milestone} Punkte:</b> {a.punishment_title ?? "Rad noch nicht gedreht"}
                </span>
                <span className="chip">
                  {a.status === "spin" ? "🎡 drehen" : a.status === "open" ? "⛓️ offen" : "✅ erledigt"}
                </span>
              </li>
            ))}
          </ul>
          {isMe && assigned.some((a) => a.status === "spin") && (
            <Link href="/strafen" className="btn btn-primary btn-sm mt-3">Zum Glücksrad 🎡</Link>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="page-title mb-2 text-2xl">Vorstrafenregister</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-wine-soft">Weiße Weste. Noch. 😇</p>
        ) : (
          <ul className="divide-y divide-petal/50 text-sm">
            {reports.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-2">
                <span className="text-xl">{r.rule_emoji}</span>
                <span className="min-w-0 flex-1">
                  <b>{r.rule_title}</b>
                  {r.description && <span className="block truncate text-xs text-wine-soft">&ldquo;{r.description}&rdquo;</span>}
                  <span className="block text-xs text-wine-soft">
                    {r.accused.id === r.reporter.id ? "Selbstanzeige" : `von ${r.reporter.display_name}`} · <TimeAgo date={r.created_at} />
                  </span>
                </span>
                {r.status === "approved" && <span className="chip">+{r.points}</span>}
                {r.status === "pending" && <span className="chip">🗳️ läuft</span>}
                {r.status === "rejected" && <span className="chip bg-emerald-50 text-emerald-700">frei</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-blush/50 p-2">
      <p className="text-2xl font-black text-rose">{value}</p>
      <p className="text-[11px] font-bold text-wine-soft">{label}</p>
    </div>
  );
}
