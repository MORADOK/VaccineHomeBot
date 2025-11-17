# Auto-Update Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the auto-update system for both users and developers.

## Table of Contents

- [User Issues](#user-issues)
- [Developer Issues](#developer-issues)
- [Diagnostic Tools](#diagnostic-tools)
- [Log Files](#log-files)
- [Common Error Messages](#common-error-messages)

---

## User Issues

### Update Check Failed

#### Symptoms
- "Failed to check for updates" error message
- Update check never completes
- Loading indicator spins indefinitely

#### Causes
1. No internet connection
2. Firewall blocking GitHub
3. GitHub API rate limit exceeded
4. Corrupted update cache

#### Solutions

**Solution 1: Check Internet Connection**
```
1. Open a web browser
2. Try accessing https://github.com
3. If it doesn't load, check your network connection
4. Contact IT if you can't access GitHub
```

**Solution 2: Clear Update Cache**
```
1. Close the application completely
2. Navigate to: %APPDATA%\VCHome Hospital
3. Delete the "update-cache" folder
4. Restart the application
```

**Solution 3: Check Firewall**
```
1. Open Windows Firewall settings
2. Ensure "VCHome Hospital" is allowed
3. Add exception for:
   - api.github.com
   - github.com
   - objects.githubusercontent.com
```

**Solution 4: Wait and Retry**
```
If rate limited:
1. Wait 60 minutes
2. Try checking for updates again
3. Rate limits reset hourly
```

---

### Download Failed

#### Symptoms
- Download starts but stops at a certain percentage
- "Download failed" error message
- Download speed shows 0 MB/s

#### Causes
1. Network interruption
2. Insufficient disk space
3. Antivirus blocking download
4. Corrupted download

#### Solutions

**Solution 1: Check Disk Space**
```
1. Open File Explorer
2. Right-click on C: drive
3. Select Properties
4. Ensure at least 500 MB free space
5. Delete temporary files if needed
```

**Solution 2: Disable Antivirus Temporarily**
```
1. Open your antivirus software
2. Temporarily disable real-time protection
3. Try downloading the update again
4. Re-enable antivirus after installation
5. Add VCHome Hospital to antivirus exceptions
```

**Solution 3: Retry Download**
```
1. Close the error dialog
2. Go to Settings
3. Click "Check for Updates"
4. Click "Download" again
```

**Solution 4: Manual Download**
```
If automatic download keeps failing:
1. Contact IT support
2. Request manual installer
3. Install manually
4. Auto-updates will work for future versions
```

---

### Installation Failed

#### Symptoms
- "Installation failed" error
- Application closes but doesn't update
- Old version still running after "Install Now"

#### Causes
1. Application still running in background
2. Insufficient permissions
3. Corrupted update file
4. Antivirus blocking installation

#### Solutions

**Solution 1: Close All Instances**
```
1. Press Ctrl+Shift+Esc (Task Manager)
2. Look for "VCHome Hospital" processes
3. End all instances
4. Try installing again
```

**Solution 2: Run as Administrator**
```
1. Right-click application shortcut
2. Select "Run as administrator"
3. Try installing the update again
```

**Solution 3: Restart Computer**
```
1. Save all work
2. Restart your computer
3. Launch the application
4. Update should install automatically
```

**Solution 4: Reinstall Application**
```
Last resort:
1. Backup your data (if any)
2. Uninstall VCHome Hospital
3. Download fresh installer from IT
4. Install the latest version
```

---

### Update Notification Keeps Appearing

#### Symptoms
- Same update notification shows every time you start the app
- "Update available" appears even after installing

#### Causes
1. Update wasn't actually installed
2. Version number not updated
3. Corrupted installation
4. Clicked "Skip" instead of "Download"

#### Solutions

**Solution 1: Check Current Version**
```
1. Open Settings
2. Look at "Current Version" number
3. Compare with the update version
4. If they match, the update is installed
```

**Solution 2: Complete the Update**
```
1. Click "Download" (not "Skip")
2. Wait for download to complete
3. Click "Install Now"
4. Let the application restart
```

**Solution 3: Clear Update State**
```
1. Close the application
2. Navigate to: %APPDATA%\VCHome Hospital
3. Delete "update-state.json"
4. Restart the application
```

---

### Slow Download Speed

#### Symptoms
- Download takes very long time
- Speed shows less than 0.5 MB/s
- Progress bar barely moves

#### Causes
1. Slow internet connection
2. Network congestion
3. GitHub CDN issues
4. Background downloads

#### Solutions

**Solution 1: Check Network Speed**
```
1. Visit speedtest.net
2. Run a speed test
3. If speed is slow, contact IT
4. Close other applications using internet
```

**Solution 2: Pause Other Downloads**
```
1. Close web browsers
2. Pause cloud sync (OneDrive, Dropbox)
3. Close streaming applications
4. Try downloading update again
```

**Solution 3: Try Different Time**
```
1. Click "Install Later"
2. Try downloading during off-peak hours
3. Early morning or late evening usually faster
```

---

## Developer Issues

### Build Fails

#### Symptoms
- `npm run dist-win` fails
- Build errors in console
- Missing files in release folder

#### Causes
1. Dependency issues
2. Corrupted node_modules
3. Incorrect configuration
4. Missing build tools

#### Solutions

**Solution 1: Clean Install**
```bash
# Remove node_modules and lock file
rmdir /s /q node_modules
del package-lock.json

# Reinstall dependencies
npm install

# Try building again
npm run dist-win
```

**Solution 2: Clear Build Cache**
```bash
# Remove all build artifacts
rmdir /s /q dist
rmdir /s /q dist-electron
rmdir /s /q release

# Rebuild
npm run build
npm run dist-win
```

**Solution 3: Check Node Version**
```bash
# Check current version
node --version

# Should be 18.x or higher
# If not, update Node.js
```

**Solution 4: Verify Configuration**
```bash
# Check package.json syntax
npm run verify-publish

# Fix any reported issues
```

---

### Publish Fails

#### Symptoms
- `npm run publish-win` fails
- Authentication errors
- "401 Unauthorized" error

#### Causes
1. Missing or invalid GitHub token
2. Token lacks required permissions
3. Token expired
4. Network issues

#### Solutions

**Solution 1: Verify Token**
```powershell
# Check if token is set
echo $env:GH_TOKEN

# If empty, set it
$env:GH_TOKEN="your_token_here"
```

**Solution 2: Check Token Permissions**
```
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Find your token
3. Verify it has "repo" scope
4. Regenerate if needed
```

**Solution 3: Test Token**
```bash
# Test token with curl
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Should return your user info
# If error, token is invalid
```

**Solution 4: Create New Token**
```
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select "repo" scope
4. Generate and copy token
5. Set as GH_TOKEN environment variable
```

---

### Update Not Detected by Clients

#### Symptoms
- Published release but clients don't see update
- "You're up to date" message when update exists
- Update check succeeds but finds nothing

#### Causes
1. Release is still in draft mode
2. Missing latest.yml file
3. Version number not incremented
4. Client cache issue

#### Solutions

**Solution 1: Verify Release Status**
```
1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Find your release
3. Ensure it's published (not draft)
4. Click "Edit" and "Publish release" if needed
```

**Solution 2: Check latest.yml**
```
1. Open the release on GitHub
2. Verify "latest.yml" file is attached
3. Download and inspect contents
4. Verify version number matches
```

**Solution 3: Verify Version Number**
```json
// In package.json
{
  "version": "1.0.7"  // Must be higher than current
}

// In latest.yml
version: 1.0.7  // Must match package.json
```

**Solution 4: Clear Client Cache**
```
On client machine:
1. Close application
2. Delete: %APPDATA%\VCHome Hospital\update-cache
3. Restart application
4. Check for updates
```

---

### Code Signing Issues

#### Symptoms
- "Untrusted publisher" warning
- Windows SmartScreen blocks installation
- Signature verification fails

#### Causes
1. Missing code signing certificate
2. Certificate expired
3. Certificate not trusted
4. Signing process failed

#### Solutions

**Solution 1: Verify Certificate**
```bash
# Check if certificate is configured
# In package.json, look for:
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

**Solution 2: Sign Manually**
```bash
# If auto-signing fails, sign manually
signtool sign /f cert.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 "VCHome Hospital Setup.exe"
```

**Solution 3: Use Different Certificate**
```
1. Obtain new code signing certificate
2. Update configuration
3. Rebuild and sign
```

---

## Diagnostic Tools

### Verify Publish Setup

```bash
# Run verification script
npm run verify-publish

# Checks:
# - GitHub token is set
# - package.json configuration
# - Build tools available
# - Network connectivity
```

### Check Update Logs

**User Logs:**
```
Location: %APPDATA%\VCHome Hospital\logs\main.log

Look for:
- "Checking for updates"
- "Update available"
- "Download progress"
- Error messages
```

**Developer Logs:**
```bash
# Enable verbose logging
set DEBUG=electron-updater

# Run application
npm run electron-dev

# Watch console for detailed logs
```

### Test Update Manually

```javascript
// In developer console (Renderer)
window.electron.checkForUpdates();

// Watch for IPC events
window.electron.onUpdateAvailable((info) => {
  console.log('Update available:', info);
});
```

---

## Log Files

### Location

**Windows:**
```
%APPDATA%\VCHome Hospital\logs\
├── main.log          # Main process logs
├── renderer.log      # Renderer process logs
└── updater.log       # Update-specific logs
```

### Reading Logs

**Look for these patterns:**

**Successful Update Check:**
```
[2025-11-17 10:30:00] Checking for updates
[2025-11-17 10:30:02] Update available: 1.0.7
[2025-11-17 10:30:02] Current version: 1.0.6
```

**Failed Update Check:**
```
[2025-11-17 10:30:00] Checking for updates
[2025-11-17 10:30:05] Error checking for updates: ENOTFOUND
[2025-11-17 10:30:05] Network error or GitHub unavailable
```

**Download Progress:**
```
[2025-11-17 10:35:00] Downloading update
[2025-11-17 10:35:10] Progress: 25% (12.5 MB / 50 MB)
[2025-11-17 10:35:20] Progress: 50% (25 MB / 50 MB)
[2025-11-17 10:35:30] Download complete
```

**Installation:**
```
[2025-11-17 10:40:00] Installing update
[2025-11-17 10:40:05] Quitting application
[2025-11-17 10:40:10] Update installed successfully
```

---

## Common Error Messages

### "ERR_UPDATER_INVALID_RELEASE_FEED"

**Meaning**: Cannot access GitHub Releases

**Solutions**:
1. Check internet connection
2. Verify GitHub is accessible
3. Check firewall settings
4. Verify repository exists and is public

---

### "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND"

**Meaning**: latest.yml file missing from release

**Solutions**:
1. Verify release includes latest.yml
2. Rebuild and republish
3. Check electron-builder configuration

---

### "ERR_UPDATER_ZIP_FILE_NOT_FOUND"

**Meaning**: Update file missing or corrupted

**Solutions**:
1. Verify all files uploaded to release
2. Check file names match latest.yml
3. Re-upload missing files

---

### "ERR_UPDATER_SIGNATURE_VERIFICATION"

**Meaning**: Code signature invalid or missing

**Solutions**:
1. Verify code signing certificate
2. Rebuild with proper signing
3. Check certificate hasn't expired

---

### "ENOTFOUND" or "ETIMEDOUT"

**Meaning**: Network connectivity issue

**Solutions**:
1. Check internet connection
2. Verify DNS resolution
3. Check proxy settings
4. Try again later

---

### "ENOSPC"

**Meaning**: Insufficient disk space

**Solutions**:
1. Free up disk space
2. Delete temporary files
3. Move files to external drive
4. Increase disk quota

---

## Getting Help

### For Users

1. **Check Update History** in Settings for error details
2. **Try troubleshooting steps** in this guide
3. **Contact IT Support** with:
   - Error message screenshot
   - Current version number
   - Steps you've already tried
   - Log files (if requested)

### For Developers

1. **Check logs** in `%APPDATA%\VCHome Hospital\logs\`
2. **Review configuration** in package.json
3. **Test locally** before publishing
4. **Check GitHub Issues** for similar problems
5. **Contact development team** with:
   - Full error message
   - Build logs
   - Configuration files
   - Steps to reproduce

---

## Prevention

### For Users

✅ Keep application updated
✅ Maintain stable internet connection
✅ Ensure adequate disk space (500+ MB free)
✅ Don't force close during updates
✅ Report issues promptly

### For Developers

✅ Test builds before publishing
✅ Verify all files in release
✅ Use semantic versioning
✅ Write clear release notes
✅ Monitor update success rates
✅ Keep dependencies updated
✅ Maintain valid code signing certificate

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**For**: VCHome Hospital Users and Developers
