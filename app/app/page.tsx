"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useRef, useState, ChangeEvent, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

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
  thumbnail?: string;
}

interface DailyLog {
  date: string;
  meals: LoggedMeal[];
}

interface GoalsRow {
  protein_goal: number;
  calories_goal: number;
  carbs_goal: number;
  fat_goal: number;
}

interface MealRow {
  id: string;
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  thumbnail: string | null;
}

type Screen = "init" | "auth" | "settings" | "dashboard" | "scan" | "analyzing" | "results";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rowToMeal(row: MealRow): LoggedMeal {
  return {
    id: row.id,
    items: row.items,
    protein: row.protein,
    calories: row.calories,
    carbs: row.carbs,
    fat: row.fat,
    thumbnail: row.thumbnail ?? undefined,
  };
}

// ── Image compression ─────────────────────────────────────────────────────────

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

function makeThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const MAX = 200;
      let { width, height } = img;
      if (width >= height) {
        height = Math.round((height / width) * MAX);
        width = MAX;
      } else {
        width = Math.round((width / height) * MAX);
        height = MAX;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(""); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve("");
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

// ── Google icon ───────────────────────────────────────────────────────────────

function IconGoogle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
  const remaining = Math.max(0, goal - consumed);

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
        <span className="text-[11px] text-neutral-500 mt-1.5 tracking-wide">of {goal}g</span>
        {done
          ? <span className="text-[11px] text-emerald-400 font-semibold mt-1">Goal hit</span>
          : <span className="text-[11px] text-neutral-600 mt-0.5">{remaining}g left</span>
        }
      </div>
    </div>
  );
}

// ── Macro Ring ────────────────────────────────────────────────────────────────

