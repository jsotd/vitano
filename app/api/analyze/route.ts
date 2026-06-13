import { NextRequest, NextResponse } from "next/server";

interface AnalysisResult {
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

// OpenAI vision supports these formats only
const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const SYSTEM_PROMPT = `You are a nutrition estimator. The user will send you a photo of a meal.
Identify the food items you can see, then estimate the full meal's macros.
Return ONLY a JSON object — no explanation, no markdown, no extra text, no code fences.
Format exactly: {"items": ["food 1", "food 2"], "protein": <grams>, "calories": <kcal>, "carbs": <grams>, "fat": <grams>}
Rules:
- "items" must be a non-empty array of short, plain food names (e.g. "chicken breast", "white rice", "olive oil")
- All macro values must be non-negative integers
- Estimate for the full visible portion`;

// Extract the first complete JSON object from a string, ignoring surrounding text
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 200)}`);
  }
  return text.slice(start, end + 1);
}

function parseResult(rawContent: string): AnalysisResult {
  // Strip markdown fences, then extract the JSON object
  const stripped = rawContent.replace(/```[a-z]*\n?/gi, "").trim();
  const jsonStr = extractJsonObject(stripped);
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  const items = Array.isArray(parsed.items)
    ? (parsed.items as unknown[])
        .filter((i) => typeof i === "string" && (i as string).trim().length > 0)
        .map((i) => (i as string).trim())
    : [];

  const result: AnalysisResult = {
    items: items.length > 0 ? items : ["Unknown meal"],
    protein: Math.round(Math.max(0, Number(parsed.protein))),
    calories: Math.round(Math.max(0, Number(parsed.calories))),
    carbs: Math.round(Math.max(0, Number(parsed.carbs))),
    fat: Math.round(Math.max(0, Number(parsed.fat))),
  };

  if ([result.protein, result.calories, result.carbs, result.fat].some(isNaN)) {
    throw new Error(`Non-numeric macro values in: ${jsonStr}`);
  }

  return result;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("image" in body) ||
    typeof (body as Record<string, unknown>).image !== "string"
  ) {
    return NextResponse.json({ error: "image field required (base64 data URL)" }, { status: 400 });
  }

  const imageDataUrl = (body as Record<string, string>).image;

  // Parse data URL — be lenient with the subtype to handle heic/heif variants
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,([\s\S]+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid image data URL format" }, { status: 400 });
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s/g, ""); // strip any whitespace that can sneak in

  // Reject formats OpenAI cannot process (e.g. HEIC not compressed on client)
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported image format (${mimeType}). Please use a JPEG or PNG photo.` },
      { status: 400 }
    );
  }

  let rawContent: string;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                  detail: "low",
                },
              },
              {
                type: "text",
                text: "Identify the foods and estimate the macros for this meal. Reply with only the JSON object.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      console.error("[analyze] OpenAI error:", err);
      return NextResponse.json(
        { error: err?.error?.message ?? "OpenAI request failed" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    rawContent = data.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[analyze] fetch error:", err);
    return NextResponse.json({ error: "Failed to reach OpenAI" }, { status: 502 });
  }

  try {
    const result = parseResult(rawContent);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[analyze] parse failure. Raw model output:", rawContent);
    console.error("[analyze] parse error:", err);
    return NextResponse.json(
      { error: "Couldn't read the nutrition estimate — please try again" },
      { status: 502 }
    );
  }
}
