import type { AuthUser } from '../../slices/authSlice';
import type { Plan } from '../../../../shared/types';
import { getOfflineDb } from '../core/offlineDb';
import { localAuthStore } from './localAuthStore';

const AUTH_SESSION_KEY = 'auth_session';
const CRYPTO_KEY_ID = 'master';
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'auth_user';

export interface StoredAuthSession {
  token: string;
  user: AuthUser;
  plans?: Plan[];
  isLocalSession: boolean;
  pendingAuthSync: boolean;
}

export function isLocalSessionToken(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.startsWith('local_');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  const db = await getOfflineDb();
  const existing = await db.get('secureKeys', CRYPTO_KEY_ID) as { id: string; key: CryptoKey } | undefined;
  if (existing?.key) return existing.key;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await db.put('secureKeys', { id: CRYPTO_KEY_ID, key });
  return key;
}

export async function saveSecureSecret(key: string, plaintext: string): Promise<void> {
  const encrypted = await encryptString(plaintext);
  const db = await getOfflineDb();
  await db.put('secureSecrets', { key, value: encrypted, updatedAt: new Date().toISOString() });
  await writeElectronSecure(key, encrypted);
}

export async function loadSecureSecret(key: string): Promise<string | null> {
  const db = await getOfflineDb();
  const fromElectron = await readElectronSecure(key);
  const stored = fromElectron
    ? { value: fromElectron }
    : (await db.get('secureSecrets', key) as { value?: string } | undefined);

  if (!stored?.value) return null;
  return decryptString(stored.value);
}

export async function deleteSecureSecret(key: string): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.delete('secureSecrets', key);
  } catch {
    /* ignore */
  }
  await deleteElectronSecure(key);
}

async function encryptString(plaintext: string): Promise<string> {
  const key = await getOrCreateMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

async function decryptString(ciphertext: string): Promise<string | null> {
  try {
    const [ivPart, dataPart] = ciphertext.split('.');
    if (!ivPart || !dataPart) return null;
    const key = await getOrCreateMasterKey();
    const iv = fromBase64(ivPart);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      fromBase64(dataPart) as BufferSource,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function readElectronSecure(key: string): Promise<string | null> {
  const bridge = (window as Window & { secureStore?: { get: (k: string) => Promise<string | null> } }).secureStore;
  if (!bridge?.get) return null;
  try {
    return await bridge.get(key);
  } catch {
    return null;
  }
}

async function writeElectronSecure(key: string, value: string): Promise<boolean> {
  const bridge = (window as Window & { secureStore?: { set: (k: string, v: string) => Promise<void> } }).secureStore;
  if (!bridge?.set) return false;
  try {
    await bridge.set(key, value);
    return true;
  } catch {
    return false;
  }
}

async function deleteElectronSecure(key: string): Promise<void> {
  const bridge = (window as Window & { secureStore?: { delete: (k: string) => Promise<void> } }).secureStore;
  if (!bridge?.delete) return;
  try {
    await Promise.race([
      bridge.delete(key),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      }),
    ]);
  } catch {
    /* ignore */
  }
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  const payload = JSON.stringify(session);
  const encrypted = await encryptString(payload);
  const db = await getOfflineDb();
  await db.put('secureSecrets', { key: AUTH_SESSION_KEY, value: encrypted, updatedAt: new Date().toISOString() });
  await writeElectronSecure(AUTH_SESSION_KEY, encrypted);

  // Plaintext mirror — fallback when encrypted IndexedDB read fails on refresh.
  try {
    localStorage.setItem(LEGACY_TOKEN_KEY, session.token);
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(session.user));
  } catch {
    /* ignore */
  }
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const db = await getOfflineDb();
  const fromElectron = await readElectronSecure(AUTH_SESSION_KEY);
  const stored = fromElectron
    ? { value: fromElectron }
    : await db.get('secureSecrets', AUTH_SESSION_KEY) as { value?: string } | undefined;

  if (stored?.value) {
    const decrypted = await decryptString(stored.value);
    if (decrypted) {
      try {
        return JSON.parse(decrypted) as StoredAuthSession;
      } catch {
        /* fall through */
      }
    }
  }

  return loadLegacyAuthSession();
}

function loadLegacyAuthSession(): StoredAuthSession | null {
  try {
    const token = localStorage.getItem(LEGACY_TOKEN_KEY);
    const raw = localStorage.getItem(LEGACY_USER_KEY);
    if (!token || !raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    return {
      token,
      user,
      isLocalSession: isLocalSessionToken(token),
      pendingAuthSync: false,
    };
  } catch {
    return null;
  }
}

/** Correct pendingAuthSync for hydrated sessions (device login ≠ pending registration). */
export async function normalizeStoredSession(session: StoredAuthSession): Promise<StoredAuthSession> {
  if (!session.isLocalSession) {
    return { ...session, pendingAuthSync: false };
  }

  if (!session.pendingAuthSync) return session;

  try {
    const record = await localAuthStore.getByEmail(session.user.email);
    if (record?.kind === 'device_login') {
      return { ...session, pendingAuthSync: false };
    }
    if (record?.kind === 'pending_registration') {
      return { ...session, pendingAuthSync: true };
    }
  } catch (err) {
    console.warn('[SecureStorage] Failed to resolve pendingAuthSync:', err);
  }

  return session;
}

/** Keep encrypted + legacy mirrors in sync after profile refresh. */
export async function updateStoredAuthUser(user: AuthUser): Promise<void> {
  const session = await loadAuthSession();
  if (!session) return;
  await saveAuthSession({ ...session, user });
}

export async function clearAuthSession(): Promise<void> {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }

  try {
    const db = await getOfflineDb();
    await db.delete('secureSecrets', AUTH_SESSION_KEY);
  } catch (err) {
    console.warn('[SecureStorage] IndexedDB session clear failed:', err);
  }

  await deleteElectronSecure(AUTH_SESSION_KEY);
}

export async function migrateLegacyAuthStorage(): Promise<void> {
  const legacy = loadLegacyAuthSession();
  if (!legacy) return;
  await saveAuthSession(legacy);
}
