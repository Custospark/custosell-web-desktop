export function buildOfflineToastMessage(name: string | null): string {
  if (name) {
    return `${name}, you've lost your connection. Custosell is paused until you're back online.`;
  }
  return "You've lost your connection. Custosell is paused until you're back online.";
}

export function buildOnlineToastMessage(name: string | null): string {
  if (name) {
    return `Welcome back, ${name}. You're connected again.`;
  }
  return "You're back online. Connection restored.";
}
