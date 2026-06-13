"use client";

import Image from "next/image";
import { useRef, useState, ChangeEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Macros {
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

type Screen = "scan" | "analyzing" | "results" | "saved";

// ── Real AI analysis ──────────────────────────────────────────────────────────

async function analyzeMeal(imageDataUrl: string): Promise<Macros> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Analysis failed");
  }
  return res.json() as Promise<Macros>;
}

// ── Icons (inline SVG — no emojis) ───────────────────────────────────────────

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
  const [screen, setScreen] = useState<Screen>("scan");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [macros, setMacros] = useState<Macros | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

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
      setAnalyzeError(err instanceof Error ? err.message : "Couldn't analyse, try again");
      setScreen("scan");
    }
  }

  function handleReset() {
    setScreen("scan");
    setImageUrl(null);
    setMacros(null);
    setAdjusting(false);
    setAnalyzeError(null);
  }

  // ── Scan screen ───────────────────────────────────────────────────────────────
  if (screen === "scan") {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <Image
            src="/vitano_logo_transparent_white.png"
            alt="Vitano"
            height={32}
            width={128}
            className="object-contain"
            priority
          />
          <span className="text-[11px] text-neutral-600 font-medium tracking-wide uppercase">beta</span>
        </div>

        <h1 className="text-[1.6rem] font-black mb-1.5 tracking-tight">Scan your meal</h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
          Take a photo or choose from your library — we&apos;ll estimate your macros in seconds.
        </p>

        {/* Preview area */}
        <div
          onClick={() => libraryInputRef.current?.click()}
          className={`
            relative flex-1 min-h-[300px] rounded-2xl border border-dashed
            flex flex-col items-center justify-center gap-4 cursor-pointer
            transition-colors overflow-hidden
            ${imageUrl
              ? "border-[#9b6bff]/50 bg-neutral-950"
              : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
            }
          `}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Meal preview"
              className="w-full h-full object-cover absolute inset-0 rounded-2xl"
            />
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
            <p className="text-red-400 text-sm text-center py-2 px-4 bg-red-400/10 rounded-xl border border-red-400/20">
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

  // ── Analyzing screen ──────────────────────────────────────────────────────────
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

  // ── Results screen ────────────────────────────────────────────────────────────
  if (screen === "results" && macros) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={handleReset}
            className="text-neutral-500 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Scan again
          </button>
          <span className="text-[11px] text-neutral-600 font-medium tracking-wide uppercase">beta</span>
        </div>

        {/* Meal thumbnail */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Meal" className="w-full h-44 object-cover rounded-2xl mb-6" />
        )}

        {/* Detected items */}
        {macros.items.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-2.5">
              Detected
            </p>
            <div className="flex flex-wrap gap-2">
              {macros.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-300 text-[13px] leading-relaxed"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Macros card */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden mb-3">
          <MacroField
            label="Protein"
            value={macros.protein}
            unit="grams"
            primary
            adjusting={adjusting}
            onActivateAdjust={() => setAdjusting(true)}
            onChange={(v) => setMacros({ ...macros, protein: v })}
          />
          <div className="grid grid-cols-3 divide-x divide-neutral-800/60 border-t border-neutral-800/60">
            <MacroField
              label="Calories"
              value={macros.calories}
              unit="kcal"
              adjusting={adjusting}
              onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, calories: v })}
            />
            <MacroField
              label="Carbs"
              value={macros.carbs}
              unit="g"
              adjusting={adjusting}
              onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, carbs: v })}
            />
            <MacroField
              label="Fat"
              value={macros.fat}
              unit="g"
              adjusting={adjusting}
              onActivateAdjust={() => setAdjusting(true)}
              onChange={(v) => setMacros({ ...macros, fat: v })}
            />
          </div>
        </div>

        {/* AI note + Adjust / Done toggle */}
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

        {/* Save */}
        <button
          onClick={() => setScreen("saved")}
          disabled={adjusting}
          className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-semibold text-[15px] hover:bg-[#9b6bff] active:scale-[0.98] transition-all tracking-wide mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save to today
        </button>
      </div>
    );
  }

  // ── Saved screen ──────────────────────────────────────────────────────────────
  if (screen === "saved") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-[#9b6bff] flex items-center justify-center">
          <IconCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-white font-bold text-xl tracking-tight">Saved to today</p>
          <p className="text-neutral-500 text-sm mt-1.5">
            {macros?.protein}g protein logged.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="mt-3 px-6 py-3 rounded-xl border border-neutral-800 text-neutral-400 font-medium text-sm hover:border-neutral-700 hover:text-white transition-colors"
        >
          Scan another meal
        </button>
      </div>
    );
  }

  return null;
}
