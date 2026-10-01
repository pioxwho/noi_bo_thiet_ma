import { POSITIONS, parseRoster, splitTeams } from "@/lib/formation";
import { renderLineupPng } from "@/lib/server/lineupImage";
import { nowVN, sendMail } from "@/lib/server/mail";
import { verifyOtp } from "@/lib/server/otp";
import { TEAMS, resultText } from "@/lib/teams";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Chia đội trên server, gửi ảnh đội hình về email quản lý rồi trả kết quả
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const roster = parseRoster(body?.roster);
  if (!roster) {
    return Response.json({ error: "Danh sách chưa đủ 2 người ở mỗi vị trí." }, { status: 400 });
  }

  const resplit = body?.resplit === true;
  if (resplit && !verifyOtp(String(body?.otp ?? ""), String(body?.otpToken ?? ""))) {
    return Response.json({ error: "Mã OTP sai hoặc đã hết hạn." }, { status: 403 });
  }

  const result = splitTeams(roster);
  const time = nowVN();
  const label = resplit ? "Chia lại (đã xác thực OTP)" : "Chia đội";

  try {
    const png = await renderLineupPng(result, `${label} · ${time}`);
    const tables = TEAMS.map(
      (t, i) =>
        `<h3>${t.emoji} ${escapeHtml(t.name)}</h3><ul>` +
        POSITIONS.map((p) => `<li><b>${p.key}</b>: ${escapeHtml(result[i][p.key])}</li>`).join("") +
        "</ul>",
    ).join("");
    await sendMail({
      subject: `FC Thiết Mã - ${label} - ${time}`,
      text: `${label} lúc ${time}\n\n${resultText(result)}`,
      html: `<p>${label} lúc ${time}</p><img src="cid:lineup" alt="Đội hình" style="max-width:100%"/>${tables}`,
      attachments: [{ filename: "doi-hinh.png", content: png, cid: "lineup" }],
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Không gửi được email kết quả, thử lại sau." }, { status: 500 });
  }

  return Response.json({ result });
}
