import { POSITIONS, parseRoster, splitTeams } from "@/lib/formation";
import { renderLineupPng } from "@/lib/server/lineupImage";
import { nowVN, sendMail } from "@/lib/server/mail";
import { verifyOtp } from "@/lib/server/otp";
import { TEAMS, resolveTeams, resultText } from "@/lib/teams";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Chia đội trên server, gửi ảnh đội hình về email quản lý rồi trả kết quả
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const roster = parseRoster(body?.roster);
  if (!roster) {
    return Response.json({ error: "Danh sách chưa đủ 2 người ở mỗi vị trí hoặc ảnh không hợp lệ." }, { status: 400 });
  }

  const resplit = body?.resplit === true;
  if (resplit && !verifyOtp(String(body?.otp ?? ""), String(body?.otpToken ?? ""))) {
    return Response.json({ error: "Mã OTP sai hoặc đã hết hạn." }, { status: 403 });
  }

  const teams = splitTeams(roster);
  const resolved = resolveTeams(roster, teams);
  const time = nowVN();
  const label = resplit ? "Chia lại (đã xác thực OTP)" : "Chia đội";

  try {
    const png = await renderLineupPng(resolved, `${label} · ${time}`);
    const tables = TEAMS.map(
      (t, i) =>
        `<h3>${t.emoji} ${escapeHtml(t.name)}</h3><ul>` +
        POSITIONS.map((p) => `<li><b>${p.key}</b>: ${escapeHtml(resolved[i].lineup[p.key].name)}</li>`).join("") +
        (resolved[i].subs.length
          ? `<li><b>Dự bị</b>: ${resolved[i].subs.map((s) => escapeHtml(s.name)).join(", ")}</li>`
          : "") +
        "</ul>",
    ).join("");
    await sendMail({
      subject: `FC Thiết Mã - ${label} - ${time}`,
      text: `${label} lúc ${time}\n\n${resultText(resolved)}`,
      html: `<p>${label} lúc ${time}</p><img src="cid:lineup" alt="Đội hình" style="max-width:100%"/>${tables}`,
      attachments: [{ filename: "doi-hinh.png", content: png, cid: "lineup" }],
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Không gửi được email kết quả, thử lại sau." }, { status: 500 });
  }

  return Response.json({ teams });
}
