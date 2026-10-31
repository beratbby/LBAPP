"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "../db";
import { hashPassword, requireMember, validatePassword, verifyPassword } from "../auth";
import { saveImage, UserError } from "../game";
import type { FormState } from "./types";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const emoji = String(formData.get("avatar_emoji") ?? "").trim().slice(0, 8) || me.avatar_emoji;
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  const removeAvatar = formData.get("remove_avatar") === "on";
  if (displayName.length < 2 || displayName.length > 30) return { error: "Anzeigename: 2 bis 30 Zeichen." };

  let avatarId: number | null = removeAvatar ? null : me.avatar_media_id;
  try {
    const uploaded = await saveImage(formData.get("avatar"), me.id);
    if (uploaded) avatarId = uploaded;
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    throw err;
  }
  await query(
    "UPDATE members SET display_name = $1, avatar_emoji = $2, bio = $3, avatar_media_id = $4 WHERE id = $5",
    [displayName, emoji, bio, avatarId, me.id],
  );
  if (me.avatar_media_id && me.avatar_media_id !== avatarId) {
    await query("DELETE FROM media WHERE id = $1", [me.avatar_media_id]);
  }
  revalidatePath("/", "layout");
  return { ok: "Profil gespeichert. Siehst gut aus, Romeo." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM members WHERE id = $1", [me.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: "Aktuelles Passwort stimmt nicht." };
  const invalid = validatePassword(next);
  if (invalid) return { error: invalid };
  await query("UPDATE members SET password_hash = $1 WHERE id = $2", [await hashPassword(next), me.id]);
  return { ok: "Passwort geändert." };
}
