/** Das LoverBoy-Wappen: ein Herz mit Riss und Pflaster, quer durchbohrt von Amors Pfeil. */
export function LogoMark({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="LoverBoy Logo"
    >
      <defs>
        <linearGradient id="lb-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="55%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
      </defs>
      {/* Pfeil (hinter dem Herz) */}
      <g stroke="#7a4256" strokeWidth="2.5" strokeLinecap="round">
        <line x1="7" y1="53" x2="59" y2="9.5" />
      </g>
      <path d="M7 53 l-1 -7 M7 53 l7 -1 M10.5 50.2 l-1 -7 M10.5 50.2 l7 -1" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <path d="M62 7 L58.7 14.1 L54.4 8.6 Z" fill="#7a4256" stroke="#7a4256" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Herz */}
      <path
        d="M32 56 C 13 43, 5 31, 5 20.5 C 5 11.5, 11.5 5.5, 19.5 5.5 C 25 5.5, 29.2 8.4, 32 13 C 34.8 8.4, 39 5.5, 44.5 5.5 C 52.5 5.5, 59 11.5, 59 20.5 C 59 31, 51 43, 32 56 Z"
        fill="url(#lb-heart)"
        stroke="#9f1239"
        strokeWidth="1.5"
      />
      {/* Glanz */}
      <ellipse cx="17" cy="16" rx="5" ry="3" fill="white" opacity="0.45" transform="rotate(-35 17 16)" />
      {/* Riss */}
      <path d="M32 13 L28.5 21 L34 27.5 L29.5 34.5 L33 41" fill="none" stroke="#3b1020" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Pflaster */}
      <g transform="translate(31 27) rotate(-32)">
        <rect x="-13" y="-4.5" width="26" height="9" rx="4.5" fill="#fde2c4" stroke="#c98f63" strokeWidth="1" />
        <rect x="-4.5" y="-4.5" width="9" height="9" fill="#f3c497" />
        <circle cx="-9" cy="-1.5" r="0.8" fill="#c98f63" />
        <circle cx="-9" cy="1.5" r="0.8" fill="#c98f63" />
        <circle cx="9" cy="-1.5" r="0.8" fill="#c98f63" />
        <circle cx="9" cy="1.5" r="0.8" fill="#c98f63" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-linear-to-r from-rose-dark via-rose to-pink-500 bg-clip-text font-script text-transparent ${className}`}
    >
      LoverBoy
    </span>
  );
}

export const SLOGAN = "Liebe ist Pflicht. Fehler kosten.";
