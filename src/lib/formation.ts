export type PositionKey = "GK" | "LB" | "CB" | "RB" | "CAM" | "LW" | "RW";

export type Position = {
  key: PositionKey;
  label: string;
  // Tọa độ trên sân (%), đội tấn công lên phía trên
  x: number;
  y: number;
};

// Thứ tự nhập: từ thủ môn lên hàng công
export const POSITIONS: Position[] = [
  { key: "GK", label: "Thủ môn", x: 50, y: 89 },
  { key: "LB", label: "Hậu vệ trái", x: 17, y: 64 },
  { key: "CB", label: "Trung vệ", x: 50, y: 68 },
  { key: "RB", label: "Hậu vệ phải", x: 83, y: 64 },
  { key: "CAM", label: "Tiền vệ tấn công", x: 50, y: 40 },
  { key: "LW", label: "Tiền đạo cánh trái", x: 21, y: 16 },
  { key: "RW", label: "Tiền đạo cánh phải", x: 79, y: 16 },
];

export const MAX_NAME = 40;
export const MAX_SUBS = 10;
// Ảnh đại diện đã thu nhỏ ở trình duyệt (JPEG base64)
const MAX_PHOTO_LENGTH = 200_000;
const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export type Player = { id: string; name: string; photo?: string };

// Mỗi vị trí có 2 người, cộng danh sách dự bị
export type Roster = {
  positions: Record<PositionKey, [Player, Player]>;
  subs: Player[];
};

// Kết quả chia của một đội: id cầu thủ ở từng vị trí và dự bị
export type Team = { lineup: Record<PositionKey, string>; subs: string[] };

export const newPlayer = (): Player => ({
  id: Math.random().toString(36).slice(2, 10),
  name: "",
});

export const emptyRoster = (): Roster => ({
  positions: Object.fromEntries(POSITIONS.map((p) => [p.key, [newPlayer(), newPlayer()]])) as Roster["positions"],
  subs: [],
});

export const allPlayers = (roster: Roster) => [
  ...POSITIONS.flatMap((p) => roster.positions[p.key]),
  ...roster.subs,
];

const shuffle = <T,>(items: T[]) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function splitTeams(roster: Roster): [Team, Team] {
  const teams: [Team, Team] = [
    { lineup: {} as Team["lineup"], subs: [] },
    { lineup: {} as Team["lineup"], subs: [] },
  ];
  for (const { key } of POSITIONS) {
    const [p1, p2] = shuffle(roster.positions[key]);
    teams[0].lineup[key] = p1.id;
    teams[1].lineup[key] = p2.id;
  }
  // Dự bị chia xen kẽ, số lẻ thì đội nhận thêm 1 người cũng ngẫu nhiên
  const first = Math.random() < 0.5 ? 0 : 1;
  shuffle(roster.subs).forEach((p, i) => teams[(first + i) % 2].subs.push(p.id));
  return teams;
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
  if (!positions || typeof positions !== "object" || !Array.isArray(subs) || subs.length > MAX_SUBS) return null;

  const roster: Roster = { positions: {} as Roster["positions"], subs: [] };
  for (const { key } of POSITIONS) {
    const pair = (positions as Record<string, unknown>)[key];
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const [a, b] = pair.map(parsePlayer);
    if (!a || !b) return null;
    roster.positions[key] = [a, b];
  }
  for (const s of subs) {
    const p = parsePlayer(s);
    if (!p) return null;
    roster.subs.push(p);
  }
  const ids = allPlayers(roster).map((p) => p.id);
  return new Set(ids).size === ids.length ? roster : null;
}
