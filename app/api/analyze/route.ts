import { NextRequest, NextResponse } from "next/server";

interface Macros {
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

const SYSTEM_PROMPT = `You are a nutrition estimator. The user will send you a photo of a meal.
Return ONLY a JSON object with your best estimate of the meal's nutrition. No explanation, no text, just JSON.
Format: {"protein": <grams>, "calories": <kcal>, "carbs": <grams>, "fat": <grams>}
All values must be non-negative integers. Estimate for the full visible portion.`;

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

  // Strip the data URL prefix to get a clean base64 string + mime type
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
        max_tokens: 100,
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
              { type: "text", text: "Estimate the macros for this meal." },
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

  // Parse the JSON the model returns — strip any accidental markdown fences
  const cleaned = rawContent.replace(/```json|```/g, "").trim();
  let macros: Macros;
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    macros = {
      protein: Math.round(Math.max(0, Number(parsed.protein))),
      calories: Math.round(Math.max(0, Number(parsed.calories))),
      carbs: Math.round(Math.max(0, Number(parsed.carbs))),
      fat: Math.round(Math.max(0, Number(parsed.fat))),
    };
    if ([macros.protein, macros.calories, macros.carbs, macros.fat].some(isNaN)) {
      throw new Error("Non-numeric values");
    }
  } catch {
    return NextResponse.json({ error: "Couldn't parse nutrition response" }, { status: 502 });
  }

  return NextResponse.json(macros, { status: 200 });
}
