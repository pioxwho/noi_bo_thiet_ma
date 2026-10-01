"use client";

import { useEffect, useState } from "react";
import Pitch from "@/components/Pitch";
import { POSITIONS, emptyRoster, type Lineup, type PositionKey, type Roster } from "@/lib/formation";
import { TEAMS, resultText } from "@/lib/teams";

const STORAGE_KEY = "noibothietma:v1";
// Sau khi chia đội, muốn chia lại trong khoảng này phải nhập OTP
const LOCK_MS = 6 * 60 * 60 * 1000;
const OTP_COOLDOWN_S = 60;

type Saved = { roster: Roster; result: [Lineup, Lineup] | null; lockUntil?: number };

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(data: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra, thử lại sau.");
  return data as T;
}

export default function TeamSplitter() {
  // Khôi phục danh sách đã nhập lần trước (component chỉ render ở trình duyệt)
  const [saved] = useState(load);
  const [roster, setRoster] = useState<Roster>(() => ({ ...emptyRoster(), ...saved?.roster }));
  const [result, setResult] = useState<[Lineup, Lineup] | null>(saved?.result ?? null);
  const [lockUntil, setLockUntil] = useState(saved?.lockUntil ?? 0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hộp nhập OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    save({ roster, result, lockUntil });
  }, [roster, result, lockUntil]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setName = (key: PositionKey, idx: 0 | 1, value: string) => {
    setRoster((r) => {
      const pair: [string, string] = [...r[key]];
      pair[idx] = value;
      return { ...r, [key]: pair };
    });
    setError("");
  };

  const trimmedRoster = () => {
    const trimmed = Object.fromEntries(
      POSITIONS.map((p) => [p.key, roster[p.key].map((n) => n.trim())]),
    ) as Roster;
    const missing = POSITIONS.filter((p) => trimmed[p.key].some((n) => !n));
    if (missing.length) {
      setError(`Còn thiếu người ở vị trí: ${missing.map((p) => p.key).join(", ")}`);
      return null;
    }
    return trimmed;
  };

  const doSplit = async (otp?: { otp: string; otpToken: string }) => {
    const trimmed = trimmedRoster();
    if (!trimmed) return false;
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ result: [Lineup, Lineup] }>("/api/split", {
        roster: trimmed,
        resplit: Boolean(otp),
        ...otp,
      });
      setRoster(trimmed);
      setResult(data.result);
      setLockUntil(Date.now() + LOCK_MS);
      setCopied(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      if (otp) setOtpError(msg);
      else setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Đã chia đội gần đây thì phải có OTP mới được chia tiếp
  const handleSplit = () => {
    if (!trimmedRoster()) return;
    if (Date.now() < lockUntil) {
      setOtpCode("");
      setOtpError("");
      setOtpOpen(true);
      return;
    }
    doSplit();
  };

  const requestOtp = async () => {
    setOtpError("");
    setBusy(true);
    try {
      const data = await postJson<{ token: string }>("/api/otp");
      setOtpToken(data.token);
      setCooldown(OTP_COOLDOWN_S);
    } catch (e) {
      setOtpError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Mã OTP gồm 6 chữ số.");
      return;
    }
    if (await doSplit({ otp: otpCode, otpToken })) {
      setOtpOpen(false);
      setOtpToken("");
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(resultText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Không sao chép được, hãy chụp màn hình để gửi.");
    }
  };

  const handleClear = () => {
    if (!confirm("Xóa toàn bộ danh sách đã nhập?")) return;
    setRoster(emptyRoster());
    setResult(null);
    setError("");
  };

  const otpDialog = otpOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#173322] p-5 shadow-2xl ring-1 ring-white/15">
        <h2 className="mb-1 text-lg font-extrabold text-yellow-400">Nhập mã OTP để chia lại</h2>
        <p className="mb-4 text-sm text-white/70">
          Đội đã được chia. Muốn chia lại cần mã OTP gửi tới email quản lý.
        </p>
        <button onClick={requestOtp} disabled={busy || cooldown > 0} className="btn btn-secondary mb-3 w-full disabled:opacity-50">
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : otpToken ? "📧 Gửi lại mã OTP" : "📧 Gửi mã OTP"}
        </button>
        {otpToken && (
          <input
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setOtpError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Mã 6 số"
            aria-label="Mã OTP"
            autoFocus
            className="mb-3 w-full rounded-lg bg-white/90 px-3 py-2.5 text-center text-2xl font-bold tracking-[0.4em] text-zinc-900 outline-none focus:ring-2 focus:ring-yellow-400"
          />
        )}
        {otpError && <p className="mb-3 text-center text-sm text-red-300">{otpError}</p>}
        <div className="flex gap-2">
          <button onClick={() => setOtpOpen(false)} className="btn btn-secondary flex-1">
            Hủy
          </button>
          <button onClick={confirmOtp} disabled={busy || !otpToken} className="btn btn-primary flex-1 disabled:opacity-50">
            {busy && otpToken ? "Đang chia..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );

  if (result) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="grid w-full max-w-4xl grid-cols-1 justify-items-center gap-8 md:grid-cols-2">
          {TEAMS.map((t, i) => (
            <Pitch key={t.name} name={t.name} lineup={result[i]} kit={t.kit} />
          ))}
        </div>
        <div className="sticky bottom-0 flex w-full max-w-md justify-center gap-2 bg-[var(--background)]/90 py-3 backdrop-blur">
          <button onClick={handleSplit} disabled={busy} className="btn btn-primary flex-1 disabled:opacity-50">
            🎲 Chia lại
          </button>
          <button onClick={handleCopy} className="btn btn-secondary flex-1">
            {copied ? "✓ Đã chép" : "📋 Sao chép"}
          </button>
          <button onClick={() => setResult(null)} className="btn btn-secondary flex-1">
            ✏️ Sửa tên
          </button>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {otpDialog}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-4 text-center text-sm text-white/70">
        Nhập 2 người đá cùng một vị trí. Bấm <b>Chia đội</b>, mỗi vị trí sẽ chia ngẫu nhiên
        1 người sang mỗi đội.
      </p>
      <ul className="flex flex-col gap-3">
        {POSITIONS.map((p) => (
          <li key={p.key} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="rounded bg-[#6b1230] px-2 py-0.5 text-sm font-extrabold">{p.key}</span>
              <span className="text-sm text-white/70">{p.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([0, 1] as const).map((idx) => (
                <input
                  key={idx}
                  value={roster[p.key][idx]}
                  onChange={(e) => setName(p.key, idx, e.target.value)}
                  placeholder={`Người ${idx + 1}`}
                  aria-label={`${p.label} - người ${idx + 1}`}
                  maxLength={40}
                  className="min-w-0 rounded-lg bg-white/90 px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
      <div className="sticky bottom-0 mt-4 flex gap-2 bg-[var(--background)]/90 py-3 backdrop-blur">
        <button onClick={handleClear} className="btn btn-secondary">
          Xóa hết
        </button>
        <button onClick={handleSplit} disabled={busy} className="btn btn-primary flex-1 text-lg disabled:opacity-50">
          {busy ? "Đang chia..." : "⚽ Chia đội"}
        </button>
      </div>
      {otpDialog}
    </div>
  );
}
