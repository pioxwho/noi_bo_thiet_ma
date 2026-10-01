"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Pitch from "@/components/Pitch";
import {
  MAX_NAME,
  MAX_SUBS,
  POSITIONS,
  emptyRoster,
  newPlayer,
  type Player,
  type Roster,
  type Team,
} from "@/lib/formation";
import { TEAMS, resolveTeams } from "@/lib/teams";

const STORAGE_KEY = "noibothietma:v2";
// Sau khi chia đội, muốn chia lại trong khoảng này phải nhập OTP
const LOCK_MS = 6 * 60 * 60 * 1000;
const OTP_COOLDOWN_S = 60;
const AVATAR_PX = 192;

// Kết quả chia kèm danh sách lúc chia, để sửa tên vẫn xem lại được đội hình cũ
type SplitResult = { roster: Roster; teams: [Team, Team]; at?: number };
type Saved = { roster: Roster; result: SplitResult | null; lockUntil?: number };

// Dữ liệu cũ có thể theo sơ đồ vị trí trước: thiếu vị trí thì thêm ô trống
function normalizeRoster(r: Partial<Roster> | undefined): Roster {
  const empty = emptyRoster();
  return {
    positions: Object.fromEntries(
      POSITIONS.map((p) => {
        const pair = r?.positions?.[p.key];
        return [p.key, Array.isArray(pair) && pair.length === 2 ? pair : empty.positions[p.key]];
      }),
    ) as Roster["positions"],
    subs: Array.isArray(r?.subs) ? r.subs : [],
  };
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Saved>;
    const result = data.result;
    const resultValid = result?.teams?.every((t) => POSITIONS.every((p) => t.lineup?.[p.key]));
    return {
      roster: normalizeRoster(data.roster),
      result:
        result && resultValid
          ? { roster: normalizeRoster(result.roster), teams: result.teams, at: result.at }
          : null,
      lockUntil: data.lockUntil,
    };
  } catch {
    return null;
  }
}

