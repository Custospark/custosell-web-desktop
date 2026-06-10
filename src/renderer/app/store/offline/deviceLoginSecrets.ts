import { normalizeAuthEmail } from './passwordVerifier';
import { deleteSecureSecret, loadSecureSecret, saveSecureSecret } from './secureStorage';

function devicePasswordKey(email: string): string {
  return `device_login_pw:${normalizeAuthEmail(email)}`;
}

/** Encrypted password for silent server session upgrade after offline login. */
export async function saveDeviceLoginPassword(email: string, password: string): Promise<void> {
  await saveSecureSecret(devicePasswordKey(email), password);
}

export async function loadDeviceLoginPassword(email: string): Promise<string | null> {
  return loadSecureSecret(devicePasswordKey(email));
}

export async function clearDeviceLoginPassword(email: string): Promise<void> {
  await deleteSecureSecret(devicePasswordKey(email));
}
