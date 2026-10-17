import { NextResponse } from "next/server";

import { AUTH_COOKIE } from "@/src/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(0),
  });

  return response;
}
