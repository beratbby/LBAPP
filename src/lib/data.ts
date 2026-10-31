import "server-only";
import { query, queryOne } from "./db";
import { MEMBER_COLUMNS, type Member } from "./auth";

export type MemberLite = Pick<Member, "id" | "username" | "display_name" | "avatar_emoji" | "avatar_media_id">;

export type LeaderboardRow = MemberLite & {
  is_admin: boolean;
  points: number;
  pending: number;
  open_punishments: number;
  reports_filed: number;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  return query<LeaderboardRow>(`
    SELECT m.id, m.username, m.display_name, m.avatar_emoji, m.avatar_media_id, m.is_admin,
           COALESCE(SUM(r.points) FILTER (WHERE r.status = 'approved'), 0)::int AS points,
           COUNT(r.id) FILTER (WHERE r.status = 'pending')::int AS pending,
           (SELECT COUNT(*) FROM assigned_punishments ap
             WHERE ap.member_id = m.id AND ap.status <> 'done')::int AS open_punishments,
           (SELECT COUNT(*) FROM reports f
             WHERE f.reporter_id = m.id AND f.reporter_id <> f.accused_id)::int AS reports_filed
      FROM members m
      LEFT JOIN reports r ON r.accused_id = m.id
     WHERE m.active
     GROUP BY m.id
     ORDER BY points DESC, m.display_name ASC`);
}

export async function getActiveMembers(): Promise<MemberLite[]> {
  return query<MemberLite>(
    `SELECT id, username, display_name, avatar_emoji, avatar_media_id
       FROM members WHERE active ORDER BY display_name`,
  );
}

export async function getMemberByUsername(username: string): Promise<Member | null> {
  return queryOne<Member>(`SELECT ${MEMBER_COLUMNS} FROM members m WHERE m.username = $1`, [username]);
}

// ---------- Regeln & Strafen ----------

export type Rule = {
  id: number;
  emoji: string;
  title: string;
  description: string;
  points: number;
  active: boolean;
  sort_order: number;
  times_broken: number;
};

export async function getRules(includeInactive = false): Promise<Rule[]> {
  return query<Rule>(
    `SELECT ru.*, (SELECT COUNT(*) FROM reports r WHERE r.rule_id = ru.id AND r.status = 'approved')::int AS times_broken
       FROM rules ru ${includeInactive ? "" : "WHERE ru.active"}
      ORDER BY ru.sort_order, ru.id`,
  );
}

export type Tier = { id: number; threshold: number; name: string; emoji: string; description: string };
export type Punishment = { id: number; tier_id: number; title: string; description: string; active: boolean };

export async function getTiers(): Promise<Tier[]> {
  return query<Tier>("SELECT * FROM tiers ORDER BY threshold");
}

export async function getPunishments(includeInactive = false): Promise<Punishment[]> {
  return query<Punishment>(
    `SELECT id, tier_id, title, description, active FROM punishments
      ${includeInactive ? "" : "WHERE active"} ORDER BY tier_id, id`,
  );
}

// ---------- Meldungen ----------

export type ReportRow = {
  id: number;
  status: "pending" | "approved" | "rejected";
  points: number;
  description: string;
  defense: string;
  evidence_media_id: number | null;
  resolved_by_admin: boolean;
  created_at: Date;
  resolved_at: Date | null;
  rule_title: string;
  rule_emoji: string;
  accused: MemberLite;
  reporter: MemberLite;
};

const REPORT_SELECT = `
  SELECT r.id, r.status, r.points, r.description, r.defense, r.evidence_media_id, r.resolved_by_admin,
         r.created_at, r.resolved_at,
         ru.title AS rule_title, ru.emoji AS rule_emoji,
         json_build_object('id', a.id, 'username', a.username, 'display_name', a.display_name,
                           'avatar_emoji', a.avatar_emoji, 'avatar_media_id', a.avatar_media_id) AS accused,
         json_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
                           'avatar_emoji', p.avatar_emoji, 'avatar_media_id', p.avatar_media_id) AS reporter
    FROM reports r
    JOIN rules ru ON ru.id = r.rule_id
    JOIN members a ON a.id = r.accused_id
    JOIN members p ON p.id = r.reporter_id`;

export type Vote = { report_id: number; member_id: number; approve: boolean; display_name: string; avatar_emoji: string };

