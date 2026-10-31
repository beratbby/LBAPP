"use server";

import { redirect } from "next/navigation";
import { queryOne, transaction } from "../db";
import {
  createSession,
  destroySession,
  hashPassword,
  normalizeUsername,
  validateSignup,
  verifyPassword,
} from "../auth";
import type { FormState } from "./types";

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");
  const member = await queryOne<{ id: number; password_hash: string; active: boolean }>(
    "SELECT id, password_hash, active FROM members WHERE username = $1",
    [username],
  );
  if (!member || !(await verifyPassword(password, member.password_hash))) {
    return { error: "Falscher Benutzername oder falsches Passwort. Wie beim Flirten: nochmal probieren." };
  }
  if (!member.active) return { error: "Dein Account ist deaktiviert. Frag den Admin." };
  await createSession(member.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Erster Start: der erste Account wird Admin. */
export async function setupAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = normalizeUsername(formData.get("username"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const invalid = validateSignup(username, displayName, password);
  if (invalid) return { error: invalid };

  const passwordHash = await hashPassword(password);
  const created = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(777)");
    const existing = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM members", [], client);
    if ((existing?.n ?? 0) > 0) return false;
    const row = await queryOne<{ id: number }>(
      `INSERT INTO members (username, display_name, password_hash, is_admin, avatar_emoji)
       VALUES ($1, $2, $3, true, '👑') RETURNING id`,
      [username, displayName, passwordHash],
      client,
    );
    await createSession(row!.id, client);
    return true;
  });
  if (!created) redirect("/login");
  redirect("/");
}

export async function registerWithInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  const username = normalizeUsername(formData.get("username"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const emoji = String(formData.get("avatar_emoji") ?? "😎").slice(0, 8) || "😎";
  const invalid = validateSignup(username, displayName, password);
  if (invalid) return { error: invalid };

  const passwordHash = await hashPassword(password);
  try {
    const result = await transaction(async (client) => {
      const invite = await queryOne<{ code: string }>(
        "SELECT code FROM invites WHERE code = $1 AND used_by IS NULL FOR UPDATE",
        [code],
        client,
      );
      if (!invite) return "invalid" as const;
      const row = await queryOne<{ id: number }>(
        `INSERT INTO members (username, display_name, password_hash, avatar_emoji)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [username, displayName, passwordHash, emoji],
        client,
      );
      await client.query("UPDATE invites SET used_by = $1, used_at = now() WHERE code = $2", [row!.id, code]);
      await createSession(row!.id, client);
      return "ok" as const;
    });
    if (result === "invalid") return { error: "Diese Einladung ist ungültig oder wurde schon benutzt." };
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Der Benutzername ist schon vergeben." };
    throw err;
  }
  redirect("/?willkommen=1");
}
