import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/services/waitlist";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof (body as Record<string, unknown>).email !== "string"
  ) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const email = ((body as Record<string, unknown>).email as string).trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const result = await addToWaitlist(email, "landing");

  if (result.duplicate) {
    return NextResponse.json(
      { error: "You're already on the list!" },
      { status: 409 }
    );
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Something went wrong" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
