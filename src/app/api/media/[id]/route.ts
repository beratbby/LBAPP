import { getCurrentMember } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/media/[id]">) {
  if (!(await getCurrentMember())) return new Response("Nicht eingeloggt", { status: 401 });
  const { id } = await ctx.params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) return new Response("Ungültig", { status: 400 });
  const media = await queryOne<{ mime: string; data: Buffer }>("SELECT mime, data FROM media WHERE id = $1", [mediaId]);
  if (!media) return new Response("Nicht gefunden", { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.mime,
      // Bilder ändern sich nie (neue Uploads bekommen neue IDs).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
