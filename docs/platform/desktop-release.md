# Custosell Desktop — Release & Auto-Update

Desktop installers are published to **[Custospark/custosell-web-desktop](https://github.com/Custospark/custosell-web-desktop)**. Installed apps check that repo for updates via `electron-updater`.

## Versioning

Bump `version` in `package.json` before every release. The same version is injected into the app as `__APP_VERSION__` and used for:

- GitHub release tag (`v1.0.2`)
- Installer filename (`Custosell-Setup-1.0.2.exe`)
- Landing page download link

## Publish (manual — same as Custocare)

### Prerequisites

- Node.js and npm dependencies installed (`npm install`)
- GitHub PAT with **Contents: Read and write** on `custosell-web-desktop`
- Token set only in your terminal session (never commit it)

### Windows

```bash
export GH_TOKEN=your_token_here   # Git Bash
cd C:/Dev/Custosell/Frontend
npm run publish:win
```

PowerShell:

```powershell
$env:GH_TOKEN="your_token_here"
npm run publish:win
```

### macOS / Linux

```bash
npm run publish:mac    # arm64 DMG
npm run publish:linux  # AppImage + deb
npm run publish:all    # all platforms
```

### Verify release

Open [GitHub Releases](https://github.com/Custospark/custosell-web-desktop/releases) and confirm:

- Tag matches `package.json` version (`v*`)
- `Custosell-Setup-x.y.z.exe` (Windows)
- `latest.yml` (required for auto-update on Windows)

## Auto-update behaviour

Production desktop app only (not dev):

1. Checks for updates ~9s after launch, then every 12 hours
2. Downloads in background when a newer release exists
3. Shows progress toast/card in the app
4. Applies update on **app exit** (`quitAndInstall`)

Logs: `%APPDATA%/CUSTOSELL/logs/main.log` (Windows)

## Test auto-update

1. Install build at version **N** on a test machine
2. Publish version **N+1** to GitHub Releases
3. Launch installed app, wait for download notification
4. Quit app — installer runs silently
5. Relaunch — version should be **N+1**
