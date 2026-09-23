import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { DEFAULT_ACCOUNT_NAME, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, getDb } from "./db";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PASSWORD_SALT_ROUNDS = 10;

export interface SessionUser {
  id: number;
  email: string;
}

export class AuthError extends Error {}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signUp(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail.includes("@")) {
    throw new AuthError("Informe um e-mail válido.");
  }
  if (password.length < 8) {
    throw new AuthError("A senha deve ter pelo menos 8 caracteres.");
  }

  const db = await getDb();

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rows.length > 0) {
    throw new AuthError("Já existe uma conta com esse e-mail.");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  const userResult = await db.query<{ id: number; email: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [normalizedEmail, passwordHash]
  );
  const user = userResult.rows[0];

  await db.query("INSERT INTO accounts (user_id, name, kind) VALUES ($1, $2, 'checking')", [
    user.id,
    DEFAULT_ACCOUNT_NAME,
  ]);

  for (const category of DEFAULT_CATEGORIES) {
    await db.query("INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3)", [
      user.id,
      category.name,
      category.kind,
    ]);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query("INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)", [
      user.id,
      key,
      value,
    ]);
  }

  return user;
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const db = await getDb();
  const result = await db.query<{ id: number; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [normalizeEmail(email)]
  );

  const user = result.rows[0];
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) return null;

  return { id: user.id, email: user.email };
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const db = await getDb();
  await db.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    expiresAt,
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const result = await db.query<{ id: number; email: string; expires_at: string }>(
    `SELECT users.id, users.email, sessions.expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.query("DELETE FROM sessions WHERE token = $1", [token]);
    return null;
  }

  return { id: row.id, email: row.email };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = await getDb();
    await db.query("DELETE FROM sessions WHERE token = $1", [token]);
  }

  cookieStore.delete(SESSION_COOKIE);
}
