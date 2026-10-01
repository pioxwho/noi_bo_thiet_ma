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
import { TEAMS, resolveTeams, type Kit } from "@/lib/teams";

const STORAGE_KEY = "noibothietma:v3";
// Bản trước (chia ngẫu nhiên, dự bị chung một danh sách): chỉ lấy lại tên và ảnh
const OLD_STORAGE_KEY = "noibothietma:v2";
const AVATAR_PX = 192;

// Đội hình vừa chia kèm danh sách lúc chia, để sửa tên vẫn xem lại được đội hình cũ
type SplitResult = { roster: Roster; teams: [Team, Team]; at?: number };
type Saved = { roster: Roster; result: SplitResult | null };

// Dữ liệu cũ có thể theo sơ đồ vị trí trước: thiếu vị trí thì thêm ô trống
function normalizeRoster(r: { positions?: Partial<Roster["positions"]>; subs?: unknown } | undefined): Roster {
  const empty = emptyRoster();
  const subs: Roster["subs"] = [[], []];
  if (Array.isArray(r?.subs)) {
    if (r.subs.length === 2 && r.subs.every(Array.isArray)) {
      subs[0] = r.subs[0] as Player[];
      subs[1] = r.subs[1] as Player[];
    } else {
      // Dự bị kiểu cũ (một danh sách chung): chia lần lượt sang hai đội
      (r.subs as Player[]).forEach((p, i) => subs[i % 2].push(p));
    }
  }
  return {
    positions: Object.fromEntries(
      POSITIONS.map((p) => {
        const pair = r?.positions?.[p.key];
        return [p.key, Array.isArray(pair) && pair.length === 2 ? pair : empty.positions[p.key]];
      }),
    ) as Roster["positions"],
    subs: [subs[0].slice(0, MAX_SUBS), subs[1].slice(0, MAX_SUBS)],
  };
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem(OLD_STORAGE_KEY);
      return old ? { roster: normalizeRoster(JSON.parse(old).roster), result: null } : null;
    }
    const data = JSON.parse(raw) as Partial<Saved>;
    const result = data.result;
    const resultValid = result?.teams?.every((t) => POSITIONS.every((p) => t.lineup?.[p.key]));
    return {
      roster: normalizeRoster(data.roster),
      result:
        result && resultValid
          ? { roster: normalizeRoster(result.roster), teams: result.teams, at: result.at }
          : null,
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

// Chấm màu áo đứng trước tên đội
function KitDot({ kit }: { kit: Kit }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2"
      style={{ background: kit.body, borderColor: kit.sleeve === kit.body ? kit.trim : kit.sleeve }}
    />
  );
}

