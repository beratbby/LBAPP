"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { query, queryOne, transaction } from "../db";
import { requireMember } from "../auth";

export type SpinResult =
  | { ok: true; punishmentId: number; title: string; description: string }
  | { ok: false; error: string };

/** Glücksrad: der Server entscheidet, das Rad dreht sich nur hübsch dorthin. */
export async function spinWheel(assignedId: number): Promise<SpinResult> {
  const me = await requireMember();
  const result = await transaction(async (client): Promise<SpinResult> => {
    const ap = await queryOne<{ member_id: number; tier_id: number | null; status: string }>(
      "SELECT member_id, tier_id, status FROM assigned_punishments WHERE id = $1 FOR UPDATE",
      [assignedId],
      client,
    );
    if (!ap) return { ok: false, error: "Strafe nicht gefunden." };
    if (ap.member_id !== me.id && !me.is_admin) return { ok: false, error: "Nur der Verurteilte darf drehen." };
    if (ap.status !== "spin") return { ok: false, error: "Hier wurde schon gedreht." };

    let candidates = await query<{ id: number; title: string; description: string }>(
      "SELECT id, title, description FROM punishments WHERE tier_id = $1 AND active ORDER BY id",
      [ap.tier_id],
      client,
    );
    if (candidates.length === 0) {
      candidates = await query("SELECT id, title, description FROM punishments WHERE active ORDER BY id", [], client);
    }
    if (candidates.length === 0) return { ok: false, error: "Der Strafen-Pool ist leer. Der Admin muss nachlegen." };

    const pick = candidates[randomInt(candidates.length)];
    await client.query(
      `UPDATE assigned_punishments
          SET punishment_id = $2, punishment_title = $3, punishment_description = $4, status = 'open', spun_at = now()
        WHERE id = $1`,
      [assignedId, pick.id, pick.title, pick.description],
    );
    return { ok: true, punishmentId: pick.id, title: pick.title, description: pick.description };
  });
  // Kein revalidate hier: die Seite aktualisiert sich nach der Rad-Animation selbst.
  return result;
}

/** Ein anderer LoverBoy bestätigt, dass die Strafe erledigt ist. */
export async function confirmDone(assignedId: number): Promise<void> {
  const me = await requireMember();
  await queryOne(
    `UPDATE assigned_punishments SET status = 'done', done_at = now(), confirmed_by = $2
      WHERE id = $1 AND status = 'open' AND (member_id <> $2 OR $3)`,
    [assignedId, me.id, me.is_admin],
  );
  revalidatePath("/", "layout");
}
