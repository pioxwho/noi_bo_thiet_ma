export type PositionKey = "GK" | "LB" | "CB" | "RB" | "CM" | "CAM" | "ST";

export type Position = {
  key: PositionKey;
  label: string;
  // Tọa độ trên sân (%), đội tấn công lên phía trên
  x: number;
  y: number;
};

// Thứ tự nhập: từ thủ môn lên tiền đạo
export const POSITIONS: Position[] = [
  { key: "GK", label: "Thủ môn", x: 50, y: 89 },
  { key: "LB", label: "Hậu vệ trái", x: 17, y: 64 },
  { key: "CB", label: "Trung vệ", x: 50, y: 71 },
  { key: "RB", label: "Hậu vệ phải", x: 83, y: 64 },
  { key: "CM", label: "Tiền vệ trung tâm", x: 50, y: 50 },
  { key: "CAM", label: "Tiền vệ tấn công", x: 50, y: 30 },
  { key: "ST", label: "Tiền đạo", x: 50, y: 11 },
];

// Mỗi vị trí có 2 người
export type Roster = Record<PositionKey, [string, string]>;

// Kết quả chia: tên người ở từng vị trí của mỗi đội
export type Lineup = Record<PositionKey, string>;

export const emptyRoster = (): Roster =>
  Object.fromEntries(POSITIONS.map((p) => [p.key, ["", ""]])) as Roster;

export function splitTeams(roster: Roster): [Lineup, Lineup] {
  const a = {} as Lineup;
  const b = {} as Lineup;
  for (const { key } of POSITIONS) {
    const [p1, p2] = roster[key];
    const swap = Math.random() < 0.5;
    a[key] = swap ? p2 : p1;
    b[key] = swap ? p1 : p2;
  }
  return [a, b];
}
