import { createClient } from "@supabase/supabase-js";

// Fallback strings prevent a throw during Next.js static analysis when env vars
// aren't set locally. Real values are required at runtime (set in Vercel env).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
);
