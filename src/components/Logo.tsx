/**
 * NextviroBook brand logo — an amber tile with an open book whose right page is
 * flipping, plus the "NextviroBook" wordmark. Self-contained inline SVG so it
 * stays crisp at any size.
 */
export default function Logo({
  size = 34,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
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
          <linearGradient id="nvb-tile" x1="6" y1="4" x2="42" y2="44">
            <stop offset="0" stopColor="#c99a45" />
            <stop offset="1" stopColor="#8a6a28" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#nvb-tile)" />
        <rect
          x="2.6"
          y="2.6"
          width="42.8"
          height="42.8"
          rx="11.4"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="1.2"
        />
        {/* left page */}
        <path
          d="M24 15.2C21 13.3 16.4 12.8 12.4 13.4C11.6 13.5 11 14.2 11 15V32.2C11 33.1 11.8 33.8 12.7 33.7C16.4 33.2 20.9 33.8 24 35.5V15.2Z"
          fill="#fdf6e8"
        />
        {/* right page */}
        <path
          d="M24 15.2C27 13.3 31.6 12.8 35.6 13.4C36.4 13.5 37 14.2 37 15V32.2C37 33.1 36.2 33.8 35.3 33.7C31.6 33.2 27.1 33.8 24 35.5V15.2Z"
          fill="#ffffff"
        />
        {/* flipping page on the right */}
        <path
          d="M24 15.2C27.5 13 31 12.6 33.8 13C31.6 14.4 30.2 16.7 30 20.2C29.8 24.2 30.8 27.6 33 30C30.4 29.9 27 30.9 24 33V15.2Z"
          fill="#f2e6cb"
        />
        {/* spine + page lines */}
        <path
          d="M24 15.5V34.6"
          stroke="#8a6a28"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M14.5 19.5C16.8 19.2 19.4 19.5 21.3 20.4M14.5 24C16.8 23.7 19.4 24 21.3 24.9"
          stroke="#caa25c"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span
          className="text-lg font-bold leading-none tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          <span className="text-amber-950">Nextviro</span>
          <span className="text-amber-600">Book</span>
        </span>
      )}
    </span>
  );
}
