import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { POSITIONS, type Lineup } from "@/lib/formation";
import { SHIRT_BODY_PATH, SHIRT_COLLAR_PATH, SHIRT_PATH, TEAMS, type Kit } from "@/lib/teams";

const WIDTH = 1200;
const HEIGHT = 990;
const PITCH_W = 520;
const PITCH_H = 780;
const LINE = "rgba(255,255,255,.75)";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/BeVietnamPro-Bold.ttf")),
  readFile(join(process.cwd(), "assets/BeVietnamPro-ExtraBold.ttf")),
]);

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

function Pitch({ name, kit, lineup }: { name: string; kit: Kit; lineup: Lineup }) {
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
        {POSITIONS.map((p) => (
          <div
            key={p.key}
            style={{
              position: "absolute",
              left: (p.x / 100) * PITCH_W - 90,
              top: (p.y / 100) * PITCH_H - 44,
              width: 180,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Shirt kit={kit} label={p.key} />
            <div
              style={{
                display: "flex",
                marginTop: -4,
                maxWidth: 180,
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
              }}
            >
              {lineup[p.key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function renderLineupPng(result: [Lineup, Lineup], subtitle: string) {
  const [bold, extraBold] = await fonts;
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
        }}
      >
        <div style={{ display: "flex", fontSize: 48, fontWeight: 800, color: "#facc15" }}>FC THIẾT MÃ</div>
        <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,.6)", marginBottom: 18 }}>
          {subtitle}
        </div>
        <div style={{ display: "flex", width: "100%", justifyContent: "space-around" }}>
          {TEAMS.map((t, i) => (
            <Pitch key={t.name} name={t.name} kit={t.kit} lineup={result[i]} />
          ))}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Be Vietnam Pro", data: bold, weight: 700, style: "normal" },
        { name: "Be Vietnam Pro", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
  return Buffer.from(await image.arrayBuffer());
}
