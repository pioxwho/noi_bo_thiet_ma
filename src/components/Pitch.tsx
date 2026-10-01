import Image from "next/image";
import { POSITIONS, type Player } from "@/lib/formation";
import {
  SHIRT_BODY_PATH,
  SHIRT_COLLAR_PATH,
  SHIRT_PATH,
  type Kit,
  type ResolvedTeam,
} from "@/lib/teams";

type Props = {
  name: string;
  team: ResolvedTeam;
  kit: Kit;
};

function Shirt({ kit, label }: { kit: Kit; label: string }) {
  return (
    <svg viewBox="0 0 60 56" className="w-11 sm:w-14 drop-shadow-md" aria-hidden>
      <path
        d={SHIRT_PATH}
        fill={kit.sleeve}
      />
      <path d={SHIRT_BODY_PATH} fill={kit.body} />
      <path d={SHIRT_COLLAR_PATH} fill="none" stroke={kit.trim} strokeWidth="3" />
      <path
        d={SHIRT_PATH}
        fill="none"
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
        fill={kit.text}
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

// Ảnh cầu thủ (nếu có) kèm nhãn vị trí, không có ảnh thì hiện áo đấu
function PlayerBadge({ player, kit, label, size }: { player: Player; kit: Kit; label?: string; size: "lg" | "sm" }) {
  const box = size === "lg" ? "h-16 w-16 sm:h-24 sm:w-24" : "h-14 w-14";
  if (!player.photo) {
    return <Shirt kit={kit} label={label ?? ""} />;
  }
  return (
    <div className="relative flex flex-col items-center">
      <Image
        src={player.photo}
        alt={player.name}
        width={192}
        height={192}
        unoptimized
        className={`${box} rounded-full border-[3px] object-cover shadow-md`}
        style={{ borderColor: kit.body }}
      />
      {label && (
        <span
          className="-mt-2.5 rounded px-1 text-[10px] font-extrabold leading-tight sm:text-xs"
          style={{ background: kit.body, color: kit.text, boxShadow: `0 0 0 1.5px ${kit.trim}` }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default function Pitch({ name, team, kit }: Props) {
  return (
    <section className="w-full max-w-md">
      <h2 className="mb-2 flex items-center justify-center gap-2 text-lg font-extrabold uppercase tracking-wide">
        <span
          className="inline-block h-4 w-4 rounded-full border-2"
          style={{ background: kit.body, borderColor: kit.sleeve === kit.body ? kit.trim : kit.sleeve }}
        />
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
        {POSITIONS.map((p) => {
          const player = team.lineup[p.key];
          return (
            <div
              key={p.key}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <PlayerBadge player={player} kit={kit} label={p.key} size="lg" />
              <span
                className="mt-0.5 max-w-[6.5rem] truncate rounded-sm bg-[#6b1230] px-2 py-0.5 text-center text-[11px] font-bold uppercase text-white shadow sm:max-w-[8rem] sm:text-sm"
                title={player.name}
              >
                {player.name}
              </span>
            </div>
          );
        })}
      </div>
      {team.subs.length > 0 && (
        <div className="mt-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-yellow-400">
            Dự bị ({team.subs.length})
          </h3>
          <ul className="grid grid-cols-3 gap-2">
            {team.subs.map((s) => (
              <li key={s.id} className="flex min-w-0 flex-col items-center gap-1">
                <PlayerBadge player={s} kit={kit} size="sm" />
                <span className="max-w-full truncate text-xs font-bold uppercase" title={s.name}>
                  {s.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
