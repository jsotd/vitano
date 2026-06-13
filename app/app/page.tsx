"use client";

import Image from "next/image";
import { useRef, useState, ChangeEvent } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Macros {
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

type Screen = "scan" | "analyzing" | "results" | "saved";

// ── Mock analysis (replace with real AI call later) ───────────────────────────

async function analyzeMeal(_imageDataUrl: string): Promise<Macros> {
  await new Promise((r) => setTimeout(r, 1800)); // simulate network delay
  return { protein: 32, calories: 450, carbs: 40, fat: 18 };
}

// ── Editable macro field ──────────────────────────────────────────────────────

function MacroField({
  label,
  value,
  unit,
  primary,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  primary?: boolean;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onChange(Math.round(n));
    else setDraft(String(value));
    setEditing(false);
  }

  if (primary) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 border-b border-neutral-800">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#9b6bff]">
          {label}
        </span>
        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="text-6xl font-black bg-transparent text-center text-white w-40 outline-none border-b-2 border-[#9b6bff]"
          />
        ) : (
          <button
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-6xl font-black text-white tabular-nums active:opacity-70 transition-opacity"
          >
            {value}
          </button>
        )}
        <span className="text-neutral-500 text-sm font-medium">{unit}</span>
        <span className="text-neutral-700 text-xs mt-1">tap to adjust</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {editing ? (
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="text-3xl font-bold bg-transparent text-center text-white w-28 outline-none border-b-2 border-[#9b6bff]"
        />
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="text-3xl font-bold text-white tabular-nums active:opacity-70 transition-opacity"
        >
          {value}
        </button>
      )}
      <span className="text-neutral-600 text-xs">{unit}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppPage() {
  const [screen, setScreen] = useState<Screen>("scan");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [macros, setMacros] = useState<Macros | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageUrl) return;
    setScreen("analyzing");
    const result = await analyzeMeal(imageUrl);
    setMacros(result);
    setScreen("results");
  }

  function handleSave() {
    setScreen("saved");
  }

  function handleReset() {
    setScreen("scan");
    setImageUrl(null);
    setMacros(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Scan screen ─────────────────────────────────────────────────────────────
  if (screen === "scan") {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Image
            src="/vitano_logo_transparent_white.png"
            alt="Vitano"
            height={32}
            width={128}
            className="object-contain"
            priority
          />
          <span className="text-xs text-neutral-600 font-medium">beta</span>
        </div>

        <h1 className="text-2xl font-black mb-1">Scan your meal</h1>
        <p className="text-neutral-500 text-sm mb-8">
          Take a photo or upload an image — we&apos;ll estimate your macros instantly.
        </p>

        {/* Image picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex-1 min-h-[280px] rounded-2xl border-2 border-dashed
            flex flex-col items-center justify-center gap-4 cursor-pointer
            transition-colors overflow-hidden
            ${imageUrl
              ? "border-[#9b6bff] bg-neutral-950"
              : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 active:border-[#9b6bff]"
            }
          `}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Meal preview"
              className="w-full h-full object-cover absolute inset-0 rounded-2xl opacity-80"
            />
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-3xl">
                📷
              </div>
              <p className="text-neutral-500 text-sm text-center px-6">
                Tap to take a photo or choose from your library
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          {imageUrl && (
            <button
              onClick={handleAnalyze}
              className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-bold text-base hover:bg-[#9b6bff] active:scale-95 transition-all"
            >
              Analyze meal →
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 rounded-xl border border-neutral-800 text-neutral-400 font-medium text-sm hover:border-neutral-700 hover:text-white transition-colors"
          >
            {imageUrl ? "Choose a different photo" : "Choose from library"}
          </button>
        </div>
      </div>
    );
  }

  // ── Analyzing screen ────────────────────────────────────────────────────────
  if (screen === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-5">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#9b6bff] animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">Analysing your meal…</p>
          <p className="text-neutral-500 text-sm mt-1">Estimating protein and macros</p>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Meal"
            className="w-32 h-32 object-cover rounded-2xl opacity-40 mt-2"
          />
        )}
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (screen === "results" && macros) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleReset}
            className="text-neutral-500 hover:text-white transition-colors text-sm"
          >
            ← Scan again
          </button>
          <span className="text-xs text-neutral-600 font-medium">beta</span>
        </div>

        {/* Meal thumbnail */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Meal"
            className="w-full h-44 object-cover rounded-2xl mb-6 opacity-90"
          />
        )}

        {/* Macros card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden mb-4">
          <MacroField
            label="Protein"
            value={macros.protein}
            unit="grams"
            primary
            onChange={(v) => setMacros({ ...macros, protein: v })}
          />
          <div className="grid grid-cols-3 divide-x divide-neutral-800 border-t border-neutral-800">
            <MacroField
              label="Calories"
              value={macros.calories}
              unit="kcal"
              onChange={(v) => setMacros({ ...macros, calories: v })}
            />
            <MacroField
              label="Carbs"
              value={macros.carbs}
              unit="g"
              onChange={(v) => setMacros({ ...macros, carbs: v })}
            />
            <MacroField
              label="Fat"
              value={macros.fat}
              unit="g"
              onChange={(v) => setMacros({ ...macros, fat: v })}
            />
          </div>
        </div>

        {/* Confidence note */}
        <p className="text-center text-neutral-600 text-xs mb-6">
          AI estimate — tap any value to adjust
        </p>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-xl bg-[#6d3fd4] text-white font-bold text-base hover:bg-[#9b6bff] active:scale-95 transition-all mt-auto"
        >
          Save to today
        </button>
      </div>
    );
  }

  // ── Saved screen ─────────────────────────────────────────────────────────────
  if (screen === "saved") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[#9b6bff] flex items-center justify-center text-white text-3xl font-bold">
          ✓
        </div>
        <div>
          <p className="text-white font-bold text-xl">Saved to today</p>
          <p className="text-neutral-500 text-sm mt-1">
            {macros?.protein}g protein logged.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="mt-4 px-6 py-3 rounded-xl border border-neutral-800 text-neutral-400 font-medium text-sm hover:border-neutral-700 hover:text-white transition-colors"
        >
          Scan another meal
        </button>
      </div>
    );
  }

  return null;
}
