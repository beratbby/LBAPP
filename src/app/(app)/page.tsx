import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { countVotesNeeded, getFeed, getLeaderboard, getTiers } from "@/lib/data";
import { titleFor } from "@/lib/game";
import { Avatar } from "@/components/Avatar";
import { Feed } from "./_components/Feed";

const MEDALS = ["🥀", "💔", "💌"];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  const sp = await searchParams;
  const [board, feed, votesNeeded, tiers] = await Promise.all([
    getLeaderboard(),
    getFeed(15),
    countVotesNeeded(me.id),
    getTiers(),
  ]);
  const mine = board.find((b) => b.id === me.id);
  const myPoints = mine?.points ?? 0;
  const nextTier = tiers.find((t) => t.threshold > myPoints);
  const myTitle = titleFor(myPoints);

  return (
    <>
      {sp.willkommen && (
        <div className="card border-rose bg-blush/60 text-center">
          <p className="text-3xl">🌹</p>
          <p className="font-black tracking-tight text-2xl text-rose-dark">Willkommen bei den LoverBoys!</p>
          <p className="text-sm">Lies den <Link href="/kodex" className="font-bold underline">Kodex</Link>. Unwissenheit schützt vor Strafe nicht.</p>
        </div>
      )}
      {sp.selbstanzeige && (
        <div className="card border-rose bg-blush/60 text-center text-sm font-semibold">
          🫡 Selbstanzeige angenommen. Ehrlichkeit ist sexy, der Punkt zählt trotzdem.
        </div>
      )}

      {/* Mein Status */}
      <section className="card flex items-center gap-4">
        <Avatar member={me} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-wine-soft">Hey {me.display_name}, du bist aktuell</p>
          <p className="font-black tracking-tight text-2xl text-rose-dark">{myTitle.emoji} {myTitle.title}</p>
          <p className="text-sm">
            <b className="text-2xl text-rose">{myPoints}</b> Strafpunkte
            {nextTier && <span className="text-wine-soft"> · noch {nextTier.threshold - myPoints} bis {nextTier.emoji} {nextTier.name}</span>}
          </p>
          {nextTier && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blush">
              <div
                className="h-full rounded-full bg-linear-to-r from-pink-400 to-rose"
                style={{ width: `${Math.min(100, (myPoints / nextTier.threshold) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </section>

      {(mine?.open_punishments ?? 0) > 0 && (
        <Link href="/strafen" className="card flex items-center gap-3 border-rose bg-rose text-white">
          <span className="text-3xl wobble">🎡</span>
          <span className="flex-1 font-bold">Dein Schicksal wartet. Du hast eine offene Strafe!</span>
          <span>→</span>
        </Link>
      )}
      {votesNeeded > 0 && (
        <Link href="/abstimmen" className="card flex items-center gap-3 bg-blush/70">
          <span className="text-3xl">🗳️</span>
          <span className="flex-1 font-bold text-rose-dark">
            {votesNeeded === 1 ? "1 Meldung wartet" : `${votesNeeded} Meldungen warten`} auf dein Urteil
          </span>
          <span>→</span>
        </Link>
      )}

      {/* Hall of Shame */}
      <section className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="page-title">Hall of Shame</h2>
          <span className="text-xs text-wine-soft">Platz 1 = am wenigsten LoverBoy</span>
        </div>
        <ol className="divide-y divide-petal/50">
          {board.map((row, i) => {
            const t = titleFor(row.points);
            return (
              <li key={row.id}>
                <Link
                  href={`/profil/${row.username}`}
                  className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-blush/50 ${row.id === me.id ? "bg-blush/40" : ""}`}
                >
                  <span className="w-7 text-center text-lg font-extrabold text-wine-soft">
                    {row.points > 0 && i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <Avatar member={row} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">
                      {row.display_name}
                      {row.open_punishments > 0 && <span className="ml-1" title="Offene Strafe">⛓️</span>}
                    </p>
                    <p className="truncate text-xs text-wine-soft">
                      {t.emoji} {t.title}
                      {row.pending > 0 && <span className="ml-1 chip">+{row.pending} unter Verdacht</span>}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-rose">{row.points}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2 className="page-title mb-3">Neueste Skandale</h2>
        <Feed items={feed} />
      </section>
    </>
  );
}
