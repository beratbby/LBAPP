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
      // FOR UPDATE sperrt die Einladung, damit das Limit auch bei gleichzeitigen Anmeldungen hält.
      const invite = await queryOne<{ max_uses: number | null }>(
        "SELECT max_uses FROM invites WHERE code = $1 FOR UPDATE",
        [code],
        client,
      );
      if (!invite) return "invalid" as const;
      const used = await queryOne<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM members WHERE invite_code = $1",
        [code],
        client,
      );
      if (invite.max_uses !== null && (used?.n ?? 0) >= invite.max_uses) return "invalid" as const;
      const row = await queryOne<{ id: number }>(
        `INSERT INTO members (username, display_name, password_hash, avatar_emoji, invite_code)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, displayName, passwordHash, emoji, code],
        client,
      );
      await createSession(row!.id, client);
      return "ok" as const;
    });
    if (result === "invalid") return { error: "Diese Einladung ist ungültig oder schon voll." };
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Der Benutzername ist schon vergeben." };
    throw err;
  }
  redirect("/?willkommen=1");
}
