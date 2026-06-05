import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "session_token";
const SESSION_IDLE_TIMEOUT = 15 * 60; // 15 minutes — DB session TTL, extended by heartbeat
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours — keep cookie alive across heartbeats

export async function signToken(payload: { userId: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as { userId: string; role: string };
}

export async function createSession(userId: string, role: string) {
  const token = await signToken({ userId, role });
  const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT * 1000);

  // Single concurrent login: upsert replaces any existing session for this user
  await db.session.upsert({
    where: { userId },
    create: { userId, token, expiresAt },
    update: { token, expiresAt },
  });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { username: true, displayName: true } } },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return { userId: payload.userId, role: payload.role, username: session.user.username, displayName: session.user.displayName };
  } catch {
    return null;
  }
}

export async function extendSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await verifyToken(token);
  } catch {
    return false;
  }

  const session = await db.session.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) return false;

  await db.session.update({
    where: { token },
    data: { expiresAt: new Date(Date.now() + SESSION_IDLE_TIMEOUT * 1000) },
  });
  return true;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
    cookieStore.delete(COOKIE_NAME);
  }
}
