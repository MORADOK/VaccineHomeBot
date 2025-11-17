# GitHub Releases Publishing Guide

## Overview

This guide explains how to configure and use GitHub Releases for distributing VCHome Hospital Desktop Application updates. The auto-update system uses GitHub Releases as the update server, allowing users to receive updates automatically.

## Prerequisites

- GitHub account with access to the repository
- Node.js and npm installed
- Electron Builder configured (already done)
- Repository: `MORADOK/VaccineHomeBot`

## Table of Contents

1. [Setup GitHub Personal Access Token](#setup-github-personal-access-token)
2. [Configure Environment](#configure-environment)
3. [Verify Setup](#verify-setup)
4. [Publishing Releases](#publishing-releases)
5. [Automated Releases with GitHub Actions](#automated-releases-with-github-actions)
6. [Troubleshooting](#troubleshooting)

---

## Setup GitHub Personal Access Token

### Step 1: Create Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a descriptive name: `VCHome Hospital Release Publishing`
4. Set expiration (recommended: 90 days or No expiration for CI/CD)
5. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
     - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
6. Click **"Generate token"**
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Token Format

Your token should look like one of these:
- Classic token: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Fine-grained token: `github_pat_xxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Store Token Securely

**Option A: Environment Variable (Recommended for local development)**

Windows (Command Prompt):
```cmd
set GH_TOKEN=your_token_here
```

Windows (PowerShell):
```powershell
$env:GH_TOKEN="your_token_here"
```

To make it permanent, add to System Environment Variables:
1. Search "Environment Variables" in Windows
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `GH_TOKEN`
5. Variable value: Your token
6. Click OK

**Option B: .env File (For local development)**

Create or edit `.env` file in project root:
```env
GH_TOKEN=your_token_here
```

**⚠️ SECURITY WARNING**: Never commit `.env` file to Git! Ensure it's in `.gitignore`.

**Option C: GitHub Secrets (For GitHub Actions)**

The workflow already uses `secrets.GITHUB_TOKEN` which is automatically provided by GitHub Actions. No additional setup needed for automated releases.

---

## Configure Environment

### 1. Verify package.json Configuration

The configuration is already set up in `package.json`:

```json
{
  "version": "1.0.6",
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "MORADOK",
        "repo": "VaccineHomeBot"
      }
    ]
  }
}
```

### 2. Check electron-updater Installation

Already installed:
```json
{
  "dependencies": {
    "electron-updater": "^6.6.2"
  }
}
```

### 3. Verify Build Scripts

Available scripts in `package.json`:
```json
{
  "scripts": {
    "dist-win": "npm run build && electron-builder --win --publish=never",
    "publish-win": "npm run build && electron-builder --win --publish=always",
    "publish-draft": "npm run build && electron-builder --win --publish=onTagOrDraft"
  }
}
```

---

## Verify Setup

Run the verification script to check if everything is configured correctly:

```bash
npm run verify-publish
```

This will check:
- ✅ package.json configuration
- ✅ GitHub token presence and validity
- ✅ .env file
- ✅ .gitignore security
- ✅ Auto-updater files
- ✅ GitHub Actions workflow
- ✅ Release directory

### Expected Output

```
🔍 Verifying GitHub Releases Publishing Setup...

📦 Checking package.json configuration...
   ✅ Version: 1.0.6
   ✅ GitHub provider configured
   ✅ Owner: MORADOK
   ✅ Repo: VaccineHomeBot
   ✅ electron-updater: ^6.6.2
   ✅ electron-builder: ^26.0.12

🔑 Checking GitHub token...
   ✅ GH_TOKEN environment variable is set
   ✅ Token format looks correct
   ✅ Token is valid (authenticated as: MORADOK)

✅ All checks passed! You are ready to publish releases.
```

---

## Publishing Releases

### Method 1: Manual Publishing (Local)

#### Step 1: Update Version

Edit `package.json`:
```json
{
  "version": "1.0.7"
}
```

#### Step 2: Build and Publish

**Option A: Publish immediately**
```bash
npm run publish-win
```

**Option B: Create draft release**
```bash
npm run publish-draft
```

**Option C: Build without publishing (for testing)**
```bash
npm run dist-win
```

#### Step 3: Verify Release

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Check that the new release appears
3. Verify files are uploaded:
   - `VCHome-Hospital-Setup-1.0.7.exe`
   - `VCHome-Hospital-Setup-1.0.7.exe.blockmap`
   - `latest.yml`

#### Step 4: Add Release Notes

1. Click "Edit" on the release
2. Add release notes describing changes
3. Click "Update release"

### Method 2: Automated Publishing (GitHub Actions)

#### Option A: Push a Tag

```bash
# Create and push a tag
git tag v1.0.7
git push origin v1.0.7
```

The GitHub Actions workflow will automatically:
1. Build the application
2. Create a GitHub Release
3. Upload installers and update manifest

#### Option B: Manual Workflow Dispatch

1. Go to: https://github.com/MORADOK/VaccineHomeBot/actions
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter version number (e.g., 1.0.7)
5. Click "Run workflow"

---

## Automated Releases with GitHub Actions

### Workflow File

Location: `.github/workflows/release.yml`

### Triggers

1. **Tag Push**: Automatically runs when you push a tag starting with `v`
   ```bash
   git tag v1.0.7
   git push origin v1.0.7
   ```

2. **Manual Dispatch**: Run manually from GitHub Actions UI

### Workflow Steps

1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Build application
5. Publish to GitHub Releases
6. Upload artifacts

### Monitoring Workflow

1. Go to: https://github.com/MORADOK/VaccineHomeBot/actions
2. Click on the running workflow
3. Monitor progress in real-time
4. Check for errors in logs

---

## Understanding latest.yml

The `latest.yml` file is the update manifest that tells the auto-updater about available updates.

### Example latest.yml

```yaml
version: 1.0.7
files:
  - url: VCHome-Hospital-Setup-1.0.7.exe
    sha512: [hash]
    size: 89234567
path: VCHome-Hospital-Setup-1.0.7.exe
sha512: [hash]
releaseDate: '2025-11-17T10:30:00.000Z'
```

### How It Works

1. App checks: `https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/latest.yml`
2. Compares version with current version
3. If newer version available, downloads the installer
4. Verifies SHA-512 checksum
5. Prompts user to install

---

## Troubleshooting

### Issue: "GH_TOKEN not set"

**Solution**: Set the environment variable
```cmd
set GH_TOKEN=your_token_here
```

### Issue: "Token is invalid"

**Solutions**:
1. Check token hasn't expired
2. Verify token has `repo` scope
3. Generate a new token

### Issue: "Cannot publish to GitHub"

**Solutions**:
1. Check internet connection
2. Verify repository exists and you have access
3. Check token permissions
4. Try publishing as draft first: `npm run publish-draft`

### Issue: "Build fails"

**Solutions**:
1. Run `npm run build` separately to check for build errors
2. Check Node.js version (should be 18+)
3. Clear `node_modules` and reinstall: `npm ci`

### Issue: "Auto-update not working"

**Solutions**:
1. Verify `latest.yml` exists in release
2. Check app version is older than release version
3. Check internet connection
4. Look at app logs for errors
5. Verify GitHub repository is public or token is configured

### Issue: "Release not appearing"

**Solutions**:
1. Check if release is marked as "Draft"
2. Verify files were uploaded successfully
3. Check GitHub Actions logs for errors
4. Try manual publishing: `npm run publish-win`

---

## Best Practices

### Version Numbering

Follow Semantic Versioning (semver):
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

### Release Notes

Include in every release:
- ✅ New features
- ✅ Bug fixes
- ✅ Breaking changes
- ✅ Known issues
- ✅ Upgrade instructions (if needed)

### Testing Before Release

1. Build locally: `npm run dist-win`
2. Test installer on clean machine
3. Verify auto-update works from previous version
4. Check all features work correctly

### Security

- ✅ Never commit tokens to Git
- ✅ Use `.env` for local development
- ✅ Use GitHub Secrets for CI/CD
- ✅ Rotate tokens regularly (every 90 days)
- ✅ Use fine-grained tokens when possible

---

## Quick Reference

### Common Commands

```bash
# Verify setup
npm run verify-publish

# Build without publishing
npm run dist-win

# Publish to GitHub Releases
npm run publish-win

# Create draft release
npm run publish-draft

# Create and push tag
git tag v1.0.7
git push origin v1.0.7
```

### Important URLs

- Repository: https://github.com/MORADOK/VaccineHomeBot
- Releases: https://github.com/MORADOK/VaccineHomeBot/releases
- Actions: https://github.com/MORADOK/VaccineHomeBot/actions
- Token Settings: https://github.com/settings/tokens

---

## Next Steps

After setting up GitHub Releases:

1. ✅ Test publishing a release
2. ✅ Verify auto-update works
3. ✅ Document release process for team
4. ✅ Set up automated releases with GitHub Actions
5. ✅ Create release checklist

See [RELEASE-WORKFLOW.md](./RELEASE-WORKFLOW.md) for detailed release procedures.
