"use server";

import { randomBytes, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "../db";
import { hashPassword, requireAdmin } from "../auth";
import type { FormState } from "./types";

function refreshAll() {
  revalidatePath("/", "layout");
}

function str(fd: FormData, key: string, max = 300) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function int(fd: FormData, key: string) {
  const n = Number.parseInt(String(fd.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

// ---------- Mitglieder ----------

export async function toggleAdmin(memberId: number): Promise<void> {
  const me = await requireAdmin();
  if (memberId === me.id) return; // sich selbst nicht entmachten
  await query("UPDATE members SET is_admin = NOT is_admin WHERE id = $1", [memberId]);
  refreshAll();
}

export async function toggleActive(memberId: number): Promise<void> {
  const me = await requireAdmin();
  if (memberId === me.id) return;
  await query("UPDATE members SET active = NOT active WHERE id = $1", [memberId]);
  await query("DELETE FROM sessions WHERE member_id = $1", [memberId]);
  refreshAll();
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const memberId = int(fd, "member_id");
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pw = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const row = await queryOne<{ display_name: string }>(
    "UPDATE members SET password_hash = $1 WHERE id = $2 RETURNING display_name",
    [await hashPassword(pw), memberId],
  );
  if (!row) return { error: "Mitglied nicht gefunden." };
  await query("DELETE FROM sessions WHERE member_id = $1", [memberId]);
  return { ok: `Neues Passwort für ${row.display_name}: ${pw}` };
}

// ---------- Einladungen ----------

export async function createInvite(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const raw = String(fd.get("max_uses") ?? "").trim();
  const maxUses = raw === "" || raw === "0" ? null : Number.parseInt(raw, 10);
  if (maxUses !== null && !(maxUses >= 1 && maxUses <= 100)) return { error: "Limit: 1 bis 100, oder leer für unbegrenzt." };
  const code = randomBytes(6).toString("base64url").replace(/[-_]/g, "x");
  await query("INSERT INTO invites (code, created_by, max_uses) VALUES ($1, $2, $3)", [code, me.id, maxUses]);
  refreshAll();
  return { ok: "Einladungslink erstellt." };
}

/** Löscht den Link. Wer sich schon darüber angemeldet hat, bleibt Mitglied. */
export async function deleteInvite(code: string): Promise<void> {
  await requireAdmin();
  await query("DELETE FROM invites WHERE code = $1", [code]);
  refreshAll();
}

// ---------- Regeln ----------

export async function saveRule(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title", 80);
  const description = str(fd, "description", 400);
  const emoji = str(fd, "emoji", 8) || "⚠️";
  const points = int(fd, "points");
  if (title.length < 3) return { error: "Titel ist zu kurz." };
  if (!(points >= 1 && points <= 20)) return { error: "Punkte: 1 bis 20." };
  if (Number.isFinite(id)) {
    await query("UPDATE rules SET title = $1, description = $2, emoji = $3, points = $4 WHERE id = $5", [
      title,
      description,
      emoji,
      points,
      id,
    ]);
  } else {
    await query(
      `INSERT INTO rules (title, description, emoji, points, sort_order)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM rules))`,
      [title, description, emoji, points],
    );
  }
  refreshAll();
  return { ok: Number.isFinite(id) ? "Regel gespeichert." : "Neue Regel im Kodex." };
}

export async function toggleRule(id: number): Promise<void> {
  await requireAdmin();
  await query("UPDATE rules SET active = NOT active WHERE id = $1", [id]);
  refreshAll();
}

export async function deleteRule(id: number): Promise<void> {
  await requireAdmin();
  const used = await queryOne("SELECT 1 FROM reports WHERE rule_id = $1 LIMIT 1", [id]);
  // Regeln mit Meldungen werden nur deaktiviert, damit die Historie bleibt.
  if (used) await query("UPDATE rules SET active = false WHERE id = $1", [id]);
  else await query("DELETE FROM rules WHERE id = $1", [id]);
  refreshAll();
}

// ---------- Strafstufen ----------

export async function saveTier(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const name = str(fd, "name", 60);
  const emoji = str(fd, "emoji", 8) || "💔";
  const description = str(fd, "description", 300);
  const threshold = int(fd, "threshold");
  if (name.length < 2) return { error: "Name ist zu kurz." };
  if (!(threshold >= 1 && threshold <= 1000)) return { error: "Ab-Punkte: 1 bis 1000." };
  try {
    if (Number.isFinite(id)) {
      await query("UPDATE tiers SET name = $1, emoji = $2, description = $3, threshold = $4 WHERE id = $5", [
        name,
        emoji,
        description,
        threshold,
        id,
      ]);
    } else {
      await query("INSERT INTO tiers (name, emoji, description, threshold) VALUES ($1, $2, $3, $4)", [
        name,
        emoji,
        description,
        threshold,
      ]);
    }
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Es gibt schon eine Stufe ab ${threshold} Punkten.` };
    throw err;
  }
  refreshAll();
  return { ok: "Stufe gespeichert." };
}

export async function deleteTier(id: number): Promise<void> {
  await requireAdmin();
  await query("DELETE FROM tiers WHERE id = $1", [id]);
  refreshAll();
}

// ---------- Strafen-Pool ----------

export async function savePunishment(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const tierId = int(fd, "tier_id");
  const title = str(fd, "title", 80);
  const description = str(fd, "description", 400);
  if (title.length < 3) return { error: "Titel ist zu kurz." };
  const tier = await queryOne("SELECT 1 FROM tiers WHERE id = $1", [tierId]);
  if (!tier) return { error: "Bitte eine Stufe wählen." };
  if (Number.isFinite(id)) {
    await query("UPDATE punishments SET title = $1, description = $2, tier_id = $3 WHERE id = $4", [
      title,
      description,
      tierId,
      id,
    ]);
  } else {
    await query("INSERT INTO punishments (title, description, tier_id) VALUES ($1, $2, $3)", [
      title,
      description,
      tierId,
    ]);
  }
  refreshAll();
  return { ok: "Strafe gespeichert." };
}

export async function togglePunishment(id: number): Promise<void> {
  await requireAdmin();
  await query("UPDATE punishments SET active = NOT active WHERE id = $1", [id]);
  refreshAll();
}

export async function deletePunishment(id: number): Promise<void> {
  await requireAdmin();
  await query("DELETE FROM punishments WHERE id = $1", [id]);
  refreshAll();
}

// ---------- Einstellungen ----------

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const values = {
    votes_required: int(fd, "votes_required"),
    rejects_required: int(fd, "rejects_required"),
    repeat_every: int(fd, "repeat_every"),
  };
  if (!(values.votes_required >= 1 && values.votes_required <= 20)) return { error: "Bestätigungen: 1 bis 20." };
  if (!(values.rejects_required >= 1 && values.rejects_required <= 20)) return { error: "Ablehnungen: 1 bis 20." };
  if (!(values.repeat_every >= 0 && values.repeat_every <= 100)) return { error: "Wiederholung: 0 bis 100." };
  for (const [key, value] of Object.entries(values)) {
    await query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [key, String(value)],
    );
  }
  refreshAll();
  return { ok: "Einstellungen gespeichert." };
}
