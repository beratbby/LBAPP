import type { MemberLite } from "@/lib/data";

const SIZES = {
  sm: "h-8 w-8 text-base",
  md: "h-11 w-11 text-xl",
  lg: "h-20 w-20 text-4xl",
  xl: "h-28 w-28 text-6xl",
};

export function Avatar({
  member,
  size = "md",
}: {
  member: Pick<MemberLite, "display_name" | "avatar_emoji" | "avatar_media_id">;
  size?: keyof typeof SIZES;
}) {
  const cls = `${SIZES[size]} shrink-0 rounded-full ring-2 ring-white shadow-sm`;
  if (member.avatar_media_id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/media/${member.avatar_media_id}`} alt={member.display_name} className={`${cls} object-cover`} />
    );
  }
  return (
    <span className={`${cls} flex items-center justify-center bg-linear-to-br from-blush to-petal`} aria-hidden>
      {member.avatar_emoji}
    </span>
  );
}
