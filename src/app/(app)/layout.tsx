import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { countVotesNeeded } from "@/lib/data";
import { queryOne } from "@/lib/db";
import { BottomNav } from "@/components/BottomNav";
import { LogoMark, Wordmark } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const [votesNeeded, spins] = await Promise.all([
    countVotesNeeded(me.id),
    queryOne<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM assigned_punishments WHERE member_id = $1 AND status = 'spin'",
      [me.id],
    ),
  ]);
  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-petal/60 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={34} />
            <Wordmark className="text-2xl" />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="/kodex" className="btn btn-ghost btn-sm">📜 Kodex</Link>
            {me.is_admin && <Link href="/admin" className="btn btn-ghost btn-sm">👑</Link>}
            <Link href="/einstellungen" aria-label="Einstellungen">
              <Avatar member={me} size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 pt-5">{children}</main>
      <BottomNav votesNeeded={votesNeeded} spinsWaiting={spins?.n ?? 0} username={me.username} />
    </div>
  );
}
