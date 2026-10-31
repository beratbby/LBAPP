"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { queryOne, transaction } from "../db";
import { requireAdmin, requireMember } from "../auth";
import { resolveReport, saveImage, tallyReport, UserError } from "../game";
import type { FormState } from "./types";

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function createReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember();
  const accusedId = Number(formData.get("accused_id"));
  const ruleId = Number(formData.get("rule_id"));
  const description = String(formData.get("description") ?? "").trim().slice(0, 600);

  if (!Number.isInteger(accusedId) || accusedId <= 0) return { error: "Wen willst du melden?" };
  if (!Number.isInteger(ruleId) || ruleId <= 0) return { error: "Welche Regel wurde gebrochen?" };

  let selfReport = false;
  try {
    await transaction(async (client) => {
      const accused = await queryOne("SELECT id FROM members WHERE id = $1 AND active", [accusedId], client);
      if (!accused) throw new UserError("Diesen LoverBoy gibt es nicht.");
      const rule = await queryOne<{ points: number }>(
        "SELECT points FROM rules WHERE id = $1 AND active",
        [ruleId],
        client,
      );
      if (!rule) throw new UserError("Diese Regel gibt es nicht (mehr).");
      const mediaId = await saveImage(formData.get("evidence"), me.id, client);
      const report = await queryOne<{ id: number }>(
        `INSERT INTO reports (accused_id, reporter_id, rule_id, points, description, evidence_media_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [accusedId, me.id, ruleId, rule.points, description, mediaId],
        client,
      );
      // Selbstanzeige zählt sofort, Ehrlichkeit wird belohnt (mit einem Punkt).
      if (accusedId === me.id) {
        selfReport = true;
        await resolveReport(report!.id, true, false, client);
      }
    });
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    throw err;
  }
  refreshAll();
  redirect(selfReport ? "/?selbstanzeige=1" : "/abstimmen?gemeldet=1");
}

export async function vote(reportId: number, approve: boolean): Promise<void> {
  const me = await requireMember();
  await transaction(async (client) => {
    const report = await queryOne<{ accused_id: number; reporter_id: number; status: string }>(
      "SELECT accused_id, reporter_id, status FROM reports WHERE id = $1 FOR UPDATE",
      [reportId],
      client,
    );
    if (!report || report.status !== "pending") return;
    if (report.accused_id === me.id || report.reporter_id === me.id) return;
    await client.query(
      `INSERT INTO votes (report_id, member_id, approve) VALUES ($1, $2, $3)
       ON CONFLICT (report_id, member_id) DO UPDATE SET approve = EXCLUDED.approve, created_at = now()`,
      [reportId, me.id, approve],
    );
    await tallyReport(reportId, client);
  });
  refreshAll();
}

export async function setDefense(reportId: number, formData: FormData): Promise<void> {
  const me = await requireMember();
  const defense = String(formData.get("defense") ?? "").trim().slice(0, 600);
  await queryOne(
    "UPDATE reports SET defense = $1 WHERE id = $2 AND accused_id = $3 AND status = 'pending'",
    [defense, reportId, me.id],
  );
  refreshAll();
}

export async function withdrawReport(reportId: number): Promise<void> {
  const me = await requireMember();
  await queryOne("DELETE FROM reports WHERE id = $1 AND reporter_id = $2 AND status = 'pending'", [
    reportId,
    me.id,
  ]);
  refreshAll();
}

export async function adminResolve(reportId: number, approve: boolean): Promise<void> {
  await requireAdmin();
  await transaction((client) => resolveReport(reportId, approve, true, client));
  refreshAll();
}

export async function adminDeleteReport(reportId: number): Promise<void> {
  await requireAdmin();
  await queryOne("DELETE FROM reports WHERE id = $1", [reportId]);
  refreshAll();
}
