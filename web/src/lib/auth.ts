import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "session_token";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function signToken(payload: { userId: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as { userId: string; role: string };
}

export async function createSession(userId: string, role: string) {
  const token = await signToken({ userId, role });
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

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
    expires: expiresAt,
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
    const session = await db.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
    cookieStore.delete(COOKIE_NAME);
  }
}
