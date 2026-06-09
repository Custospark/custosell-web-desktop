/** Injected at build time by Vite `define` (see vite.config.ts). */
declare const __APP_VERSION__: string;

export const DESKTOP_RELEASE = {
  githubOwner: 'Custospark',
  githubRepo: 'custosell-web-desktop',
  productName: 'Custosell',
} as const;

export function getDesktopAppVersion(): string {
  return __APP_VERSION__;
}

/** Windows NSIS installer filename (matches electron-builder artifactName). */
export function getWindowsInstallerFileName(version = getDesktopAppVersion()): string {
  return `${DESKTOP_RELEASE.productName}-Setup-${version}.exe`;
}

export function getWindowsInstallerDownloadUrl(version = getDesktopAppVersion()): string {
  const fileName = getWindowsInstallerFileName(version);
  return `https://github.com/${DESKTOP_RELEASE.githubOwner}/${DESKTOP_RELEASE.githubRepo}/releases/download/v${version}/${fileName}`;
}

export function getGitHubReleasesPageUrl(): string {
  return `https://github.com/${DESKTOP_RELEASE.githubOwner}/${DESKTOP_RELEASE.githubRepo}/releases`;
}
