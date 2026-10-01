import { POSITIONS, type Lineup } from "@/lib/formation";

type Props = {
  name: string;
  lineup: Lineup;
  shirt: string; // màu áo
  shirtText: string; // màu chữ trên áo
};

function Shirt({ color, textColor, label }: { color: string; textColor: string; label: string }) {
  return (
    <svg viewBox="0 0 60 56" className="w-11 sm:w-14 drop-shadow-md" aria-hidden>
      <path
        d="M20 2 L8 7 L1 20 L10 25 L13 20 L13 54 L47 54 L47 20 L50 25 L59 20 L52 7 L40 2 Q30 10 20 2 Z"
        fill={color}
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x="30"
        y="41"
        textAnchor="middle"
        fontSize={label.length > 2 ? 13 : 16}
        fontWeight="800"
        fill={textColor}
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

function PitchLines() {
  const line = { fill: "none", stroke: "rgba(255,255,255,.75)", strokeWidth: 0.6 };
  return (
    <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect x="3" y="3" width="94" height="144" {...line} />
      <line x1="3" y1="75" x2="97" y2="75" {...line} />
      <circle cx="50" cy="75" r="12" {...line} />
      <circle cx="50" cy="75" r="0.9" fill="rgba(255,255,255,.75)" />
      {/* Khung thành trên */}
      <rect x="24" y="3" width="52" height="22" {...line} />
      <rect x="38" y="3" width="24" height="8" {...line} />
      <path d="M40 25 A10 10 0 0 0 60 25" {...line} />
      {/* Khung thành dưới */}
      <rect x="24" y="125" width="52" height="22" {...line} />
      <rect x="38" y="139" width="24" height="8" {...line} />
      <path d="M40 125 A10 10 0 0 1 60 125" {...line} />
    </svg>
  );
}

export default function Pitch({ name, lineup, shirt, shirtText }: Props) {
  return (
    <section className="w-full max-w-md">
      <h2 className="mb-2 flex items-center justify-center gap-2 text-lg font-extrabold uppercase tracking-wide">
        <span className="inline-block h-4 w-4 rounded-full border border-white/50" style={{ background: shirt }} />
        {name}
      </h2>
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-xl ring-1 ring-black/20"
        style={{
          background:
            "repeating-linear-gradient(180deg, #2f8f3e 0 10%, #2a8238 10% 20%)",
        }}
      >
        <PitchLines />
        {POSITIONS.map((p) => (
          <div
            key={p.key}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <Shirt color={shirt} textColor={shirtText} label={p.key} />
            <span
              className="-mt-1 max-w-[6.5rem] truncate rounded-sm bg-[#6b1230] px-2 py-0.5 text-center text-[11px] font-bold uppercase text-white shadow sm:max-w-[8rem] sm:text-sm"
              title={lineup[p.key]}
            >
              {lineup[p.key]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
