import { POSITIONS, allPlayers, type Player, type PositionKey, type Roster, type Team } from "@/lib/formation";

export type Kit = {
  body: string; // màu thân áo
  sleeve: string; // màu tay áo
  trim: string; // màu cổ áo
  text: string; // màu chữ trên áo
};

export const TEAMS: { name: string; kit: Kit; emoji: string }[] = [
  {
    name: "Áo BĐN",
    kit: { body: "#141414", sleeve: "#141414", trim: "#c8102e", text: "#ffffff" },
    emoji: "⚫",
  },
  {
    name: "Áo TBN",
    kit: { body: "#c8102e", sleeve: "#ffffff", trim: "#ffffff", text: "#ffffff" },
    emoji: "🔴",
  },
];

// Hình áo đấu (viewBox 0 0 60 56)
export const SHIRT_PATH =
  "M20 2 L8 7 L1 20 L10 25 L13 20 L13 54 L47 54 L47 20 L50 25 L59 20 L52 7 L40 2 Q30 10 20 2 Z";
export const SHIRT_BODY_PATH = "M20 2 Q30 10 40 2 L47 8 L47 54 L13 54 L13 8 Z";
export const SHIRT_COLLAR_PATH = "M20 2 Q30 10 40 2";

// Đổi id trong kết quả chia thành thông tin cầu thủ
export function resolveTeams(roster: Roster, teams: [Team, Team]) {
  const byId = new Map(allPlayers(roster).map((p) => [p.id, p]));
  const get = (id: string): Player => byId.get(id) ?? { id, name: "?" };
  return teams.map((t) => ({
    lineup: Object.fromEntries(POSITIONS.map((p) => [p.key, get(t.lineup[p.key])])) as Record<PositionKey, Player>,
    subs: t.subs.map(get),
  }));
}

export type ResolvedTeam = ReturnType<typeof resolveTeams>[number];

export function resultText(teams: ResolvedTeam[]) {
  const team = (i: number) =>
    `${TEAMS[i].emoji} ${TEAMS[i].name.toUpperCase()}\n` +
    POSITIONS.map((p) => `${p.short}: ${teams[i].lineup[p.key].name}`).join("\n") +
    (teams[i].subs.length ? `\nDự bị: ${teams[i].subs.map((s) => s.name).join(", ")}` : "");
  return `⚽ FC THIẾT MÃ\n\n${team(0)}\n\n${team(1)}`;
}
