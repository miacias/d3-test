import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const COOKIE_NAME = "private_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const attemptsByIp = new Map<string, number[]>();

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return (request as NextRequest & { ip?: string }).ip ?? "unknown";
};

const getRetryAfterSeconds = (attempts: number[]) => {
  const oldestAttempt = attempts[0];
  if (!oldestAttempt) {
    return 0;
  }

  const remainingMs = ATTEMPT_WINDOW_MS - (Date.now() - oldestAttempt);
  return Math.max(1, Math.ceil(remainingMs / 1000));
};

const buildSigningKey = (secret: string) => new TextEncoder().encode(secret);

const pruneAttempts = (ip: string) => {
  const now = Date.now();
  const recentAttempts = (attemptsByIp.get(ip) ?? []).filter((timestamp) => now - timestamp < ATTEMPT_WINDOW_MS);

  if (recentAttempts.length === 0) {
    attemptsByIp.delete(ip);
    return recentAttempts;
  }

  attemptsByIp.set(ip, recentAttempts);
  return recentAttempts;
};

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

  const clientIp = getClientIp(request);
  const attempts = pruneAttempts(clientIp);

  if (attempts.length >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(getRetryAfterSeconds(attempts)),
        },
      }
    );
  }

  if (password !== expectedPassword) {
    attempts.push(Date.now());
    attemptsByIp.set(clientIp, attempts);

    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  attemptsByIp.delete(clientIp);

  const redirectTo =
    typeof redirect === "string" && redirect.startsWith("/")
      ? redirect
      : "/private/t3ridox-productions";

  const token = await new SignJWT({ scope: "private-route" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("private-auth")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(buildSigningKey(secret));

  const response = NextResponse.json({ ok: true, redirect: redirectTo });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
