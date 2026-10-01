"use client";

import { useEffect, useState } from "react";
import Pitch, { type Kit } from "@/components/Pitch";
import {
  POSITIONS,
  emptyRoster,
  splitTeams,
  type Lineup,
  type PositionKey,
  type Roster,
} from "@/lib/formation";

const STORAGE_KEY = "noibothietma:v1";

const TEAMS: { name: string; kit: Kit; emoji: string }[] = [
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

type Saved = { roster: Roster; result: [Lineup, Lineup] | null };

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

function resultText(result: [Lineup, Lineup]) {
  const team = (i: number) =>
    `${TEAMS[i].emoji} ${TEAMS[i].name.toUpperCase()}\n` +
    POSITIONS.map((p) => `${p.key}: ${result[i][p.key]}`).join("\n");
  return `⚽ FC THIẾT MÃ\n\n${team(0)}\n\n${team(1)}`;
}

export default function TeamSplitter() {
  // Khôi phục danh sách đã nhập lần trước (component chỉ render ở trình duyệt)
  const [saved] = useState(load);
  const [roster, setRoster] = useState<Roster>(() => ({ ...emptyRoster(), ...saved?.roster }));
  const [result, setResult] = useState<[Lineup, Lineup] | null>(saved?.result ?? null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    save({ roster, result });
  }, [roster, result]);

  const setName = (key: PositionKey, idx: 0 | 1, value: string) => {
    setRoster((r) => {
      const pair: [string, string] = [...r[key]];
      pair[idx] = value;
      return { ...r, [key]: pair };
    });
    setError("");
  };

  const handleSplit = () => {
    const trimmed = Object.fromEntries(
      POSITIONS.map((p) => [p.key, roster[p.key].map((n) => n.trim())]),
    ) as Roster;
    const missing = POSITIONS.filter((p) => trimmed[p.key].some((n) => !n));
    if (missing.length) {
      setError(`Còn thiếu người ở vị trí: ${missing.map((p) => p.key).join(", ")}`);
      return;
    }
    setRoster(trimmed);
    setResult(splitTeams(trimmed));
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (result) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="grid w-full max-w-4xl grid-cols-1 justify-items-center gap-8 md:grid-cols-2">
          {TEAMS.map((t, i) => (
            <Pitch key={t.name} name={t.name} lineup={result[i]} kit={t.kit} />
          ))}
        </div>
        <div className="sticky bottom-0 flex w-full max-w-md justify-center gap-2 bg-[var(--background)]/90 py-3 backdrop-blur">
          <button onClick={handleSplit} className="btn btn-primary flex-1">
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
        <button onClick={handleSplit} className="btn btn-primary flex-1 text-lg">
          ⚽ Chia đội
        </button>
      </div>
    </div>
  );
}