function save(data: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Trình duyệt chặn lưu trữ hoặc hết dung lượng: bỏ qua
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

// Cắt ảnh vuông ở giữa và thu nhỏ để lưu và gửi đi nhẹ
async function toAvatar(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_PX;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

function PlayerInput({
  player,
  placeholder,
  label,
  onChange,
  onError,
  onRemove,
}: {
  player: Player;
  placeholder: string;
  label: string;
  onChange: (patch: Partial<Player>) => void;
  onError: (msg: string) => void;
  onRemove?: () => void;
}) {
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange({ photo: await toAvatar(file) });
    } catch {
      onError("Không đọc được ảnh, hãy chọn ảnh JPG hoặc PNG khác.");
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="relative shrink-0">
        <label
          className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/15 text-lg ring-1 ring-white/25 transition duration-200 hover:scale-110 hover:bg-white/25 hover:ring-yellow-400/60"
          title="Chọn ảnh"
        >
          {player.photo ? (
            <Image
              key={player.photo.length}
              src={player.photo}
              alt={player.name}
              width={44}
              height={44}
              unoptimized
              className="anim-pop-in h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>📷</span>
          )}
          <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" aria-label={`Ảnh ${label}`} />
        </label>
        {player.photo && (
          <button
            onClick={() => onChange({ photo: undefined })}
            className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white ring-1 ring-white/40 transition hover:scale-110 hover:bg-red-600"
            aria-label={`Xóa ảnh ${label}`}
          >
            ✕
          </button>
        )}
      </div>
      <input
        value={player.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={placeholder}
        aria-label={label}
        maxLength={MAX_NAME}
        className="min-w-0 flex-1 rounded-xl bg-white/90 px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition duration-200 focus:bg-white focus:ring-4 focus:ring-yellow-400/50"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/60 transition hover:bg-red-500/20 hover:text-red-300"
          aria-label={`Xóa ${label}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function TeamSplitter() {
  // Khôi phục danh sách đã nhập lần trước (component chỉ render ở trình duyệt)
  const [saved] = useState(load);
  const [roster, setRoster] = useState<Roster>(() => saved?.roster ?? emptyRoster());
  const [result, setResult] = useState<SplitResult | null>(saved?.result ?? null);
  const [showResult, setShowResult] = useState(Boolean(saved?.result));
  const [lockUntil, setLockUntil] = useState(saved?.lockUntil ?? 0);
  const [error, setError] = useState("");
  const [splitting, setSplitting] = useState(false);

  // Hộp nhập OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    save({ roster, result, lockUntil });
  }, [roster, result, lockUntil]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const updatePlayer = (id: string, patch: Partial<Player>) => {
    const apply = (p: Player) => (p.id === id ? { ...p, ...patch } : p);
    setRoster((r) => ({
      positions: Object.fromEntries(
        POSITIONS.map((p) => [p.key, r.positions[p.key].map(apply)]),
      ) as Roster["positions"],
      subs: r.subs.map(apply),
    }));
    setError("");
  };

  const addSub = () => setRoster((r) => ({ ...r, subs: [...r.subs, newPlayer()] }));
  const removeSub = (id: string) => setRoster((r) => ({ ...r, subs: r.subs.filter((s) => s.id !== id) }));

  // Bỏ khoảng trắng thừa, bỏ ô dự bị để trống; báo vị trí còn thiếu người
  const cleanRoster = () => {
    const trim = (p: Player) => ({ ...p, name: p.name.trim() });
    const cleaned: Roster = {
      positions: Object.fromEntries(
        POSITIONS.map((p) => [p.key, roster.positions[p.key].map(trim)]),
      ) as Roster["positions"],
      subs: roster.subs.map(trim).filter((s) => s.name),
    };
    const missing = POSITIONS.filter((p) => cleaned.positions[p.key].some((pl) => !pl.name));
    if (missing.length) {
      setError(`Còn thiếu người ở vị trí: ${missing.map((p) => p.key).join(", ")}`);
      return null;
    }
    return cleaned;
  };

  const doSplit = async (otp?: { otp: string; otpToken: string }) => {
    const cleaned = cleanRoster();
    if (!cleaned) return false;
    setSplitting(true);
    setError("");
    try {
      const data = await postJson<{ teams: [Team, Team] }>("/api/split", {
        roster: cleaned,
        resplit: Boolean(otp),
        ...otp,
      });
      setRoster(cleaned);
      setResult({ roster: cleaned, teams: data.teams, at: Date.now() });
      setShowResult(true);
      setLockUntil(Date.now() + LOCK_MS);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      if (otp) setOtpError(msg);
      else setError(msg);
      return false;
    } finally {
      setSplitting(false);
    }
  };

  // Đã chia đội gần đây thì phải có OTP mới được chia tiếp
  const handleSplit = () => {
    if (!cleanRoster()) return;
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
    setSendingOtp(true);
    try {
      const data = await postJson<{ token: string }>("/api/otp");
      setOtpToken(data.token);
      setCooldown(OTP_COOLDOWN_S);
    } catch (e) {
      setOtpError((e as Error).message);
    } finally {
      setSendingOtp(false);
    }
  };

  const confirmOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Mã OTP gồm 6 chữ số.");
      return;
    }
    if (!otpToken) {
      setOtpError(sendingOtp ? "Đang gửi mã, đợi vài giây rồi bấm lại." : "Bấm “Gửi mã OTP” trước.");
      return;
    }
    if (await doSplit({ otp: otpCode, otpToken })) {
      setOtpOpen(false);
      setOtpToken("");
    }
  };

  const resolved = result ? resolveTeams(result.roster, result.teams) : null;

  const handleClear = () => {
    if (!confirm("Xóa toàn bộ danh sách đã nhập (cả ảnh)?")) return;
    setRoster(emptyRoster());
    setResult(null);
    setError("");
  };

  // Màn hình chờ khi đang chia đội và gửi email
  const splittingOverlay = splitting && (
    <div className="anim-backdrop fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-sm">
      <div className="flex h-24 w-24 flex-col items-center justify-end">
        <span className="anim-ball text-5xl leading-none" aria-hidden>
          ⚽
        </span>
        <span className="anim-shadow mt-1 h-2 w-12 rounded-full bg-black/70" />
      </div>
      <p className="text-lg font-extrabold text-yellow-400">Đang chia đội...</p>
      <p className="text-sm text-white/60">Đang gửi ảnh đội hình về email</p>
    </div>
  );

  // Ô nhập mã luôn hiện sẵn, để mã về email trước khi server phản hồi vẫn nhập được
  const otpDialog = otpOpen && (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="anim-modal w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#1d3f2a] to-[#132b1c] p-5 shadow-2xl ring-1 ring-white/15">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/15 text-2xl ring-1 ring-yellow-400/40">
          🔐
        </div>
        <h2 className="mb-1 text-lg font-extrabold text-yellow-400">Nhập mã OTP để chia lại</h2>
        <p className="mb-4 text-sm text-white/70">
          Đội đã được chia. Muốn chia lại cần mã OTP gửi tới email quản lý.
        </p>
        <button
          onClick={requestOtp}
          disabled={sendingOtp || cooldown > 0}
          className="btn btn-secondary mb-3 flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          {sendingOtp ? (
            <>
              <span className="anim-spin inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
              Đang gửi mã...
            </>
          ) : cooldown > 0 ? (
            `✓ Đã gửi · gửi lại sau ${cooldown}s`
          ) : otpToken ? (
            "📧 Gửi lại mã OTP"
          ) : (
            "📧 Gửi mã OTP"
          )}
        </button>
        <input
          value={otpCode}
          onChange={(e) => {
            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setOtpError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Mã 6 số"
          aria-label="Mã OTP"
          className="mb-3 w-full rounded-xl bg-white/90 px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-zinc-900 outline-none transition focus:bg-white focus:ring-4 focus:ring-yellow-400/60"
        />
        {otpError && <p className="anim-fade-up mb-3 text-center text-sm text-red-300">{otpError}</p>}
        <div className="flex gap-2">
          <button onClick={() => setOtpOpen(false)} className="btn btn-secondary flex-1">
            Hủy
          </button>
          <button
            onClick={confirmOtp}
            disabled={splitting || otpCode.length !== 6}
            className="btn btn-primary flex-1 disabled:opacity-50"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );

  if (resolved && showResult) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div
          key={result?.at}
          className="grid w-full max-w-4xl grid-cols-1 items-start justify-items-center gap-8 md:grid-cols-2"
        >
          {TEAMS.map((t, i) => (
            <Pitch key={t.name} name={t.name} team={resolved[i]} kit={t.kit} index={i} />
          ))}
        </div>
        <div className="sticky bottom-0 z-10 w-full bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent pb-3 pt-6">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={handleSplit} disabled={splitting} className="btn btn-primary flex-1 disabled:opacity-50">
              🎲 Chia lại
            </button>
            <button onClick={() => setShowResult(false)} className="btn btn-secondary flex-1">
              ✏️ Sửa tên
            </button>
          </div>
        </div>
        {error && <p className="anim-fade-up text-sm text-red-300">{error}</p>}
        {otpDialog}
        {splittingOverlay}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {resolved && (
        <button onClick={() => setShowResult(true)} className="btn btn-secondary anim-fade-up mb-4 w-full">
          ← Xem lại đội hình vừa chia
        </button>
      )}
      <p className="anim-fade-up mb-4 text-center text-sm text-white/70">
        Nhập 2 người đá cùng một vị trí, bấm 📷 để thêm ảnh. Bấm <b>Chia đội</b>, mỗi vị trí sẽ chia
        ngẫu nhiên 1 người sang mỗi đội, dự bị chia đều hai bên.
      </p>
      <ul className="flex flex-col gap-3">
        {POSITIONS.map((p, i) => (
          <li key={p.key} className="card anim-fade-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="rounded-md bg-gradient-to-b from-[#8a1538] to-[#5a0f29] px-2 py-0.5 text-sm font-extrabold shadow">
                {p.key}
              </span>
              <span className="text-sm text-white/70">{p.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {roster.positions[p.key].map((pl, idx) => (
                <PlayerInput
                  key={pl.id}
                  player={pl}
                  placeholder={`Người ${idx + 1}`}
                  label={`${p.label} - người ${idx + 1}`}
                  onChange={(patch) => updatePlayer(pl.id, patch)}
                  onError={setError}
                />
              ))}
            </div>
          </li>
        ))}
        <li className="card anim-fade-up" style={{ animationDelay: `${0.05 + POSITIONS.length * 0.05}s` }}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="rounded-md bg-gradient-to-b from-[#8a1538] to-[#5a0f29] px-2 py-0.5 text-sm font-extrabold shadow">
              DB
            </span>
            <span className="text-sm text-white/70">
              Dự bị ({roster.subs.length}/{MAX_SUBS})
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {roster.subs.map((s, idx) => (
              <div key={s.id} className="anim-fade-up">
                <PlayerInput
                  player={s}
                  placeholder={`Dự bị ${idx + 1}`}
                  label={`Dự bị ${idx + 1}`}
                  onChange={(patch) => updatePlayer(s.id, patch)}
                  onError={setError}
                  onRemove={() => removeSub(s.id)}
                />
              </div>
            ))}
            {roster.subs.length < MAX_SUBS && (
              <button
                onClick={addSub}
                className="btn w-full border border-dashed border-white/25 py-2.5 text-sm text-white/80 hover:border-yellow-400/60 hover:text-yellow-300"
              >
                ＋ Thêm dự bị
              </button>
            )}
          </div>
        </li>
      </ul>
      {error && <p className="anim-fade-up mt-3 text-center text-sm text-red-300">{error}</p>}
      <div className="sticky bottom-0 z-10 mt-4 flex gap-2 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent pb-3 pt-6">
        <button onClick={handleClear} className="btn btn-secondary">
          Xóa hết
        </button>
        <button onClick={handleSplit} disabled={splitting} className="btn btn-primary flex-1 text-lg disabled:opacity-50">
          ⚽ Chia đội
        </button>
      </div>
      {otpDialog}
      {splittingOverlay}
    </div>
  );
}
