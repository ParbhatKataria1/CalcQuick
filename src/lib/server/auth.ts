import 'server-only';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { cookies } from 'next/headers';
import { HttpError } from '@/lib/server/http';
import { kv } from '@/lib/server/kv';
import { SESSION_COOKIE } from '@/lib/session-cookie';

export type User = { id: string; email: string; name: string; passwordHash: string; createdAt: number };
export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'createdAt'>;

const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
const LOGIN_LIMIT = { attempts: 10, windowSeconds: 15 * 60 };
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };

const keys = {
  user: (id: string) => `user:${id}`,
  email: (email: string) => `user-email:${email}`,
  // Only a hash of the token is stored, so a leaked database can't be used to sign in.
  session: (token: string) => `session:${createHash('sha256').update(token).digest('hex')}`,
  loginAttempts: (email: string) => `login-attempts:${email}`,
};

const scrypt = (password: string, salt: Buffer, keyLength: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key))));

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(actual, expected);
}

export const toPublicUser = ({ id, email, name, createdAt }: User): PublicUser => ({ id, email, name, createdAt });

const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

function validate(input: { name?: unknown; email?: unknown; password?: unknown }, requireName: boolean) {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new HttpError('Enter a valid email address.');
  if (requireName && (!name || name.length > 60)) throw new HttpError('Enter your name (up to 60 characters).');
  if (password.length < 8 || password.length > 200) throw new HttpError('Use a password of at least 8 characters.');
  return { email, password, name };
}

async function startSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await kv.set(keys.session(token), userId, { ttlSeconds: SESSION_SECONDS });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function signUp(input: { name?: unknown; email?: unknown; password?: unknown }) {
  const { email, password, name } = validate(input, true);
  if (await kv.get(keys.email(email))) throw new HttpError('An account with this email already exists. Log in instead.', 409);
  const user: User = { id: randomUUID(), email, name, passwordHash: await hashPassword(password), createdAt: Date.now() };
  await kv.set(keys.user(user.id), user);
  await kv.set(keys.email(email), user.id);
  await startSession(user.id);
  return toPublicUser(user);
}

export async function logIn(input: { email?: unknown; password?: unknown }) {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  // Slow down password guessing for an account.
  const attempts = (await kv.get<{ count: number; resetAt: number }>(keys.loginAttempts(email))) ?? { count: 0, resetAt: Date.now() + LOGIN_LIMIT.windowSeconds * 1000 };
  if (attempts.count >= LOGIN_LIMIT.attempts && attempts.resetAt > Date.now()) {
    throw new HttpError(`Too many attempts. Try again in ${Math.ceil((attempts.resetAt - Date.now()) / 60000)} minutes.`, 429);
  }
  const userId = email ? await kv.get<string>(keys.email(email)) : null;
  const user = userId ? await kv.get<User>(keys.user(userId)) : null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const windowOpen = attempts.resetAt > Date.now();
    await kv.set(keys.loginAttempts(email), { count: windowOpen ? attempts.count + 1 : 1, resetAt: windowOpen ? attempts.resetAt : Date.now() + LOGIN_LIMIT.windowSeconds * 1000 }, { ttlSeconds: LOGIN_LIMIT.windowSeconds });
    throw new HttpError('Wrong email or password.', 401);
  }
  await kv.del(keys.loginAttempts(email));
  await startSession(user.id);
  return toPublicUser(user);
}

export async function logOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await kv.del(keys.session(token));
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await kv.get<string>(keys.session(token));
  return userId ? kv.get<User>(keys.user(userId)) : null;
}

/** The signed-in user, or a 401 for API routes. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError('Please log in again.', 401);
  return user;
}
