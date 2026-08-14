# Custosell Desktop - Release & Auto-Update

Desktop installers are published to **[Custospark/custosell-web-desktop](https://github.com/Custospark/custosell-web-desktop)**. Installed apps check that repo for updates via `electron-updater`.

## Versioning

Bump `version` in `package.json` before every release. The same version is injected into the app as `__APP_VERSION__` and used for:

- GitHub release tag (`v1.0.2`)
- Installer filename (`Custosell-Setup-1.0.2.exe`)
- Landing page download link

## Publish (manual - same as Custocare)

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

1. Checks for updates ~9s after launch, then every **6 hours**
2. Downloads silently in the background when a newer release exists - no toasts or progress indicators during download
3. Once a new version finishes downloading, a "Restart & Update" banner appears at the top of the app (Electron only) showing the new version number
4. User can **Restart & Install** from the banner (`quitAndInstall(true, true)`) or dismiss it - the update still applies on regular app exit (`quitAndInstall`)
5. Next launch runs the new version

**Philosophy:** Downloads happen silently in the background; the user controls *when* to restart so work is never interrupted mid-task.

## Test auto-update

1. Install build at version **N** on a test machine
2. Publish version **N+1** to GitHub Releases
3. Launch installed app - update downloads silently in the background
4. "Restart & Update" banner appears once download completes - click it to apply instantly, or dismiss and quit normally
5. Relaunch - version should be **N+1**

---

## Code Signing - Future Work (not yet implemented)

### Why

Current builds are signed with a local `signtool.exe` certificate on Oscar's dev machine. Other machines get **SmartScreen "Unknown Publisher"** warnings because the certificate isn't chain-trusted by Microsoft. This does not block installation (users click "More info" → "Run anyway") but reduces trust for a commercial POS app.

### Azure Trusted Signing (explored, not feasible)

- ✅ Monthly ~$10/mo, cloud-based, no certificate file to manage
- ✅ Integrates with `electron-builder` via `sign.js` hook + Azure dlib
- ❌ **Public Trust identity validation not available in Africa** - Microsoft limits this to US, Canada, EU, and UK. Private Trust is available but doesn't resolve Windows SmartScreen.

**Azure resources created (can be reused later):**

| Resource | Value |
|---|---|
| Subscription | `52678218-5cb3-4a57-8647-ac38743672af` |
| Resource Group | `custosell` |
| Account Name | `CustosparkSigning` |
| Region | eastus |
| Endpoint | `https://eus.codesigning.azure.net` |
| SKU | Basic |

The `Microsoft.CodeSigning` resource provider is registered. Identity validation and certificate profile were not created due to the regional limitation.

### Recommended path (when budget allows)

**SSL.com - OV Code Signing + eSigner Cloud**

| Item | Cost | Frequency |
|---|---|---|
| OV Code Signing certificate | $129 | Annual |
| eSigner Tier 1 (240 signings) | $15 | Monthly |
| **Total** | **~$129 first year + $15/mo** | |

**Why SSL.com:**
- No regional restrictions - identity validated via business registration documents (Custospark registration, utility bill, etc.)
- eSigner cloud HSM means no hardware token needed - sign from CI/CD or local machine
- Works with `signtool.exe` via eSigner CKA adapter - zero changes to the build pipeline
- OV cert displays "Custospark Company Ltd" on the installer, eliminating SmartScreen warnings after a few hundred downloads build reputation

**Setup when ready:**
1. Buy OV code signing cert from ssl.com
2. Enrol in eSigner cloud signing ($15/mo Tier 1)
3. Install eSigner CKA on build machine
4. Set env vars for `electron-builder` (or add `sign.js` hook if needed)
5. `npm run publish:win` - signs automatically

### Cheaper alternatives considered

| Option | Cost | Verdict |
|---|---|---|
| Self-signed cert | Free | Same SmartScreen warnings as no signing - no benefit |
| sigstore/cosign | Free | Linux/container only - no Windows Authenticode support |
| Open-source signing programs | Free | Require OSS project - Custosell is commercial |
| Skip signing entirely | Free | App works, same user friction |
| Sectigo OV cert | ~$230/yr | Annual only, `.p12` file, no cloud signing - works but pricier |

### Current state

- `signtool.exe` runs during `publish:win` using whatever cert is in the local Windows certificate store
- SmartScreen warning appears on machines that don't have that cert installed
- Tags (`v*`) push automatically and GitHub Releases work end-to-end
- No code changes needed in the repo to switch to proper signing - only environment variables or a small `sign.js` hook