function MacroRing({
  label,
  value,
  unit,
  color,
  goal,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  goal: number;
}) {
  const r = 32;
  const size = 84;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const hasGoal = goal > 0;
  const progress = hasGoal ? Math.min(value / goal, 1) : 0;
  const offset = circ * (1 - progress);
  const done = hasGoal && value >= goal;
  const remaining = hasGoal ? Math.max(0, goal - value) : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {hasGoal ? (
            <>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1c1c" strokeWidth={7} />
              <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={progress > 0 ? offset : circ}
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </>
          ) : (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7} />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[17px] font-bold text-white tabular-nums leading-none">{value}</span>
          <span className="text-[9px] text-neutral-600 mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</span>
      {hasGoal && (
        done
          ? <span className="text-[9px] text-emerald-500 font-semibold -mt-0.5">Done</span>
          : <span className="text-[9px] text-neutral-700 -mt-0.5">{remaining}{unit} left</span>
      )}
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

// ── Optional goal input row ───────────────────────────────────────────────────

function GoalInput({
  label,
  color,
  value,
  onChange,
  onClear,
  placeholder,
  unit,
}: {
  label: string;
  color: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  unit: string;
}) {
  return (
    <div>
      <label
        className="text-[11px] font-semibold uppercase tracking-[0.14em] block mb-1.5"
        style={{ color }}
      >
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={1}
            className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-lg font-semibold focus:outline-none transition-colors tabular-nums placeholder:text-neutral-700"
            style={{ borderColor: value ? `${color}33` : undefined }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
            {unit}
          </span>
        </div>
        {value ? (
          <button
            onClick={onClear}
            className="w-12 flex items-center justify-center rounded-xl border border-neutral-800 text-neutral-600 hover:text-white hover:border-neutral-600 transition-colors flex-shrink-0"
            aria-label="Clear"
          >
            <IconX className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Name helper ──────────────────────────────────────────────────────────────

function extractDisplayName(user: User): string | null {
  const m = user.user_metadata as Record<string, string> | undefined;
  return m?.display_name ?? m?.given_name ?? m?.full_name ?? m?.name ?? null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("init");
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Auth
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Goals — 0 means not set
  const [proteinGoal, setProteinGoal] = useState(0);
  const [goalDraft, setGoalDraft] = useState("");
  const [caloriesGoal, setCaloriesGoal] = useState(0);
  const [carbsGoal, setCarbsGoal] = useState(0);
  const [fatGoal, setFatGoal] = useState(0);
  const [calDraft, setCalDraft] = useState("");
  const [carbsDraft, setCarbsDraft] = useState("");
  const [fatDraft, setFatDraft] = useState("");

  const [dailyLog, setDailyLog] = useState<DailyLog>({ date: todayISO(), meals: [] });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [macros, setMacros] = useState<Macros | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Loads goals + today's meals from Supabase, sets state, returns protein goal
  const loadAndApplyUserData = useCallback(async (userId: string): Promise<number> => {
    const { data: goalsRow } = await supabase
      .from("user_goals")
      .select("protein_goal, calories_goal, carbs_goal, fat_goal")
      .eq("user_id", userId)
      .maybeSingle();

    const gr = goalsRow as GoalsRow | null;
    const pg = gr?.protein_goal ?? 0;
    const cg = gr?.calories_goal ?? 0;
    const cbg = gr?.carbs_goal ?? 0;
    const fg = gr?.fat_goal ?? 0;

    if (pg > 0) { setProteinGoal(pg); setGoalDraft(String(pg)); }
    if (cg > 0) { setCaloriesGoal(cg); setCalDraft(String(cg)); }
    if (cbg > 0) { setCarbsGoal(cbg); setCarbsDraft(String(cbg)); }
    if (fg > 0) { setFatGoal(fg); setFatDraft(String(fg)); }

    const { data: mealsRows } = await supabase
      .from("meal_logs")
      .select("id, items, protein, calories, carbs, fat, thumbnail")
      .eq("user_id", userId)
      .eq("logged_date", todayISO())
      .order("created_at");

    if (mealsRows?.length) {
      setDailyLog({ date: todayISO(), meals: (mealsRows as MealRow[]).map(rowToMeal) });
    }

    return pg;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: check session + listen for auth changes
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        setMounted(true);
        setScreen("auth");
        return;
      }
      setUser(session.user);
      setDisplayName(extractDisplayName(session.user));
      const pg = await loadAndApplyUserData(session.user.id);
      if (!cancelled) {
        setMounted(true);
        setScreen(pg > 0 ? "dashboard" : "settings");
      }
    }).catch(console.error);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!cancelled && event === "SIGNED_OUT") {
        setUser(null);
        setDisplayName(null);
        setProteinGoal(0); setGoalDraft("");
        setCaloriesGoal(0); setCalDraft("");
        setCarbsGoal(0); setCarbsDraft("");
        setFatGoal(0); setFatDraft("");
        setDailyLog({ date: todayISO(), meals: [] });
        setMounted(true);
        setScreen("auth");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadAndApplyUserData]);

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

  // ── Auth handlers ─────────────────────────────────────────────────────────────

  async function handleAuth() {
    if (authLoading) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { display_name: authName.trim() } },
        });
        if (error) throw error;

        if (data.session && data.user) {
          setUser(data.user);
          setDisplayName(authName.trim() || extractDisplayName(data.user));
          setMounted(true);
          setScreen("settings");
        } else {
          // Email confirmation required
          setAuthError("Check your inbox for a confirmation link, then log in.");
          setAuthMode("login");
          setAuthPassword("");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;

        setUser(data.user);
        setDisplayName(extractDisplayName(data.user));
        const pg = await loadAndApplyUserData(data.user.id);
        setMounted(true);
        setScreen(pg > 0 ? "dashboard" : "settings");
      }
    } catch (err) {
      setAuthError((err as { message?: string }).message ?? "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleAuth() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setAuthError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT handles state reset
  }

  // ── Settings handler ──────────────────────────────────────────────────────────

  async function saveSettings() {
    const n = parseInt(goalDraft, 10);
    if (!n || n <= 0) return;

    const cal = parseInt(calDraft, 10);
    const carbs = parseInt(carbsDraft, 10);
    const fat = parseInt(fatDraft, 10);

    const cg = !isNaN(cal) && cal > 0 ? cal : 0;
    const cbg = !isNaN(carbs) && carbs > 0 ? carbs : 0;
    const fg = !isNaN(fat) && fat > 0 ? fat : 0;

    setProteinGoal(n);
    setCaloriesGoal(cg);
    setCarbsGoal(cbg);
    setFatGoal(fg);

    if (user) {
      const { error } = await supabase.from("user_goals").upsert(
        {
          user_id: user.id,
          protein_goal: n,
          calories_goal: cg,
          carbs_goal: cbg,
          fat_goal: fg,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) console.error("[settings] upsert failed:", error);
    }

    setScreen("dashboard");
  }

  // ── Scan handlers ─────────────────────────────────────────────────────────────

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

  async function handleSaveMeal() {
    if (!macros) return;

    let thumbnail: string | undefined;
    if (imageUrl) {
      try {
        const t = await makeThumbnail(imageUrl);
        if (t) {
          thumbnail = t;
          console.log("[save] thumbnail generated, bytes:", t.length);
        } else {
          console.warn("[save] makeThumbnail returned empty string");
        }
      } catch (err) {
        console.warn("[save] thumbnail failed:", err);
      }
    }

    const meal: LoggedMeal = {
      id: makeId(),
      items: macros.items,
      protein: macros.protein,
      calories: macros.calories,
      carbs: macros.carbs,
      fat: macros.fat,
      ...(thumbnail ? { thumbnail } : {}),
    };
    console.log("[save] meal saved, hasThumbnail:", !!meal.thumbnail, "protein:", meal.protein);

    // Optimistic UI update
    setDailyLog((prev) => ({ ...prev, meals: [...prev.meals, meal] }));
    setImageUrl(null);
    setMacros(null);
    setAdjusting(false);
    setScreen("dashboard");

    // Sync to Supabase in background
    if (user) {
      supabase.from("meal_logs").insert({
        id: meal.id,
        user_id: user.id,
        logged_date: todayISO(),
        items: meal.items,
        protein: meal.protein,
        calories: meal.calories,
        carbs: meal.carbs,
        fat: meal.fat,
        thumbnail: meal.thumbnail ?? null,
      }).then(({ error }) => {
        if (error) console.error("[save] Supabase insert failed:", error);
      });
    }
  }

  function deleteMeal(id: string) {
    setDailyLog((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));

    if (user) {
      supabase.from("meal_logs").delete()
        .eq("id", id).eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.error("[delete] Supabase delete failed:", error);
        });
    }
  }

  function resetDay() {
    const today = todayISO();
    setDailyLog({ date: today, meals: [] });
    setConfirmReset(false);

    if (user) {
      supabase.from("meal_logs").delete()
        .eq("user_id", user.id).eq("logged_date", today)
        .then(({ error }) => {
          if (error) console.error("[reset] Supabase delete failed:", error);
        });
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  if (screen === "init") {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────
  if (screen === "auth") {
    const canSubmit =
      authEmail.trim().length > 0 &&
      authPassword.length >= 6 &&
      (authMode === "login" || authName.trim().length > 0);

    return (
      <div className="flex flex-col min-h-screen px-6 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex justify-center pt-16 pb-10">
          <Image
            src="/vitano_logo_transparent_white.png"
            alt="Vitano"
            height={28}
            width={112}
            className="object-contain"
            priority
          />
        </div>

        {/* Mode toggle */}
        <div className="flex bg-neutral-900 rounded-xl p-1 mb-7 border border-neutral-800">
          <button
            onClick={() => { setAuthMode("login"); setAuthError(null); setAuthName(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              authMode === "login"
                ? "bg-[#6d3fd4] text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => { setAuthMode("signup"); setAuthError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              authMode === "signup"
                ? "bg-[#6d3fd4] text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3 mb-4">
          {authMode === "signup" && (
            <input
              type="text"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="What should we call you?"
              autoComplete="given-name"
              className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-[15px] focus:outline-none focus:border-[#9b6bff] transition-colors placeholder:text-neutral-700"
            />
          )}
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-[15px] focus:outline-none focus:border-[#9b6bff] transition-colors placeholder:text-neutral-700"
          />
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && handleAuth()}
            className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-[15px] focus:outline-none focus:border-[#9b6bff] transition-colors placeholder:text-neutral-700"
          />
        </div>

        {/* Error / info message */}
        {authError && (
          <p className="text-sm text-neutral-400 text-center mb-4 px-3 py-3 bg-neutral-900/70 rounded-xl border border-neutral-800 leading-relaxed">
            {authError}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleAuth}
          disabled={authLoading || !canSubmit}
          className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide disabled:opacity-40 disabled:cursor-not-allowed mb-5"
        >
          {authLoading ? "..." : authMode === "login" ? "Log in" : "Create account"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[11px] text-neutral-600 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        {/* Google — requires Google provider enabled in Supabase dashboard */}
        <button
          onClick={handleGoogleAuth}
          className="w-full py-3.5 rounded-xl border border-neutral-800 text-neutral-300 text-sm font-medium hover:border-neutral-700 hover:text-white transition-colors flex items-center justify-center gap-2.5"
        >
          <IconGoogle className="w-4 h-4" />
          Continue with Google
        </button>
      </div>
    );
  }

  // ── Settings ──────────────────────────────────────────────────────────────────
  if (screen === "settings") {
    const isReturning = proteinGoal > 0;

    return (
      <div className="flex flex-col min-h-screen px-6 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="pt-10 pb-6">
          {isReturning ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScreen("dashboard")}
                  className="text-neutral-500 hover:text-white transition-colors -ml-1"
                  aria-label="Back"
                >
                  <IconChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Goals</h1>
              </div>
              {user?.email && (
                <span className="text-[11px] text-neutral-700 truncate max-w-[160px]">
                  {user.email}
                </span>
              )}
            </div>
          ) : (
            <Image
              src="/vitano_logo_transparent_white.png"
              alt="Vitano"
              height={28}
              width={112}
              className="object-contain"
              priority
            />
          )}
        </div>

        {!isReturning && (
          <div className="mb-8">
            <h1 className="text-[1.75rem] font-black tracking-tight mb-2">Set your goals</h1>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Start with your protein target. Add calorie, carb, and fat goals if you want filling progress rings for those too.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6 flex-1 pb-8">
          {/* Protein — required */}
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Protein
              </label>
              <span className="text-[10px] font-semibold text-[#9b6bff] uppercase tracking-wide">required</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSettings()}
                className="w-full px-4 py-4 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-[#9b6bff] transition-colors tabular-nums placeholder:text-neutral-700"
                placeholder="160"
                min={1}
                max={500}
                autoFocus={!isReturning}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
                g / day
              </span>
            </div>
          </div>

          {/* Optional macros */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-700 mb-4">
              Optional — set a goal to track as a filling ring
            </p>
            <div className="flex flex-col gap-3">
              <GoalInput
                label="Calories"
                color="#f5a623"
                value={calDraft}
                onChange={setCalDraft}
                onClear={() => setCalDraft("")}
                placeholder="e.g. 2200"
                unit="kcal"
              />
              <GoalInput
                label="Carbs"
                color="#3ec9c0"
                value={carbsDraft}
                onChange={setCarbsDraft}
                onClear={() => setCarbsDraft("")}
                placeholder="e.g. 250"
                unit="g"
              />
              <GoalInput
                label="Fat"
                color="#f2779a"
                value={fatDraft}
                onChange={setFatDraft}
                onClear={() => setFatDraft("")}
                placeholder="e.g. 75"
                unit="g"
              />
            </div>
          </div>
        </div>

        <div className="pb-10 flex flex-col gap-2">
          <button
            onClick={saveSettings}
            disabled={!goalDraft || parseInt(goalDraft, 10) <= 0}
            className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isReturning ? "Save" : "Set goals"}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm text-neutral-700 hover:text-neutral-500 transition-colors"
          >
            Log out
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
            onClick={() => {
              setGoalDraft(String(proteinGoal));
              setCalDraft(caloriesGoal > 0 ? String(caloriesGoal) : "");
              setCarbsDraft(carbsGoal > 0 ? String(carbsGoal) : "");
              setFatDraft(fatGoal > 0 ? String(fatGoal) : "");
              setConfirmReset(false);
              setScreen("settings");
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-[#9b6bff]/30 text-[#9b6bff] hover:bg-[#9b6bff]/10 hover:border-[#9b6bff]/60 active:scale-95 transition-all"
            aria-label="Edit goals"
          >
            <IconPencil className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 mb-6">
          {displayName && (
            <p className="text-neutral-300 text-[15px] font-semibold tracking-tight mb-0.5">
              Hi, {displayName}
            </p>
          )}
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-700">
            {dateLabel}
          </p>
        </div>

        {/* Protein ring */}
        <div className="flex justify-center mb-6">
          <ProteinRing consumed={totals.protein} goal={proteinGoal} />
        </div>

        {/* Secondary macro rings */}
        <div className="mx-5 flex items-start justify-around mb-7">
          <MacroRing label="Calories" value={totals.calories} unit="kcal" color="#f5a623" goal={caloriesGoal} />
          <MacroRing label="Carbs"    value={totals.carbs}    unit="g"    color="#3ec9c0" goal={carbsGoal} />
          <MacroRing label="Fat"      value={totals.fat}      unit="g"    color="#f2779a" goal={fatGoal} />
        </div>

        {/* Meal list */}
        <div className="flex-1 px-5 pb-32">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Today&apos;s meals
            </h2>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">Reset today&apos;s progress?</span>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-sm text-neutral-500 hover:text-white transition-colors px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={resetDay}
                  className="text-sm font-semibold text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-lg px-3 py-1 transition-colors"
                >
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-neutral-700">
                  {dailyLog.meals.length} logged
                </span>
                {dailyLog.meals.length > 0 && (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="text-[13px] font-medium text-[#9b6bff] hover:text-[#b891ff] active:scale-95 transition-all px-2 py-1 -mr-2"
                  >
                    Reset today
                  </button>
                )}
              </div>
            )}
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
                  className="flex items-center gap-3 px-3 py-3 bg-neutral-950 border border-neutral-800/60 rounded-xl"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-neutral-800/40">
                    {meal.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meal.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        onLoad={() => console.log("[render] thumbnail ok:", meal.id)}
                        onError={() => console.warn("[render] thumbnail error:", meal.id)}
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-900" />
                    )}
                  </div>

                  {/* Meal info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate leading-snug">
                      {meal.items.join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0 mt-0.5">
                      <span className="text-xs text-[#9b6bff] font-semibold">{meal.protein}g protein</span>
                      {caloriesGoal > 0 && (
                        <span className="text-xs text-[#f5a623]">{meal.calories} kcal</span>
                      )}
                      {carbsGoal > 0 && (
                        <span className="text-xs text-[#3ec9c0]">{meal.carbs}g carbs</span>
                      )}
                      {fatGoal > 0 && (
                        <span className="text-xs text-[#f2779a]">{meal.fat}g fat</span>
                      )}
                    </div>
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
              setConfirmReset(false);
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
