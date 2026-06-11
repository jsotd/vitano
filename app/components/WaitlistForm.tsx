"use client";

import { useState, FormEvent } from "react";

type State = "idle" | "loading" | "success" | "error" | "duplicate";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErr, setValidationErr] = useState("");

  const validate = (value: string) => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    setValidationErr(ok ? "" : "Enter a valid email address");
    return ok;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate(email)) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("https://formspree.io/f/xnjygqwy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        setState("success");
        return;
      }

      const data = (await res.json()) as { errors?: { message: string }[] };
      setErrorMsg(data.errors?.[0]?.message ?? "Something went wrong. Try again.");
      setState("error");
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-12 h-12 rounded-full bg-lime-400 flex items-center justify-center text-black text-2xl font-bold">
          ✓
        </div>
        <p className="text-xl font-bold text-white">You&apos;re in.</p>
        <p className="text-neutral-400 text-sm text-center max-w-xs">
          We&apos;ll hit you up when Vitano is ready. Tell a gym buddy — the more
          the merrier.
        </p>
      </div>
    );
  }

  if (state === "duplicate") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-lime-400 text-2xl">
          👌
        </div>
        <p className="text-xl font-bold text-white">Already on the list.</p>
        <p className="text-neutral-400 text-sm text-center max-w-xs">
          We&apos;ve got your email. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErr) validate(e.target.value);
            }}
            onBlur={() => email && validate(email)}
            placeholder="your@email.com"
            className="w-full px-4 py-3.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-colors text-base"
            disabled={state === "loading"}
            aria-label="Email address"
          />
          {validationErr && (
            <p className="text-red-400 text-xs pl-1">{validationErr}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="px-6 py-3.5 rounded-xl bg-lime-400 text-black font-bold text-base hover:bg-lime-300 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {state === "loading" ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-red-400 text-sm">{errorMsg}</p>
      )}
    </form>
  );
}
