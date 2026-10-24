import { NextResponse } from "next/server";
import { buildState, getUser, HttpError } from "@/lib/logic";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const me = getUser(req.headers.get("x-relay-user"));
    return NextResponse.json(buildState(me), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
