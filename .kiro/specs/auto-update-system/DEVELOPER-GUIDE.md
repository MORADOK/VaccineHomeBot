# Auto-Update Developer Guide

## Overview

This guide covers the complete release process for publishing updates to the VCHome Hospital desktop application using the electron-updater system with GitHub Releases.

## Prerequisites

Before you can publish updates, ensure you have:

1. **GitHub Personal Access Token** with `repo` scope
2. **Code Signing Certificate** (for Windows builds)
3. **Node.js and npm** installed
4. **Git** configured with push access to the repository
5. **Write access** to GitHub Releases

## Quick Start

```bash
# 1. Verify your publishing setup
npm run verify-publish

# 2. Update version in package.json
npm version patch  # or minor, or major

# 3. Build and publish
npm run publish-win

# 4. Create GitHub Release with release notes
```

## Detailed Release Process

### Step 1: Prepare the Release

#### 1.1 Update Version Number

Edit `package.json`:

```json
{
  "version": "1.0.7"  // Increment according to semver
}
```

Or use npm:

```bash
npm version patch   # 1.0.6 → 1.0.7 (bug fixes)
npm version minor   # 1.0.6 → 1.1.0 (new features)
npm version major   # 1.0.6 → 2.0.0 (breaking changes)
```

#### 1.2 Update Changelog

Create or update `CHANGELOG.md`:

```markdown
## [1.0.7] - 2025-11-17

### Added
- New feature X
- Enhancement Y

### Fixed
- Bug fix A
- Issue B resolved

### Changed
- Updated dependency Z
```

#### 1.3 Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.7"
git push origin main
```

### Step 2: Build the Application

#### 2.1 Clean Previous Builds

```bash
# Remove old build artifacts
rmdir /s /q dist
rmdir /s /q dist-electron
rmdir /s /q release
```

#### 2.2 Build for Production

```bash
# Build the application
npm run build

# Package for Windows
npm run dist-win
```

This creates:
- `release/VCHome Hospital Setup 1.0.7.exe` - Installer
- `release/VCHome Hospital Setup 1.0.7.exe.blockmap` - Update metadata
- `release/latest.yml` - Update manifest

#### 2.3 Verify Build

Check that all required files exist:

```bash
dir release
```

Expected files:
- ✅ `VCHome Hospital Setup [version].exe`
- ✅ `VCHome Hospital Setup [version].exe.blockmap`
- ✅ `latest.yml`

### Step 3: Publish to GitHub Releases

#### 3.1 Set GitHub Token

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="your_github_token_here"
```

**Windows (CMD):**
```cmd
set GH_TOKEN=your_github_token_here
```

**Permanent (Environment Variables):**
1. Open System Properties → Environment Variables
2. Add new User Variable:
   - Name: `GH_TOKEN`
   - Value: `your_github_token_here`

#### 3.2 Publish Release

```bash
npm run publish-win
```

This will:
1. Build the application
2. Package the installer
3. Upload to GitHub Releases
4. Create a draft release

#### 3.3 Complete the Release on GitHub

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Find the draft release
3. Edit the release:
   - Add release title: `v1.0.7 - Release Name`
   - Add release notes from CHANGELOG
   - Verify files are attached
4. Click **Publish release**

### Step 4: Verify the Release

#### 4.1 Check Release Files

Ensure the release includes:
- ✅ `VCHome Hospital Setup 1.0.7.exe`
- ✅ `VCHome Hospital Setup 1.0.7.exe.blockmap`
- ✅ `latest.yml`

#### 4.2 Verify Update Manifest

Download and check `latest.yml`:

```yaml
version: 1.0.7
files:
  - url: VCHome-Hospital-Setup-1.0.7.exe
    sha512: [hash]
    size: [bytes]
path: VCHome-Hospital-Setup-1.0.7.exe
sha512: [hash]
releaseDate: '2025-11-17T05:00:00.000Z'
```

#### 4.3 Test Auto-Update

1. Install the previous version
2. Launch the application
3. Verify update notification appears
4. Test download and installation

## Configuration Files

### package.json

