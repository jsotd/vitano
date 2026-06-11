import fs from "fs/promises";
import path from "path";

export interface WaitlistEntry {
  email: string;
  created_at: string;
  source: string;
}

export interface WaitlistResult {
  success: boolean;
  error?: string;
  duplicate?: boolean;
}

// ── Supabase backend ──────────────────────────────────────────────────────────

async function addViaSupabase(entry: WaitlistEntry): Promise<WaitlistResult> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("waitlist").insert([entry]);

  if (error) {
    if (error.code === "23505") return { success: false, duplicate: true };
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ── Local JSON fallback ───────────────────────────────────────────────────────

const LOCAL_FILE = path.join(process.cwd(), "waitlist.json");

async function addViaLocal(entry: WaitlistEntry): Promise<WaitlistResult> {
  let entries: WaitlistEntry[] = [];
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    entries = JSON.parse(raw) as WaitlistEntry[];
  } catch {
    // file doesn't exist yet — start fresh
  }

  if (entries.some((e) => e.email === entry.email)) {
    return { success: false, duplicate: true };
  }

  entries.push(entry);
  await fs.writeFile(LOCAL_FILE, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`[waitlist] saved locally: ${entry.email}`);
  return { success: true };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function addToWaitlist(
  email: string,
  source = "landing"
): Promise<WaitlistResult> {
  const entry: WaitlistEntry = {
    email,
    created_at: new Date().toISOString(),
    source,
  };

  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasSupabase) {
    return addViaSupabase(entry);
  }
  return addViaLocal(entry);
}
