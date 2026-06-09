import { getUserFirstName } from '../../../shared/utils/userDisplayName';

export function buildOfflineToastMessage(name: string | null | undefined): string {
  const firstName = getUserFirstName(name);
  return `${firstName}, you've lost your connection. You can keep working — your changes will sync when you're back online.`;
}

export function buildOnlineToastMessage(name: string | null | undefined): string {
  const firstName = getUserFirstName(name);
  return `${firstName}, you're back online. Your changes will sync to the server.`;
}
