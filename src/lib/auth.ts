import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne, type Db } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "lb_session";
const SESSION_DAYS = 60;

export type Member = {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  active: boolean;
  avatar_emoji: string;
  avatar_media_id: number | null;
  bio: string;
};

export const MEMBER_COLUMNS =
  "m.id, m.username, m.display_name, m.is_admin, m.active, m.avatar_emoji, m.avatar_media_id, m.bio";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(memberId: number, client?: Db): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO sessions (token_hash, member_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), memberId, expires],
    client,
  );
  // Gelegentlich abgelaufene Sessions aufräumen.
  await query("DELETE FROM sessions WHERE expires_at < now()", [], client);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Der eingeloggte Nutzer oder null. Pro Request nur einmal aus der DB gelesen. */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<Member>(
    `SELECT ${MEMBER_COLUMNS}
       FROM sessions s JOIN members m ON m.id = s.member_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND m.active`,
    [hashToken(token)],
  );
});

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.is_admin) redirect("/");
  return member;
}

export async function memberCount(): Promise<number> {
  const row = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM members");
  return row?.n ?? 0;
}

const USERNAME_RE = /^[a-z0-9_.-]{3,20}$/;

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/** Prüft Registrierungsdaten. Gibt eine Fehlermeldung oder null zurück. */
export function validateSignup(username: string, displayName: string, password: string): string | null {
  if (!USERNAME_RE.test(username))
    return "Benutzername: 3 bis 20 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt, Minus oder Unterstrich.";
  if (displayName.length < 2 || displayName.length > 30) return "Anzeigename: 2 bis 30 Zeichen.";
  return validatePassword(password);
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Passwort: mindestens 6 Zeichen.";
  if (password.length > 200) return "Passwort ist zu lang.";
  return null;
}
