/**
 * NextviroPublish brand logo — a ringed planet (Saturn) mark plus the
 * "NextviroPublish" wordmark, optionally with the CREATE · PUBLISH · TRAIN
 * tagline. Self-contained inline SVG so it stays crisp at any size and adapts
 * to the site's amber theme.
 */
export default function Logo({
  size = 34,
  showText = true,
  tagline = false,
}: {
  size?: number;
  showText?: boolean;
  tagline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5 align-middle">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="nvp-planet" x1="15" y1="15" x2="34" y2="35">
            <stop offset="0" stopColor="#dcbb84" />
            <stop offset="1" stopColor="#9c7736" />
          </linearGradient>
        </defs>
        <g transform="rotate(-20 24 25)">
          {/* ring — back half (behind the planet) */}
          <path
            d="M7 25a17 5.4 0 0 1 34 0"
            fill="none"
            stroke="#b98f45"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          {/* planet */}
          <circle cx="24" cy="25" r="9.6" fill="url(#nvp-planet)" />
          <path
            d="M24 15.4a9.6 9.6 0 0 1 0 19.2z"
            fill="#5c3f1a"
            opacity="0.12"
          />
          {/* ring — front half (in front of the planet) */}
          <path
            d="M7 25a17 5.4 0 0 0 34 0"
            fill="none"
            stroke="#e6c485"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        {/* sparkles */}
        <path
          d="M39 12l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
          fill="#c99a45"
        />
        <circle cx="9.5" cy="15.5" r="1" fill="#c99a45" />
      </svg>
      {showText && (
        <span className="inline-flex flex-col leading-none">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            <span className="text-amber-950">Nextviro</span>
            <span className="text-amber-600">Publish</span>
          </span>
          {tagline && (
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-800/70">
              Create · Publish · Train
            </span>
          )}
        </span>
      )}
    </span>
  );
}