function PlayerInput({
  player,
  placeholder,
  label,
  kit,
  onChange,
  onError,
  onRemove,
}: {
  player: Player;
  placeholder: string;
  label: string;
  kit: Kit;
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
          className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 bg-white/15 text-lg transition duration-200 hover:scale-110 hover:bg-white/25"
          style={{ borderColor: kit.body === "#141414" ? "#52525b" : kit.body }}
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
  const [error, setError] = useState("");
  const [splitting, setSplitting] = useState(false);

  useEffect(() => {
    save({ roster, result });
  }, [roster, result]);

  const updatePlayer = (id: string, patch: Partial<Player>) => {
    const apply = (p: Player) => (p.id === id ? { ...p, ...patch } : p);
    setRoster((r) => ({
      positions: Object.fromEntries(
        POSITIONS.map((p) => [p.key, r.positions[p.key].map(apply)]),
      ) as Roster["positions"],
      subs: [r.subs[0].map(apply), r.subs[1].map(apply)],
    }));
    setError("");
  };

  const addSub = (team: 0 | 1) =>
    setRoster((r) => {
      const subs: Roster["subs"] = [[...r.subs[0]], [...r.subs[1]]];
      subs[team].push(newPlayer());
      return { ...r, subs };
    });
  const removeSub = (id: string) =>
    setRoster((r) => ({ ...r, subs: [r.subs[0].filter((s) => s.id !== id), r.subs[1].filter((s) => s.id !== id)] }));

  // Bỏ khoảng trắng thừa, bỏ ô dự bị để trống; báo vị trí còn thiếu người
  const cleanRoster = () => {
    const trim = (p: Player) => ({ ...p, name: p.name.trim() });
    const cleaned: Roster = {
      positions: Object.fromEntries(
        POSITIONS.map((p) => [p.key, roster.positions[p.key].map(trim)]),
      ) as Roster["positions"],
      subs: [roster.subs[0].map(trim).filter((s) => s.name), roster.subs[1].map(trim).filter((s) => s.name)],
    };
    const missing = POSITIONS.flatMap((p) =>
      TEAMS.flatMap((t, i) => (cleaned.positions[p.key][i].name ? [] : [`${p.label} (${t.name})`])),
    );
    if (missing.length) {
      setError(`Còn thiếu người ở: ${missing.join(", ")}`);
      return null;
    }
    return cleaned;
  };

  const handleSplit = async () => {
    const cleaned = cleanRoster();
    if (!cleaned) return;
    setSplitting(true);
    setError("");
    try {
      const data = await postJson<{ teams: [Team, Team] }>("/api/split", { roster: cleaned });
      setRoster(cleaned);
      setResult({ roster: cleaned, teams: data.teams, at: Date.now() });
      setShowResult(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSplitting(false);
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
            <button onClick={() => setShowResult(false)} className="btn btn-primary flex-1">
              ✏️ Sửa đội hình / Chia lại
            </button>
          </div>
        </div>
        {error && <p className="anim-fade-up text-sm text-red-300">{error}</p>}
        {splittingOverlay}
      </div>
    );
  }

  const header = (
    <div className="grid grid-cols-2 gap-2 px-3">
      {TEAMS.map((t) => (
        <div
          key={t.name}
          className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-2 text-sm font-extrabold uppercase tracking-wide ring-1 ring-white/10"
        >
          <KitDot kit={t.kit} />
          {t.name}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      {resolved && (
        <button onClick={() => setShowResult(true)} className="btn btn-secondary anim-fade-up mb-4 w-full">
          ← Xem lại đội hình vừa chia
        </button>
      )}
      <p className="anim-fade-up mb-4 text-center text-sm text-white/70">
        Cột <b>trái</b> là đội <b>{TEAMS[0].name}</b>, cột <b>phải</b> là đội <b>{TEAMS[1].name}</b>. Bấm 📷 để
        thêm ảnh, nhập xong bấm <b>Chia đội</b>.
      </p>
      <div className="anim-fade-up sticky top-0 z-20 -mx-1 mb-3 bg-[var(--background)]/85 px-1 py-2 backdrop-blur">
        {header}
      </div>
      <ul className="flex flex-col gap-3">
        {POSITIONS.map((p, i) => (
          <li key={p.key} className="card anim-fade-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="rounded-md bg-gradient-to-b from-[#8a1538] to-[#5a0f29] px-2 py-0.5 text-sm font-extrabold shadow">
                {p.short}
              </span>
              <span className="text-sm text-white/70">{p.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {roster.positions[p.key].map((pl, idx) => (
                <PlayerInput
                  key={pl.id}
                  player={pl}
                  kit={TEAMS[idx].kit}
                  placeholder={`Tên ${TEAMS[idx].name.replace("Áo ", "")}`}
                  label={`${p.label} - ${TEAMS[idx].name}`}
                  onChange={(patch) => updatePlayer(pl.id, patch)}
                  onError={setError}
                />
              ))}
            </div>
          </li>
        ))}
        {TEAMS.map((t, team) => (
          <li
            key={t.name}
            className="card anim-fade-up"
            style={{ animationDelay: `${0.05 + (POSITIONS.length + team) * 0.05}s` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-gradient-to-b from-[#8a1538] to-[#5a0f29] px-2 py-0.5 text-sm font-extrabold shadow">
                DB
              </span>
              <KitDot kit={t.kit} />
              <span className="text-sm text-white/70">
                Dự bị {t.name} ({roster.subs[team].length}/{MAX_SUBS})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {roster.subs[team].map((s, idx) => (
                <div key={s.id} className="anim-fade-up">
                  <PlayerInput
                    player={s}
                    kit={t.kit}
                    placeholder={`Dự bị ${idx + 1}`}
                    label={`Dự bị ${idx + 1} - ${t.name}`}
                    onChange={(patch) => updatePlayer(s.id, patch)}
                    onError={setError}
                    onRemove={() => removeSub(s.id)}
                  />
                </div>
              ))}
              {roster.subs[team].length < MAX_SUBS && (
                <button
                  onClick={() => addSub(team as 0 | 1)}
                  className="btn w-full border border-dashed border-white/25 py-2.5 text-sm text-white/80 hover:border-yellow-400/60 hover:text-yellow-300"
                >
                  ＋ Thêm dự bị {t.name}
                </button>
              )}
            </div>
          </li>
        ))}
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
      {splittingOverlay}
    </div>
  );
}
