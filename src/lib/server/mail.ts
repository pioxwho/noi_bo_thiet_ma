import "server-only";
import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

// Email nhận kết quả chia đội và mã OTP
export const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "dvl.vanlam@gmail.com";

export async function sendMail(opts: {
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
}) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Thiếu biến môi trường GMAIL_USER hoặc GMAIL_APP_PASSWORD");

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({ from: `FC Thiết Mã <${user}>`, to: NOTIFY_EMAIL, ...opts });
}

export const nowVN = () =>
  new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
