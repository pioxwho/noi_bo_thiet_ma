export type PositionKey = "GK" | "LB" | "CB" | "RB" | "LCM" | "RCM" | "ST";

export type Position = {
  key: PositionKey;
  short: string; // nhãn hiển thị trên sân (2 tiền vệ cùng là CM)
  label: string;
  // Tọa độ trên sân (%), đội tấn công lên phía trên
  x: number;
  y: number;
};

// Sơ đồ 1-3-2-1, thứ tự nhập từ thủ môn lên tiền đạo
export const POSITIONS: Position[] = [
  { key: "GK", short: "GK", label: "Thủ môn", x: 50, y: 89 },
  { key: "LB", short: "LB", label: "Hậu vệ trái", x: 17, y: 64 },
  { key: "CB", short: "CB", label: "Trung vệ", x: 50, y: 66 },
  { key: "RB", short: "RB", label: "Hậu vệ phải", x: 83, y: 64 },
  { key: "LCM", short: "CM", label: "Tiền vệ trung tâm (trái)", x: 29, y: 40 },
  { key: "RCM", short: "CM", label: "Tiền vệ trung tâm (phải)", x: 71, y: 40 },
  { key: "ST", short: "ST", label: "Tiền đạo", x: 50, y: 14 },
];

export const MAX_NAME = 40;
export const MAX_SUBS = 5; // mỗi đội
// Ảnh đại diện đã thu nhỏ ở trình duyệt (JPEG base64)
const MAX_PHOTO_LENGTH = 200_000;
const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export type Player = { id: string; name: string; photo?: string };

// Mỗi vị trí có 2 người: bên trái là đội 0 (áo TBN), bên phải là đội 1 (áo BĐN).
// Dự bị cũng tách riêng theo từng đội.
export type Roster = {
  positions: Record<PositionKey, [Player, Player]>;
  subs: [Player[], Player[]];
};

// Đội hình của một đội: id cầu thủ ở từng vị trí và dự bị
export type Team = { lineup: Record<PositionKey, string>; subs: string[] };

export const newPlayer = (): Player => ({
  id: Math.random().toString(36).slice(2, 10),
  name: "",
});

export const emptyRoster = (): Roster => ({
  positions: Object.fromEntries(POSITIONS.map((p) => [p.key, [newPlayer(), newPlayer()]])) as Roster["positions"],
  subs: [[], []],
});

export const allPlayers = (roster: Roster) => [
  ...POSITIONS.flatMap((p) => roster.positions[p.key]),
  ...roster.subs.flat(),
];

// Không ngẫu nhiên: cột trái vào đội 0, cột phải vào đội 1
export function buildTeams(roster: Roster): [Team, Team] {
  const team = (i: 0 | 1): Team => ({
    lineup: Object.fromEntries(POSITIONS.map((p) => [p.key, roster.positions[p.key][i].id])) as Team["lineup"],
    subs: roster.subs[i].map((p) => p.id),
  });
  return [team(0), team(1)];
}

function parsePlayer(input: unknown): Player | null {
  if (!input || typeof input !== "object") return null;
  const { id, name, photo } = input as Record<string, unknown>;
  if (typeof id !== "string" || !id || id.length > 40) return null;
  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME) return null;
  if (photo !== undefined && (typeof photo !== "string" || photo.length > MAX_PHOTO_LENGTH || !PHOTO_RE.test(photo))) {
    return null;
  }
  return { id, name: name.trim(), ...(photo ? { photo } : {}) };
}

// Kiểm tra dữ liệu gửi lên server: đủ 2 người mỗi vị trí, tên không rỗng, ảnh hợp lệ
export function parseRoster(input: unknown): Roster | null {
  if (!input || typeof input !== "object") return null;
  const { positions, subs } = input as Record<string, unknown>;
  if (!positions || typeof positions !== "object") return null;
  if (!Array.isArray(subs) || subs.length !== 2 || subs.some((s) => !Array.isArray(s) || s.length > MAX_SUBS)) {
    return null;
  }

  const roster: Roster = { positions: {} as Roster["positions"], subs: [[], []] };
  for (const { key } of POSITIONS) {
    const pair = (positions as Record<string, unknown>)[key];
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const [a, b] = pair.map(parsePlayer);
    if (!a || !b) return null;
    roster.positions[key] = [a, b];
  }
  for (const i of [0, 1] as const) {
    for (const s of subs[i] as unknown[]) {
      const p = parsePlayer(s);
      if (!p) return null;
      roster.subs[i].push(p);
    }
  }
  const ids = allPlayers(roster).map((p) => p.id);
  return new Set(ids).size === ids.length ? roster : null;
}
