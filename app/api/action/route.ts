import { NextResponse } from "next/server";
import { applyAction, getUser, HttpError, type Action } from "@/lib/logic";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const me = getUser(req.headers.get("x-relay-user"));
    const body = (await req.json()) as Action;
    if (!body || typeof body.type !== "string") throw new HttpError(400, "Bad request");
    return NextResponse.json(applyAction(me, body));
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