export async function getPendingReports(): Promise<(ReportRow & { votes: Vote[] })[]> {
  const reports = await query<ReportRow>(`${REPORT_SELECT} WHERE r.status = 'pending' ORDER BY r.created_at DESC`);
  if (reports.length === 0) return [];
  const votes = await query<Vote>(
    `SELECT v.report_id, v.member_id, v.approve, m.display_name, m.avatar_emoji
       FROM votes v JOIN members m ON m.id = v.member_id
      WHERE v.report_id = ANY($1) ORDER BY v.created_at`,
    [reports.map((r) => r.id)],
  );
  return reports.map((r) => ({ ...r, votes: votes.filter((v) => v.report_id === r.id) }));
}

export async function getRecentResolvedReports(limit = 20): Promise<ReportRow[]> {
  return query<ReportRow>(
    `${REPORT_SELECT} WHERE r.status <> 'pending' ORDER BY r.resolved_at DESC NULLS LAST LIMIT $1`,
    [limit],
  );
}

export async function getReportsAgainst(memberId: number): Promise<ReportRow[]> {
  return query<ReportRow>(`${REPORT_SELECT} WHERE r.accused_id = $1 ORDER BY r.created_at DESC`, [memberId]);
}

/** Anzahl offener Meldungen, bei denen dieser Nutzer noch abstimmen kann. */
export async function countVotesNeeded(memberId: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM reports r
      WHERE r.status = 'pending' AND r.accused_id <> $1 AND r.reporter_id <> $1
        AND NOT EXISTS (SELECT 1 FROM votes v WHERE v.report_id = r.id AND v.member_id = $1)`,
    [memberId],
  );
  return row?.n ?? 0;
}

// ---------- Vergebene Strafen ----------

export type AssignedPunishment = {
  id: number;
  member_id: number;
  tier_id: number | null;
  milestone: number;
  status: "spin" | "open" | "done";
  punishment_title: string | null;
  punishment_description: string | null;
  created_at: Date;
  spun_at: Date | null;
  done_at: Date | null;
  tier_name: string | null;
  tier_emoji: string | null;
  member: MemberLite;
  confirmed_by_name: string | null;
};

const ASSIGNED_SELECT = `
  SELECT ap.id, ap.member_id, ap.tier_id, ap.milestone, ap.status, ap.punishment_title, ap.punishment_description,
         ap.created_at, ap.spun_at, ap.done_at,
         t.name AS tier_name, t.emoji AS tier_emoji,
         json_build_object('id', m.id, 'username', m.username, 'display_name', m.display_name,
                           'avatar_emoji', m.avatar_emoji, 'avatar_media_id', m.avatar_media_id) AS member,
         c.display_name AS confirmed_by_name
    FROM assigned_punishments ap
    JOIN members m ON m.id = ap.member_id
    LEFT JOIN tiers t ON t.id = ap.tier_id
    LEFT JOIN members c ON c.id = ap.confirmed_by`;

export async function getOpenAssigned(): Promise<AssignedPunishment[]> {
  return query<AssignedPunishment>(
    `${ASSIGNED_SELECT} WHERE ap.status <> 'done' ORDER BY ap.status DESC, ap.created_at`,
  );
}

export async function getDoneAssigned(limit = 30): Promise<AssignedPunishment[]> {
  return query<AssignedPunishment>(
    `${ASSIGNED_SELECT} WHERE ap.status = 'done' ORDER BY ap.done_at DESC LIMIT $1`,
    [limit],
  );
}

export async function getAssignedFor(memberId: number): Promise<AssignedPunishment[]> {
  return query<AssignedPunishment>(`${ASSIGNED_SELECT} WHERE ap.member_id = $1 ORDER BY ap.milestone DESC`, [
    memberId,
  ]);
}

// ---------- Feed ----------

export type FeedItem =
  | { kind: "report"; at: Date; report: ReportRow }
  | { kind: "punishment"; at: Date; punishment: AssignedPunishment };

export async function getFeed(limit = 20): Promise<FeedItem[]> {
  const [reports, punishments] = await Promise.all([
    query<ReportRow>(
      `${REPORT_SELECT} ORDER BY COALESCE(r.resolved_at, r.created_at) DESC LIMIT $1`,
      [limit],
    ),
    query<AssignedPunishment>(
      `${ASSIGNED_SELECT} ORDER BY COALESCE(ap.done_at, ap.spun_at, ap.created_at) DESC LIMIT $1`,
      [limit],
    ),
  ]);
  const items: FeedItem[] = [
    ...reports.map((r) => ({ kind: "report" as const, at: r.resolved_at ?? r.created_at, report: r })),
    ...punishments.map((p) => ({
      kind: "punishment" as const,
      at: p.done_at ?? p.spun_at ?? p.created_at,
      punishment: p,
    })),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
