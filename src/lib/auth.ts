import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type StaffRole = "OWNER" | "STAFF";

export interface AdminSession {
  staffId: string;
  username: string;
  name: string;
  role: StaffRole;
  exp: number;
}

export const ADMIN_SESSION_COOKIE = "mirch_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
  }
  return "development-session-secret-change-before-production";
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function parseCookieHeader(header: string | null) {
  const result = new Map<string, string>();
  if (!header) return result;

  header.split(";").forEach((part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (key) result.set(key, valueParts.join("="));
  });
  return result;
}

export function createAdminSessionToken(staff: {
  id: string;
  username: string;
  name: string;
  role: string;
}) {
  const payload: AdminSession = {
    staffId: staff.id,
    username: staff.username,
    name: staff.name,
    role: staff.role === "OWNER" ? "OWNER" : "STAFF",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSession;
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    if (session.role !== "OWNER" && session.role !== "STAFF") return null;
    return session;
  } catch {
    return null;
  }
}

export function getAdminSessionFromRequest(req: Request) {
  const token = parseCookieHeader(req.headers.get("cookie")).get(ADMIN_SESSION_COOKIE);
  return verifyAdminSessionToken(token);
}

export function getAdminSessionFromCookies() {
  return verifyAdminSessionToken(cookies().get(ADMIN_SESSION_COOKIE)?.value);
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

type RequireAdminResult =
  | { response: NextResponse; session: null }
  | { response: null; session: AdminSession };

export function requireAdmin(req: Request, allowedRoles: StaffRole[] = ["OWNER", "STAFF"]): RequireAdminResult {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }),
      session: null,
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      response: NextResponse.json({ error: "Forbidden. Your staff role cannot perform this action." }, { status: 403 }),
      session: null,
    };
  }

  return { response: null, session };
}
