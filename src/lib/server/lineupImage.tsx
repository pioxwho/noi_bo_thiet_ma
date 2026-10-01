import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { POSITIONS, type Player } from "@/lib/formation";
import {
  BALL,
  BALL_PATCH,
  LOGO_COLORS,
  LOGO_VIEWBOX,
  SHIELD_BAND,
  SHIELD_INNER,
  SHIELD_OUTER,
  STAR,
  STARS,
} from "@/lib/logo";
import {
  SHIRT_BODY_PATH,
  SHIRT_COLLAR_PATH,
  SHIRT_PATH,
  TEAMS,
  type Kit,
  type ResolvedTeam,
} from "@/lib/teams";

const WIDTH = 1200;
const BASE_HEIGHT = 990;
const PITCH_W = 520;
const PITCH_H = 780;
const LINE = "rgba(255,255,255,.75)";
// Khu dự bị: 3 người mỗi hàng
const SUBS_PER_ROW = 3;
const SUB_ROW_H = 112;
const SUBS_HEADER_H = 80;

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/BeVietnamPro-Bold.ttf")),
  readFile(join(process.cwd(), "assets/BeVietnamPro-ExtraBold.ttf")),
]);

// Huy hiệu PIO cho ảnh email (Satori không vẽ chữ trong SVG nên chữ đặt bằng div)
function EmailLogo() {
  const C = LOGO_COLORS;
  const W = 84;
  const H = 94;
  return (
    <div style={{ position: "absolute", top: 18, left: 40, width: W, height: H, display: "flex" }}>
      <svg width={W} height={H} viewBox={LOGO_VIEWBOX} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={C.goldLight} />
            <stop offset="0.5" stopColor={C.gold} />
            <stop offset="1" stopColor={C.goldDark} />
          </linearGradient>
          <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.maroonTop} />
            <stop offset="1" stopColor={C.maroonBottom} />
          </linearGradient>
        </defs>
        <path d={SHIELD_OUTER} fill="url(#g)" />
        <path d={SHIELD_INNER} fill="url(#m)" />
        <path d={SHIELD_BAND} fill="url(#g)" />
        {STARS.map((st) => (
          <path key={st.x} d={STAR} transform={`translate(${st.x} ${st.y}) scale(${st.s})`} fill={C.maroonBottom} />
        ))}
        <circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill="#fff" stroke={C.maroonBottom} strokeWidth="1" />
        <path d={BALL_PATCH} fill={C.maroonBottom} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: H * 0.38,
          left: 0,
          width: W,
          display: "flex",
          justifyContent: "center",
          fontSize: 25,
          fontWeight: 800,
          fontStyle: "italic",
          color: C.goldLight,
        }}
      >
        PIO
      </div>
    </div>
  );
}

function Shirt({ kit, label }: { kit: Kit; label: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: 64, height: 60 }}>
      <svg width="64" height="60" viewBox="0 0 60 56" style={{ position: "absolute", top: 0, left: 0 }}>
        <path d={SHIRT_PATH} fill={kit.sleeve} />
        <path d={SHIRT_BODY_PATH} fill={kit.body} />
        <path d={SHIRT_COLLAR_PATH} fill="none" stroke={kit.trim} strokeWidth="3" />
        <path d={SHIRT_PATH} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 0,
          width: 64,
          display: "flex",
          justifyContent: "center",
          fontSize: label.length > 2 ? 14 : 17,
          fontWeight: 800,
          color: kit.text,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Ảnh cầu thủ kèm nhãn vị trí, không có ảnh thì vẽ áo đấu
