import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_TTL_MS = 5 * 60 * 1000;

function secret() {
  const s = process.env.OTP_SECRET;
  if (!s) throw new Error("Thiếu biến môi trường OTP_SECRET");
  return s;
}

const sign = (code: string, exp: number) =>
  createHmac("sha256", secret()).update(`${code}.${exp}`).digest("hex");

// Không cần database: token = hạn dùng + chữ ký HMAC của (mã, hạn dùng).
// Server chỉ cần OTP_SECRET để kiểm tra mã người dùng nhập.
export function createOtp() {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const exp = Date.now() + OTP_TTL_MS;
  return { code, token: `${exp}.${sign(code, exp)}`, ttlMinutes: OTP_TTL_MS / 60_000 };
}

export function verifyOtp(code: string, token: string) {
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!/^\d{6}$/.test(code) || !sig || !Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = Buffer.from(sign(code, exp), "hex");
  const given = Buffer.from(sig, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
