import { NextRequest, NextResponse } from "next/server";

interface AnalysisResult {
  items: string[];
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

const SYSTEM_PROMPT = `You are a nutrition estimator. The user will send you a photo of a meal.
Identify the food items you can see, then estimate the full meal's macros.
Return ONLY a JSON object — no explanation, no markdown, no extra text.
Format exactly: {"items": ["food 1", "food 2"], "protein": <grams>, "calories": <kcal>, "carbs": <grams>, "fat": <grams>}
Rules:
- "items" must be a non-empty array of short, plain food names (e.g. "chicken breast", "white rice", "olive oil")
- All macro values must be non-negative integers
- Estimate for the full visible portion`;

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

  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
  }
  const mimeType = match[1];
  const base64Data = match[2];

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
        max_tokens: 200,
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
              { type: "text", text: "Identify the foods and estimate the macros for this meal." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      return NextResponse.json(
        { error: err?.error?.message ?? "OpenAI request failed" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    rawContent = data.choices[0]?.message?.content ?? "";
  } catch {
    return NextResponse.json({ error: "Failed to reach OpenAI" }, { status: 502 });
  }

  const cleaned = rawContent.replace(/```json|```/g, "").trim();
  let result: AnalysisResult;
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const items = Array.isArray(parsed.items)
      ? (parsed.items as unknown[])
          .filter((i) => typeof i === "string" && i.trim().length > 0)
          .map((i) => (i as string).trim())
      : [];

    result = {
      items: items.length > 0 ? items : ["Unknown meal"],
      protein: Math.round(Math.max(0, Number(parsed.protein))),
      calories: Math.round(Math.max(0, Number(parsed.calories))),
      carbs: Math.round(Math.max(0, Number(parsed.carbs))),
      fat: Math.round(Math.max(0, Number(parsed.fat))),
    };

    if ([result.protein, result.calories, result.carbs, result.fat].some(isNaN)) {
      throw new Error("Non-numeric macro values");
    }
  } catch {
    return NextResponse.json({ error: "Couldn't parse nutrition response" }, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
