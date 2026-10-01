import { createOtp } from "@/lib/server/otp";
import { nowVN, sendMail } from "@/lib/server/mail";

// Gửi mã OTP về email quản lý để cho phép chia lại đội
export async function POST() {
  try {
    const { code, token, ttlMinutes } = createOtp();
    await sendMail({
      subject: `FC Thiết Mã - Mã OTP chia lại đội: ${code}`,
      text: `Mã OTP để chia lại đội: ${code}\nMã có hiệu lực trong ${ttlMinutes} phút.\nYêu cầu lúc ${nowVN()}.`,
      html: `<p>Mã OTP để chia lại đội:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>Mã có hiệu lực trong ${ttlMinutes} phút. Yêu cầu lúc ${nowVN()}.</p>`,
    });
    return Response.json({ token });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Không gửi được mã OTP, thử lại sau." }, { status: 500 });
  }
}