function PlayerBadge({ player, kit, label, size }: { player: Player; kit: Kit; label: string; size: number }) {
  if (!player.photo) return <Shirt kit={kit} label={label} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh render bằng Satori, không phải trong trình duyệt */}
      <img
        src={player.photo}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: size / 2, border: `4px solid ${kit.body}`, objectFit: "cover" }}
      />
      {label && (
        <div
          style={{
            display: "flex",
            marginTop: -12,
            padding: "0 6px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 800,
            background: kit.body,
            color: kit.text,
            border: `2px solid ${kit.trim}`,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

const nameStyle = {
  display: "flex",
  maxWidth: 170,
  padding: "3px 10px",
  borderRadius: 4,
  background: "#6b1230",
  color: "white",
  fontSize: 17,
  fontWeight: 700,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

function Bench({ subs, kit }: { subs: Player[]; kit: Kit }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: PITCH_W,
        marginTop: 16,
        padding: "12px 16px",
        borderRadius: 16,
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.12)",
      }}
    >
      <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: "#facc15", marginBottom: 8 }}>
        DỰ BỊ ({subs.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {subs.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: Math.floor((PITCH_W - 34) / SUBS_PER_ROW),
              height: SUB_ROW_H,
            }}
          >
            <PlayerBadge player={s} kit={kit} label="" size={72} />
            <div style={{ ...nameStyle, marginTop: 2, fontSize: 15, maxWidth: 150 }}>{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamColumn({ name, kit, team, showBench }: { name: string; kit: Kit; team: ResolvedTeam; showBench: boolean }) {
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, fontSize: 30, fontWeight: 800 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            marginRight: 10,
            background: kit.body,
            border: `3px solid ${kit.sleeve === kit.body ? kit.trim : kit.sleeve}`,
          }}
        />
        {name.toUpperCase()}
      </div>
      <div style={{ display: "flex", position: "relative", width: PITCH_W, height: PITCH_H, borderRadius: 16, overflow: "hidden" }}>
        <svg width={PITCH_W} height={PITCH_H} viewBox="0 0 100 150" style={{ position: "absolute", top: 0, left: 0 }}>
          {stripes.map((i) => (
            <rect key={i} x="0" y={i * 15} width="100" height="15" fill={i % 2 ? "#2a8238" : "#2f8f3e"} />
          ))}
          <rect x="3" y="3" width="94" height="144" fill="none" stroke={LINE} strokeWidth="0.6" />
          <line x1="3" y1="75" x2="97" y2="75" stroke={LINE} strokeWidth="0.6" />
          <circle cx="50" cy="75" r="12" fill="none" stroke={LINE} strokeWidth="0.6" />
          <rect x="24" y="3" width="52" height="22" fill="none" stroke={LINE} strokeWidth="0.6" />
          <rect x="38" y="3" width="24" height="8" fill="none" stroke={LINE} strokeWidth="0.6" />
          <path d="M40 25 A10 10 0 0 0 60 25" fill="none" stroke={LINE} strokeWidth="0.6" />
          <rect x="24" y="125" width="52" height="22" fill="none" stroke={LINE} strokeWidth="0.6" />
          <rect x="38" y="139" width="24" height="8" fill="none" stroke={LINE} strokeWidth="0.6" />
          <path d="M40 125 A10 10 0 0 1 60 125" fill="none" stroke={LINE} strokeWidth="0.6" />
        </svg>
        {POSITIONS.map((p) => {
          const player = team.lineup[p.key];
          return (
            <div
              key={p.key}
              style={{
                position: "absolute",
                left: (p.x / 100) * PITCH_W - 90,
                top: (p.y / 100) * PITCH_H - (player.photo ? 62 : 44),
                width: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <PlayerBadge player={player} kit={kit} label={p.short} size={88} />
              <div style={{ ...nameStyle, marginTop: player.photo ? 2 : -4 }}>{player.name}</div>
            </div>
          );
        })}
      </div>
      {showBench && <Bench subs={team.subs} kit={kit} />}
    </div>
  );
}

export async function renderLineupPng(teams: ResolvedTeam[], subtitle: string) {
  const [bold, extraBold] = await fonts;
  const maxSubs = Math.max(...teams.map((t) => t.subs.length));
  const benchRows = Math.ceil(maxSubs / SUBS_PER_ROW);
  const height = BASE_HEIGHT + (maxSubs ? SUBS_HEADER_H + benchRows * SUB_ROW_H : 0);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#0f2417",
          color: "#f4f4f5",
          fontFamily: "Be Vietnam Pro",
          paddingTop: 28,
          position: "relative",
        }}
      >
        <EmailLogo />
        <div style={{ display: "flex", flexShrink: 0, fontSize: 48, fontWeight: 800, color: "#facc15" }}>FC THIẾT MÃ</div>
        <div style={{ display: "flex", flexShrink: 0, fontSize: 20, color: "rgba(255,255,255,.6)", marginBottom: 18 }}>
          {subtitle}
        </div>
        <div style={{ display: "flex", width: "100%", justifyContent: "space-around", alignItems: "flex-start" }}>
          {TEAMS.map((t, i) => (
            <TeamColumn key={t.name} name={t.name} kit={t.kit} team={teams[i]} showBench={maxSubs > 0} />
          ))}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      fonts: [
        { name: "Be Vietnam Pro", data: bold, weight: 700, style: "normal" },
        { name: "Be Vietnam Pro", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
  return Buffer.from(await image.arrayBuffer());
}
