import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "private_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const { password, redirect } = await request.json();

  const expectedPassword = process.env.PRIVATE_ROUTE_PASSWORD;
  const secret = process.env.PRIVATE_ROUTE_SECRET;

  if (!expectedPassword || !secret) {
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 }
    );
  }

  if (password !== expectedPassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const redirectTo =
    typeof redirect === "string" && redirect.startsWith("/")
      ? redirect
      : "/private/t3ridox-productions";

  const response = NextResponse.json({ ok: true, redirect: redirectTo });

  response.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
