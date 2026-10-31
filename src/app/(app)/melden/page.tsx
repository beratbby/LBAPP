import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getActiveMembers, getRules } from "@/lib/data";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Melden" };

export default async function ReportPage({ searchParams }: PageProps<"/melden">) {
  const me = await requireMember();
  const { wer } = await searchParams;
  const [members, rules] = await Promise.all([getActiveMembers(), getRules()]);
  const preselected = members.find((m) => m.username === wer)?.id;
  return (
    <>
      <div>
        <h1 className="page-title">Verstoß melden 🚨</h1>
        <p className="text-sm text-wine-soft">
          Jemand hat gegen den Kodex verstoßen? Die Jungs stimmen ab, ob der Punkt zählt. Selbstanzeigen zählen sofort.
        </p>
      </div>
      <ReportForm members={members} rules={rules} meId={me.id} preselected={preselected} />
    </>
  );
}