```json
{
  "name": "vchome-hospital",
  "version": "1.0.7",
  "build": {
    "appId": "com.vchome.hospital",
    "productName": "VCHome Hospital",
    "publish": {
      "provider": "github",
      "owner": "MORADOK",
      "repo": "VaccineHomeBot",
      "releaseType": "release"
    },
    "win": {
      "target": ["nsis"],
      "icon": "electron/assets/icon.ico",
      "publisherName": "VCHome Hospital",
      "signAndEditExecutable": true
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### electron-builder.yml (Optional)

```yaml
appId: com.vchome.hospital
productName: VCHome Hospital
directories:
  output: release
  buildResources: electron/assets

win:
  target:
    - nsis
  icon: electron/assets/icon.ico
  publisherName: VCHome Hospital

publish:
  provider: github
  owner: MORADOK
  repo: VaccineHomeBot
```

## Auto-Updater Code

### Main Process (public/auto-updater.js)

```javascript
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure update server
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'MORADOK',
  repo: 'VaccineHomeBot',
  private: false
});

// Don't auto-download
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Check for updates
function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

module.exports = { checkForUpdates };
```

## Troubleshooting

### Build Fails

**Problem**: `npm run dist-win` fails

**Solutions**:
1. Clear node_modules: `rmdir /s /q node_modules && npm install`
2. Clear build cache: `rmdir /s /q dist dist-electron release`
3. Check Node.js version: `node --version` (should be 18+)
4. Verify package.json syntax

### Publish Fails

**Problem**: `npm run publish-win` fails with authentication error

**Solutions**:
1. Verify GH_TOKEN is set: `echo %GH_TOKEN%`
2. Check token has `repo` scope
3. Verify token hasn't expired
4. Try setting token again

### Update Not Detected

**Problem**: Clients don't see the update

**Solutions**:
1. Verify release is published (not draft)
2. Check `latest.yml` exists in release
3. Verify version number is higher than current
4. Check client's internet connection
5. Look at client logs in `%APPDATA%/VCHome Hospital/logs`

### Download Fails

**Problem**: Update download fails on client

**Solutions**:
1. Verify all files uploaded correctly
2. Check file sizes match
3. Verify SHA-512 checksums
4. Test download manually from GitHub
5. Check client's disk space

## Best Practices

### Version Numbering

Follow Semantic Versioning (semver):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

### Release Notes

Write clear, user-friendly release notes:

```markdown
## What's New in v1.0.7

### 🎉 New Features
- Added automatic backup before updates
- Improved update progress display

### 🐛 Bug Fixes
- Fixed update notification not appearing
- Resolved download speed calculation

### 🔧 Improvements
- Faster update checks
- Better error messages
```

### Testing

Before publishing:
1. ✅ Test build locally
2. ✅ Verify installer works
3. ✅ Test update from previous version
4. ✅ Check all features work after update
5. ✅ Verify no data loss
6. ✅ Test on clean Windows installation

### Release Timing

- **Critical Security Fixes**: Immediate release
- **Bug Fixes**: Weekly or bi-weekly
- **New Features**: Monthly
- **Major Versions**: Quarterly

Avoid releasing:
- On Fridays (no weekend support)
- During peak hospital hours
- Before holidays

## Security Considerations

### Code Signing

Always sign your releases:
1. Obtain a valid code signing certificate
2. Configure in electron-builder
3. Verify signature after build
4. Never publish unsigned builds

### Token Security

Protect your GitHub token:
- ❌ Never commit tokens to git
- ❌ Never share tokens
- ✅ Use environment variables
- ✅ Rotate tokens regularly
- ✅ Use minimal required scopes

### Release Verification

Before publishing:
1. Verify build integrity
2. Check for malware/viruses
3. Test on isolated system
4. Review all code changes
5. Verify dependencies are up-to-date

## Automation

### GitHub Actions (Optional)

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run publish-win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Release Script

Create `scripts/release.js`:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

// Read current version
const pkg = JSON.parse(fs.readFileSync('package.json'));
console.log(`Current version: ${pkg.version}`);

// Build and publish
execSync('npm run build', { stdio: 'inherit' });
execSync('npm run dist-win', { stdio: 'inherit' });
execSync('npm run publish-win', { stdio: 'inherit' });

console.log('✅ Release published successfully!');
```

## Support

For issues or questions:
1. Check this guide first
2. Review `.kiro/specs/auto-update-system/` documentation
3. Check electron-updater docs: https://www.electron.build/auto-update
4. Contact the development team

## Resources

- [electron-builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Maintainer**: VCHome Hospital Development Team
