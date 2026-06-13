"use client";

import Image from "next/image";
import { useRef, useState, ChangeEvent, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Macros {
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

interface LoggedMeal {
  id: string;
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

interface DailyLog {
  date: string;
  meals: LoggedMeal[];
}

type Screen = "init" | "goal-setup" | "dashboard" | "scan" | "analyzing" | "results";

// ── Storage ───────────────────────────────────────────────────────────────────

const GOAL_KEY = "vitano_protein_goal";
const LOG_KEY = "vitano_daily_log";

function todayString(): string {
  return new Date().toDateString();
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Image compression ─────────────────────────────────────────────────────────
// Resizes to max 1024px and converts to JPEG — fixes HEIC and oversized photos.

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height / width) * MAX);
          width = MAX;
        } else {
          width = Math.round((width / height) * MAX);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ── AI analysis ───────────────────────────────────────────────────────────────

async function analyzeMeal(imageDataUrl: string): Promise<Macros> {
  const compressed = await compressImage(imageDataUrl);
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: compressed }),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Analysis failed");
  }
  return res.json() as Promise<Macros>;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCamera({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconPhoto({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconCheck({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ── Protein Ring ──────────────────────────────────────────────────────────────

function ProteinRing({ consumed, goal }: { consumed: number; goal: number }) {
  const r = 68;
  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const offset = circ * (1 - progress);
  const done = goal > 0 && consumed >= goal;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1c1c" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={done ? "#6ee7b7" : "#9b6bff"}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={progress > 0 ? offset : circ}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-black text-white tabular-nums leading-none">{consumed}</span>
        <span className="text-[11px] text-neutral-500 mt-1.5 tracking-wide">of {goal}g protein</span>
        {done && (
          <span className="text-[11px] text-emerald-400 font-semibold mt-1">Goal hit</span>
        )}
      </div>
    </div>
  );
}

// ── MacroField ────────────────────────────────────────────────────────────────

function MacroField({
  label,
  value,
  unit,
  primary,
  adjusting,
  onActivateAdjust,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  primary?: boolean;
  adjusting: boolean;
  onActivateAdjust: () => void;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onChange(Math.round(n));
    else setDraft(String(value));
  }

  if (primary) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-8 border-b border-neutral-800/60">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6bff]">
          {label}
        </span>
        {adjusting ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="text-7xl font-black bg-transparent text-center text-white w-44 outline-none border-b border-[#9b6bff]/60 pb-1 tabular-nums"
          />
        ) : (
          <button
            onClick={onActivateAdjust}
            className="text-7xl font-black text-white tabular-nums leading-none"
          >
            {value}
          </button>
        )}
        <span className="text-neutral-500 text-sm">{unit}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 py-5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      {adjusting ? (
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="text-[1.75rem] font-bold bg-transparent text-center text-white w-24 outline-none border-b border-[#9b6bff]/60 pb-0.5 tabular-nums"
        />
      ) : (
        <button
          onClick={onActivateAdjust}
          className="text-[1.75rem] font-bold text-white tabular-nums leading-none"
        >
          {value}
        </button>
      )}
      <span className="text-neutral-600 text-[11px]">{unit}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("init");
  const [proteinGoal, setProteinGoal] = useState(160);
  const [goalDraft, setGoalDraft] = useState("160");
  const [dailyLog, setDailyLog] = useState<DailyLog>({ date: todayString(), meals: [] });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [macros, setMacros] = useState<Macros | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage once on mount
  useEffect(() => {
    const savedGoal = localStorage.getItem(GOAL_KEY);
    const savedLog = localStorage.getItem(LOG_KEY);

    const goal = savedGoal ? parseInt(savedGoal, 10) : 0;
    if (goal > 0) {
      setProteinGoal(goal);
      setGoalDraft(String(goal));
    }

    if (savedLog) {
      try {
        const log = JSON.parse(savedLog) as DailyLog;
        if (log.date === todayString()) {
          setDailyLog(log);
        }
        // new day → keep initial empty log, goal persists separately
      } catch {
        // corrupted — start fresh
      }
    }

    setMounted(true);
    setScreen(goal > 0 ? "dashboard" : "goal-setup");
  }, []);

  // Persist goal
  useEffect(() => {
    if (!mounted || proteinGoal <= 0) return;
    localStorage.setItem(GOAL_KEY, String(proteinGoal));
  }, [proteinGoal, mounted]);

  // Persist daily log
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LOG_KEY, JSON.stringify(dailyLog));
  }, [dailyLog, mounted]);

  // Running totals
  const totals = dailyLog.meals.reduce(
    (acc, m) => ({
      protein: acc.protein + m.protein,
      calories: acc.calories + m.calories,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { protein: 0, calories: 0, carbs: 0, fat: 0 }
  );

  // Handlers
  function saveGoal() {
    const n = parseInt(goalDraft, 10);
    if (!n || n <= 0) return;
    setProteinGoal(n);
    setScreen("dashboard");
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleAnalyze() {
    if (!imageUrl) return;
    setAnalyzeError(null);
    setScreen("analyzing");
    try {
      const result = await analyzeMeal(imageUrl);
      setMacros(result);
      setScreen("results");
      setAdjusting(false);
    } catch (err) {
      console.error("[scan] analyse error:", err);
      setAnalyzeError("Couldn't analyse this photo — please try again");
      setScreen("scan");
    }
  }

  function handleSaveMeal() {
    if (!macros) return;
    const meal: LoggedMeal = {
      id: makeId(),
      items: macros.items,
      protein: macros.protein,
      calories: macros.calories,
      carbs: macros.carbs,
      fat: macros.fat,
    };
    setDailyLog((prev) => ({ ...prev, meals: [...prev.meals, meal] }));
    setImageUrl(null);
    setMacros(null);
    setAdjusting(false);
    setScreen("dashboard");
  }

  function deleteMeal(id: string) {
    setDailyLog((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  if (screen === "init") {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  // ── Goal setup ────────────────────────────────────────────────────────────────
  if (screen === "goal-setup") {
    return (
      <div className="flex flex-col min-h-screen px-6 max-w-md mx-auto w-full">
        <div className="pt-12 mb-16">
          <Image
            src="/vitano_logo_transparent_white.png"
            alt="Vitano"
            height={28}
            width={112}
            className="object-contain"
            priority
          />
        </div>

        <div className="flex-1 flex flex-col justify-center pb-16">
          <h1 className="text-[1.75rem] font-black tracking-tight mb-2">
            Set your protein goal
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed mb-10">
            How many grams of protein do you aim to hit each day? You can change this anytime.
          </p>

          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 block mb-2">
            Daily protein goal
          </label>
          <div className="relative mb-8">
            <input
              type="number"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveGoal()}
              className="w-full px-4 py-4 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-[#9b6bff] transition-colors tabular-nums"
              placeholder="160"
              min={1}
              max={500}
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
              g / day
            </span>
          </div>

          <button
            onClick={saveGoal}
            className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide"
          >
            Set goal
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  if (screen === "dashboard") {
    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <div className="flex flex-col min-h-screen max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-4">
          <Image
            src="/vitano_logo_transparent_white.png"
            alt="Vitano"
            height={28}
            width={112}
            className="object-contain"
            priority
          />
          <button
            onClick={() => { setGoalDraft(String(proteinGoal)); setScreen("goal-setup"); }}
            className="text-neutral-600 hover:text-white transition-colors p-1"
            aria-label="Edit goal"
          >
            <IconPencil className="w-4 h-4" />
          </button>
        </div>

        <p className="px-5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-700 mb-6">
          {dateLabel}
        </p>

        {/* Protein ring */}
        <div className="flex justify-center mb-6">
          <ProteinRing consumed={totals.protein} goal={proteinGoal} />
        </div>

        {/* Secondary macros */}
        <div className="mx-5 grid grid-cols-3 divide-x divide-neutral-800/60 border border-neutral-800/60 rounded-2xl bg-neutral-950 mb-7">
          {([
            { label: "Calories", value: totals.calories, unit: "kcal" },
            { label: "Carbs", value: totals.carbs, unit: "g" },
            { label: "Fat", value: totals.fat, unit: "g" },
          ] as const).map((m) => (
            <div key={m.label} className="flex flex-col items-center py-4 gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {m.label}
              </span>
              <span className="text-xl font-bold text-white tabular-nums">{m.value}</span>
              <span className="text-neutral-600 text-[10px]">{m.unit}</span>
            </div>
          ))}
        </div>

        {/* Meal list */}
        <div className="flex-1 px-5 pb-32">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Today&apos;s meals
            </h2>
            <span className="text-[11px] text-neutral-700">
              {dailyLog.meals.length} logged
            </span>
          </div>

          {dailyLog.meals.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-neutral-600 text-sm">No meals logged yet.</p>
              <p className="text-neutral-700 text-xs mt-1">Tap below to scan your first meal.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {dailyLog.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-3 px-4 py-3.5 bg-neutral-950 border border-neutral-800/60 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate leading-snug">
                      {meal.items.join(", ")}
                    </p>
                    <p className="text-[#9b6bff] text-xs mt-0.5 font-semibold">
                      {meal.protein}g protein
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="flex-shrink-0 text-neutral-700 hover:text-neutral-400 transition-colors p-1 -mr-1"
                    aria-label="Remove meal"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-8 pt-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pointer-events-none">
          <button
            onClick={() => {
              setImageUrl(null);
              setMacros(null);
              setAnalyzeError(null);
              setScreen("scan");
            }}
            className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide flex items-center justify-center gap-2 pointer-events-auto"
          >
            <IconPlus className="w-5 h-5" />
            Scan a meal
          </button>
        </div>
      </div>
    );
  }

  // ── Scan ──────────────────────────────────────────────────────────────────────
  if (screen === "scan") {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => setScreen("dashboard")}
            className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
          >
            <IconChevronLeft className="w-4 h-4" />
            Today
          </button>
          <span className="text-[11px] text-neutral-600 font-medium tracking-wide uppercase">beta</span>
        </div>

        <h1 className="text-[1.6rem] font-black mb-1.5 tracking-tight">Scan your meal</h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
          Take a photo or choose from your library — we&apos;ll estimate your macros in seconds.
        </p>

        <div
          onClick={() => libraryInputRef.current?.click()}
          className={`
            relative flex-1 min-h-[300px] rounded-2xl border border-dashed cursor-pointer
            flex flex-col items-center justify-center gap-4 transition-colors overflow-hidden
            ${imageUrl ? "border-[#9b6bff]/50 bg-neutral-950" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}
          `}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Meal preview" className="w-full h-full object-cover absolute inset-0 rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <IconPhoto className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-neutral-600 text-sm text-center px-8 leading-relaxed">
                Tap to choose a photo
              </p>
            </div>
          )}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={libraryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        <div className="mt-5 flex flex-col gap-3">
          {analyzeError && (
            <p className="text-red-400 text-sm text-center py-2.5 px-4 bg-red-400/10 rounded-xl border border-red-400/20">
              {analyzeError}
            </p>
          )}
          {imageUrl && (
            <button
              onClick={handleAnalyze}
              className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide"
            >
              Analyse meal
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="py-3.5 rounded-xl border border-neutral-800 text-neutral-400 font-medium text-sm hover:border-neutral-700 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <IconCamera className="w-4 h-4" />
              Take photo
            </button>
            <button
              onClick={() => libraryInputRef.current?.click()}
              className="py-3.5 rounded-xl border border-neutral-800 text-neutral-400 font-medium text-sm hover:border-neutral-700 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <IconPhoto className="w-4 h-4" />
              {imageUrl ? "Change photo" : "Choose photo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Analyzing ─────────────────────────────────────────────────────────────────
  if (screen === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-7 px-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-neutral-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-[#9b6bff] animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg tracking-tight">Analysing your meal</p>
          <p className="text-neutral-500 text-sm mt-1.5">Estimating protein and macros</p>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Meal" className="w-28 h-28 object-cover rounded-2xl opacity-30" />
        )}
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  if (screen === "results" && macros) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={() => setScreen("scan")}
            className="text-neutral-500 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <IconChevronLeft className="w-4 h-4" />
            Scan again
          </button>
          <span className="text-[11px] text-neutral-600 font-medium tracking-wide uppercase">beta</span>
        </div>

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Meal" className="w-full h-44 object-cover rounded-2xl mb-6" />
        )}

        {macros.items.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-2.5">
              Detected
            </p>
            <div className="flex flex-wrap gap-2">
              {macros.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-300 text-[13px]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden mb-3">
          <MacroField
            label="Protein" value={macros.protein} unit="grams" primary
            adjusting={adjusting} onActivateAdjust={() => setAdjusting(true)}
            onChange={(v) => setMacros({ ...macros, protein: v })}
          />
          <div className="grid grid-cols-3 divide-x divide-neutral-800/60 border-t border-neutral-800/60">
            <MacroField
              label="Calories" value={macros.calories} unit="kcal"
              adjusting={adjusting} onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, calories: v })}
            />
            <MacroField
              label="Carbs" value={macros.carbs} unit="g"
              adjusting={adjusting} onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, carbs: v })}
            />
            <MacroField
              label="Fat" value={macros.fat} unit="g"
              adjusting={adjusting} onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, fat: v })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-1 mb-7">
          <p className="text-neutral-600 text-xs">AI estimate</p>
          {adjusting ? (
            <button
              onClick={() => setAdjusting(false)}
              className="flex items-center gap-1.5 text-[#9b6bff] text-xs font-semibold border border-[#9b6bff]/40 rounded-lg px-3 py-1.5 hover:bg-[#9b6bff]/10 transition-colors"
            >
              <IconCheck className="w-3.5 h-3.5" />
              Done
            </button>
          ) : (
            <button
              onClick={() => setAdjusting(true)}
              className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium border border-neutral-700 rounded-lg px-3 py-1.5 hover:border-neutral-500 hover:text-white transition-colors"
            >
              <IconPencil className="w-3 h-3" />
              Adjust
            </button>
          )}
        </div>

        <button
          onClick={handleSaveMeal}
          disabled={adjusting}
          className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save to today
        </button>
      </div>
    );
  }

  return null;
}
