# Auto-Update User Guide

## Overview

VCHome Hospital desktop application includes an automatic update system that keeps your software up-to-date with the latest features, bug fixes, and security improvements.

## How Auto-Updates Work

### Automatic Update Checks

When you start the application, it automatically checks for new versions in the background. This happens:
- Every time you launch the app
- Without interrupting your work
- Only when you have an internet connection

### Update Notifications

When a new version is available, you'll see a notification dialog with:
- The new version number
- Release notes describing what's new
- Options to download or skip the update

### Download Process

If you choose to download an update:
1. A progress dialog appears showing:
   - Download percentage (0-100%)
   - Download speed (MB/s)
   - Estimated time remaining
   - Bytes transferred and total size

2. The download happens in the background
3. You can continue using the application while downloading

### Installation Options

Once the download completes, you have two choices:

**Install Now**
- Closes the application immediately
- Installs the update
- Restarts with the new version

**Install Later**
- Continues running the current version
- Update will be installed when you next close the app
- You can keep working without interruption

## Manual Update Check

You can manually check for updates at any time:

1. Open the application
2. Click on **Settings** (gear icon)
3. Scroll to the **Updates** section
4. Click **Check for Updates**

The system will:
- Show a loading indicator while checking
- Display "You're up to date" if no updates are available
- Show update details if a new version is found

## Update History

View your update history in Settings:

1. Go to **Settings**
2. Find the **Update History** section
3. See a log of all update activities including:
   - Date and time
   - Action performed (check, download, install)
   - Version numbers
   - Success or error status

## Offline Behavior

If you're offline or have no internet connection:
- The app starts normally without checking for updates
- No error messages are shown
- Updates will be checked on the next startup when online

## Troubleshooting

### Update Check Failed

**Problem**: "Failed to check for updates" message appears

**Solutions**:
1. Check your internet connection
2. Try again in a few minutes
3. Manually check for updates from Settings
4. Contact IT support if the problem persists

### Download Failed

**Problem**: Update download stops or fails

**Solutions**:
1. Check your internet connection
2. Ensure you have enough disk space (at least 500MB free)
3. Try downloading again from Settings
4. Restart the application and try again

### Installation Failed

**Problem**: Update fails to install

**Solutions**:
1. Close all instances of the application
2. Restart your computer
3. Try installing the update again
4. If it still fails, download the installer manually from the hospital IT portal

### Update Keeps Appearing

**Problem**: Same update notification appears repeatedly

**Solutions**:
1. Make sure you clicked "Download" not "Skip"
2. Let the download complete fully
3. Choose "Install Now" or wait for automatic installation on app close
4. Check Update History in Settings to see if installation succeeded

## Security

### Code Signing

All updates are digitally signed to ensure they come from VCHome Hospital:
- The system verifies signatures before installation
- Unsigned or tampered updates are rejected
- You'll see a warning if verification fails

### Secure Downloads

Updates are downloaded securely:
- All connections use HTTPS encryption
- File integrity is verified using SHA-512 checksums
- Downloads from official GitHub Releases only

## Privacy

The auto-update system:
- Only checks for updates, no personal data is sent
- Does not track your usage or behavior
- Does not collect any patient or hospital data
- Only communicates with GitHub's official servers

## Frequently Asked Questions

### Can I disable auto-updates?

Currently, auto-updates cannot be disabled as they ensure you have the latest security patches and bug fixes. However, you can always choose "Install Later" to control when updates are applied.

### How much data does an update use?

Update sizes vary but typically range from 50-150 MB. The progress dialog shows the exact size before downloading.

### Will I lose my data during an update?

No. Updates only replace the application files. All your settings, preferences, and data remain intact.

### Can I continue working during an update?

Yes! You can continue using the application while an update downloads. Installation only happens when you choose "Install Now" or close the application.

### What if I'm in the middle of important work?

Choose "Install Later" and the update will wait until you're ready. Your work is never interrupted without your permission.

### How often are updates released?

Updates are released as needed for:
- Critical security fixes (immediately)
- Bug fixes (weekly or bi-weekly)
- New features (monthly)
- Major versions (quarterly)

### Can I go back to an older version?

Downgrading is not recommended and not supported through the auto-update system. If you experience issues with a new version, contact IT support.

## Support

If you encounter any issues with the auto-update system:

1. Check the Update History in Settings for error details
2. Try the troubleshooting steps above
3. Contact your hospital IT support team
4. Provide them with:
   - The error message (if any)
   - Your current version number (shown in Settings)
   - The version you're trying to update to
   - Update History log entries

## Best Practices

✅ **Do:**
- Keep your application updated for security and stability
- Check for updates manually before important tasks
- Install updates during breaks or at the end of your shift
- Report any update issues to IT support

❌ **Don't:**
- Force close the application during installation
- Interrupt downloads by disconnecting from the network
- Ignore critical security updates
- Try to install updates manually from unofficial sources

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**For**: VCHome Hospital Staff
