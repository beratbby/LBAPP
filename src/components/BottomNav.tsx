"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ votesNeeded, spinsWaiting, username }: { votesNeeded: number; spinsWaiting: number; username: string }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Start", icon: "🏠", badge: 0 },
    { href: "/abstimmen", label: "Abstimmen", icon: "🗳️", badge: votesNeeded },
    { href: "/melden", label: "Melden", icon: "🚨", badge: 0, primary: true },
    { href: "/strafen", label: "Strafen", icon: "🎡", badge: spinsWaiting },
    { href: `/profil/${username}`, label: "Profil", icon: "😎", badge: 0 },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-petal/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-2xl items-end justify-around px-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition ${
                  active ? "text-rose" : "text-wine-soft hover:text-rose-dark"
                }`}
              >
                {it.primary ? (
                  <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-rose to-pink-500 text-2xl shadow-lg shadow-rose/40 ring-4 ring-cream">
                    {it.icon}
                  </span>
                ) : (
                  <span className={`text-xl ${active ? "scale-110" : ""} transition`}>{it.icon}</span>
                )}
                {it.label}
                {it.badge > 0 && (
                  <span className="absolute top-1 right-[calc(50%-22px)] min-w-5 rounded-full bg-rose px-1.5 text-center text-[10px] leading-5 text-white">
                    {it.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
