import {
  BALL,
  BALL_PATCH,
  LOGO_COLORS as C,
  LOGO_VIEWBOX,
  SHIELD_BAND,
  SHIELD_INNER,
  SHIELD_OUTER,
  STAR,
  STARS,
} from "@/lib/logo";

// Huy hiệu PIO ở góc trên bên trái
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label="PIO">
      <defs>
        <linearGradient id="pio-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.goldLight} />
          <stop offset="0.5" stopColor={C.gold} />
          <stop offset="1" stopColor={C.goldDark} />
        </linearGradient>
        <linearGradient id="pio-maroon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.maroonTop} />
          <stop offset="1" stopColor={C.maroonBottom} />
        </linearGradient>
        <linearGradient id="pio-gloss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={SHIELD_OUTER} fill="url(#pio-gold)" />
      <path d={SHIELD_INNER} fill="url(#pio-maroon)" />
      <path d={SHIELD_BAND} fill="url(#pio-gold)" />
      {STARS.map((s) => (
        <path key={s.x} d={STAR} transform={`translate(${s.x} ${s.y}) scale(${s.s})`} fill={C.maroonBottom} />
      ))}
      <text
        x="50"
        y="69"
        textAnchor="middle"
        fontSize="30"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="1"
        fill="url(#pio-gold)"
        stroke={C.maroonBottom}
        strokeWidth="0.6"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        PIO
      </text>
      <circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill="#fff" stroke={C.maroonBottom} strokeWidth="1" />
      <path d={BALL_PATCH} fill={C.maroonBottom} />
      <path d={SHIELD_OUTER} fill="url(#pio-gloss)" />
    </svg>
  );
}
