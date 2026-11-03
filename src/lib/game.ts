import "server-only";
import { query, queryOne, type Db } from "./db";

// ---------- Titel nach Punktestand ----------

// Je mehr Strafpunkte, desto weniger LoverBoy.
const TITLES: { min: number; title: string; emoji: string }[] = [
  { min: 15, title: "Ex-LoverBoy", emoji: "🚫" },
  { min: 10, title: "Gefallener LoverBoy", emoji: "🥀" },
  { min: 5, title: "LoverBoy auf Bewährung", emoji: "💔" },
  { min: 3, title: "Wackel-LoverBoy", emoji: "🫣" },
  { min: 1, title: "LoverBoy mit Kratzer", emoji: "🩹" },
  { min: 0, title: "Ehren-LoverBoy", emoji: "👑" },
];

export function titleFor(points: number) {
  return TITLES.find((t) => points >= t.min) ?? TITLES[TITLES.length - 1];
}

// ---------- Einstellungen ----------

export type Settings = {
  votes_required: number;
  rejects_required: number;
  repeat_every: number;
};

const DEFAULT_SETTINGS: Settings = { votes_required: 3, rejects_required: 3, repeat_every: 5 };

export async function getSettings(client?: Db): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings", [], client);
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in s) {
      const n = Number.parseInt(r.value, 10);
      if (Number.isFinite(n)) s[r.key as keyof Settings] = n;
    }
  }
  return s;
}

// ---------- Strafstufen ----------

export type TierLite = { id: number; threshold: number };

/** Alle Punktestände, an denen eine Strafe fällig wird, bis einschließlich `points`. */
export function milestonesFor(points: number, tiers: TierLite[], repeatEvery: number) {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  const out: { milestone: number; tierId: number }[] = [];
  for (const t of sorted) if (t.threshold <= points) out.push({ milestone: t.threshold, tierId: t.id });
  const top = sorted[sorted.length - 1];
  if (top && repeatEvery > 0) {
    for (let m = top.threshold + repeatEvery; m <= points; m += repeatEvery) {
      out.push({ milestone: m, tierId: top.id });
    }
  }
  return out;
}

export async function pointsOf(memberId: number, client?: Db): Promise<number> {
  const row = await queryOne<{ points: number }>(
    "SELECT COALESCE(SUM(points), 0)::int AS points FROM reports WHERE accused_id = $1 AND status = 'approved'",
    [memberId],
    client,
  );
  return row?.points ?? 0;
}

/** Legt fällige Strafen an, die es noch nicht gibt. */
export async function syncPunishments(memberId: number, client: Db): Promise<void> {
  const points = await pointsOf(memberId, client);
  const tiers = await query<TierLite>("SELECT id, threshold FROM tiers", [], client);
  const { repeat_every } = await getSettings(client);
  for (const m of milestonesFor(points, tiers, repeat_every)) {
    await query(
      `INSERT INTO assigned_punishments (member_id, tier_id, milestone)
       VALUES ($1, $2, $3) ON CONFLICT (member_id, milestone) DO NOTHING`,
      [memberId, m.tierId, m.milestone],
      client,
    );
  }
}

// ---------- Meldungen entscheiden ----------

export async function resolveReport(
  reportId: number,
  approve: boolean,
  byAdmin: boolean,
  client: Db,
): Promise<void> {
  const report = await queryOne<{ accused_id: number }>(
    `UPDATE reports SET status = $2, resolved_at = now(), resolved_by_admin = $3
      WHERE id = $1 AND status = 'pending' RETURNING accused_id`,
    [reportId, approve ? "approved" : "rejected", byAdmin],
    client,
  );
  if (report && approve) await syncPunishments(report.accused_id, client);
}

/** Zählt die Stimmen und entscheidet die Meldung, wenn genug zusammen sind. */
export async function tallyReport(reportId: number, client: Db): Promise<void> {
  const counts = await queryOne<{ yes: number; no: number }>(
    `SELECT COUNT(*) FILTER (WHERE approve)::int AS yes,
            COUNT(*) FILTER (WHERE NOT approve)::int AS no
       FROM votes WHERE report_id = $1`,
    [reportId],
    client,
  );
  const s = await getSettings(client);
  if (!counts) return;
  if (counts.yes >= s.votes_required) await resolveReport(reportId, true, false, client);
  else if (counts.no >= s.rejects_required) await resolveReport(reportId, false, false, client);
}

// ---------- Bilder ----------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Speichert ein hochgeladenes Bild. Gibt die ID zurück, null wenn keins da ist, oder wirft einen Fehlertext. */
export async function saveImage(file: FormDataEntryValue | null, memberId: number, client?: Db) {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new UserError("Nur Bilder (JPG, PNG, WebP, GIF) erlaubt.");
  if (file.size > MAX_IMAGE_BYTES) throw new UserError("Bild ist zu groß (max. 5 MB).");
  const data = Buffer.from(await file.arrayBuffer());
  const row = await queryOne<{ id: number }>(
    "INSERT INTO media (mime, data, uploaded_by) VALUES ($1, $2, $3) RETURNING id",
    [file.type, data, memberId],
    client,
  );
  return row!.id;
}

/** Fehler, deren Text dem Nutzer angezeigt werden darf. */
export class UserError extends Error {}
