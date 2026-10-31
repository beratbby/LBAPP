import Link from "next/link";
import type { FeedItem } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { TimeAgo } from "@/components/TimeAgo";

function Name({ m }: { m: { username: string; display_name: string } }) {
  return (
    <Link href={`/profil/${m.username}`} className="font-extrabold text-rose-dark hover:underline">
      {m.display_name}
    </Link>
  );
}

export function Feed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-center text-sm text-wine-soft">Noch alles ruhig. Verdächtig ruhig. 🤨</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        if (it.kind === "report") {
          const r = it.report;
          const self = r.accused.id === r.reporter.id;
          return (
            <li key={`r${r.id}`} className="flex gap-3">
              <Avatar member={r.accused} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                {r.status === "pending" && (
                  <p>
                    <Name m={r.reporter} /> hat <Name m={r.accused} /> gemeldet: {r.rule_emoji} {r.rule_title}{" "}
                    <span className="chip">🗳️ läuft</span>
                  </p>
                )}
                {r.status === "approved" && (
                  <p>
                    <Name m={r.accused} /> kassiert <b className="text-rose">+{r.points}</b> für {r.rule_emoji} {r.rule_title}
                    {self ? " (Selbstanzeige, Respekt 🫡)" : ""}
                  </p>
                )}
                {r.status === "rejected" && (
                  <p>
                    Freispruch für <Name m={r.accused} />: {r.rule_emoji} {r.rule_title} 🕊️
                  </p>
                )}
                <p className="text-xs text-wine-soft"><TimeAgo date={it.at} /></p>
              </div>
            </li>
          );
        }
        const p = it.punishment;
        return (
          <li key={`p${p.id}`} className="flex gap-3">
            <Avatar member={p.member} size="sm" />
            <div className="min-w-0 flex-1 text-sm">
              {p.status === "spin" && (
                <p>
                  <Name m={p.member} /> hat <b>{p.milestone} Punkte</b> erreicht. {p.tier_emoji} {p.tier_name}! Das Rad wartet. 🎡
                </p>
              )}
              {p.status === "open" && (
                <p>
                  <Name m={p.member} /> muss jetzt: <b>{p.punishment_title}</b> 😬
                </p>
              )}
              {p.status === "done" && (
                <p>
                  <Name m={p.member} /> hat <b>{p.punishment_title}</b> durchgezogen ✅
                </p>
              )}
              <p className="text-xs text-wine-soft"><TimeAgo date={it.at} /></p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
