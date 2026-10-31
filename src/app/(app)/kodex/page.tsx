import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getRules, getTiers } from "@/lib/data";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "Kodex" };

export default async function KodexPage() {
  const me = await requireMember();
  const [rules, tiers] = await Promise.all([getRules(), getTiers()]);
  return (
    <>
      <section className="card text-center">
        <LogoMark size={64} className="mx-auto" />
        <h1 className="page-title mt-2">Der LoverBoy-Kodex</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-wine-soft italic">
          Wir, die LoverBoys, schwören feierlich, die folgenden Gebote zu ehren. Wer sie bricht, zahlt mit Punkten und mit Würde.
        </p>
      </section>

      <ol className="space-y-3">
        {rules.map((r, i) => (
          <li key={r.id} className="card flex gap-4">
            <span className="font-black tracking-tight text-3xl text-petal">{i + 1}.</span>
            <div className="flex-1">
              <p className="font-extrabold">{r.emoji} {r.title}</p>
              <p className="text-sm text-wine-soft">{r.description}</p>
              <p className="mt-1 text-xs text-wine-soft">
                <span className="chip">+{r.points} {r.points === 1 ? "Punkt" : "Punkte"}</span>
                {r.times_broken > 0 && <span className="ml-2">schon {r.times_broken}× gebrochen</span>}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section className="card">
        <h2 className="page-title text-2xl">Konsequenzen</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {tiers.map((t) => (
            <li key={t.id}>{t.emoji} <b>ab {t.threshold} Punkten:</b> {t.name}, Glücksrad wird gedreht</li>
          ))}
        </ul>
        <p className="mt-3 rounded-2xl bg-blush/50 p-3 text-xs text-wine-soft">
          🤝 Ehrenwort: Alle Strafen bleiben respektvoll. Niemand wird gegen seinen Willen bloßgestellt, und wer bei einer Strafe mitmachen muss, macht freiwillig mit.
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/melden" className="btn btn-primary btn-sm">Verstoß melden</Link>
          {me.is_admin && <Link href="/admin#kodex" className="btn btn-ghost btn-sm">Kodex bearbeiten 👑</Link>}
        </div>
      </section>
    </>
  );
}
