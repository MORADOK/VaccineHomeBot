# Testing Guide for GitHub Releases Publishing

## Overview

This guide provides comprehensive testing procedures for the GitHub Releases publishing system and auto-update functionality.

## 📋 Manual Testing Documentation

For detailed manual testing scenarios, see:

- **[MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md)** - Comprehensive step-by-step manual testing scenarios covering:
  - Update from old version to new
  - Offline behavior
  - Multiple consecutive updates
  - Error recovery
  - User choice scenarios
  - Edge cases

- **[TESTING-CHECKLIST.md](./TESTING-CHECKLIST.md)** - Quick reference checklist for rapid testing sessions

- **[TEST-RESULTS-TEMPLATE.md](./TEST-RESULTS-TEMPLATE.md)** - Template for documenting test results and sign-off

---

## Pre-Publishing Tests

### 1. Verify Setup

```bash
npm run verify-publish
```

**Expected output:**
```
✅ All checks passed! You are ready to publish releases.
```

**If errors occur:**
- Fix each error listed
- Re-run verification
- Don't proceed until all checks pass

### 2. Test Local Build

```bash
npm run dist-win
```

**Verify:**
- [ ] Build completes without errors
- [ ] `release/` directory created
- [ ] Installer file exists: `VCHome-Hospital-Setup-1.0.X.exe`
- [ ] Blockmap file exists: `VCHome-Hospital-Setup-1.0.X.exe.blockmap`
- [ ] Update manifest exists: `release/latest.yml`

**Check file sizes:**
```cmd
dir release\*.exe
```

Expected size: ~80-100 MB

### 3. Test Installer Locally

**On a test machine:**

1. Copy installer to test machine
2. Run installer
3. Complete installation
4. Launch application
5. Verify all features work:
   - [ ] Login works
   - [ ] Patient portal loads
   - [ ] Staff portal loads
   - [ ] Database connection works
   - [ ] No console errors

---

## Publishing Tests

### Test 1: Draft Release (Recommended First Test)

#### Step 1: Create Draft

```bash
npm run publish-draft
```

#### Step 2: Verify on GitHub

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Check draft release appears
3. Verify files uploaded:
   - [ ] `VCHome-Hospital-Setup-1.0.X.exe`
   - [ ] `VCHome-Hospital-Setup-1.0.X.exe.blockmap`
   - [ ] `latest.yml`

#### Step 3: Download and Test

1. Download installer from draft release
2. Install on test machine
3. Verify application works

#### Step 4: Publish or Delete

- **If successful**: Click "Publish release"
- **If issues found**: Click "Delete" and fix issues

### Test 2: Full Release

#### Step 1: Update Version

Edit `package.json`:
```json
{
  "version": "1.0.7"
}
```

#### Step 2: Publish

```bash
npm run publish-win
```

#### Step 3: Monitor Progress

Watch for:
- [ ] Build starts
- [ ] Build completes
- [ ] Upload starts
- [ ] Upload completes
- [ ] Release created

#### Step 4: Verify Release

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Check release is published (not draft)
3. Verify all files present
4. Check download links work

---

## Auto-Update Tests

### Test 1: Update Detection

#### Setup

1. Install previous version (e.g., 1.0.6)
2. Publish new version (e.g., 1.0.7)
3. Launch old version

#### Expected Behavior

1. App starts
2. Within 5-10 seconds, update dialog appears
3. Dialog shows:
   - [ ] New version number (1.0.7)
   - [ ] Release notes
   - [ ] Download button
   - [ ] Skip button

#### Test Cases

**Test Case 1.1: User clicks "Download"**
- [ ] Progress dialog appears
- [ ] Progress bar updates (0-100%)
- [ ] Download speed shown
- [ ] Bytes transferred shown
- [ ] Download completes
- [ ] Install dialog appears

**Test Case 1.2: User clicks "Skip"**
- [ ] Dialog closes
- [ ] App continues normally
- [ ] Update check happens on next startup

### Test 2: Download Progress

#### Setup

1. Start update download
2. Monitor progress dialog

#### Expected Behavior

- [ ] Progress bar animates smoothly
- [ ] Percentage updates (0% → 100%)
- [ ] Download speed shown (e.g., "5.2 MB/s")
- [ ] Bytes transferred updates (e.g., "45 MB / 89 MB")
- [ ] Time remaining shown (if available)

#### Test Cases

**Test Case 2.1: Normal download**
- [ ] Download completes successfully
- [ ] Progress reaches 100%
- [ ] Install dialog appears

**Test Case 2.2: Slow connection**
- [ ] Progress updates even if slow
- [ ] No timeout errors
- [ ] Download eventually completes

**Test Case 2.3: Network interruption**
- [ ] Error dialog appears
- [ ] Error message is clear
- [ ] Retry option available

### Test 3: Installation

#### Setup

1. Complete download
2. Install dialog appears

#### Expected Behavior

Dialog shows:
- [ ] "Update ready to install" message
- [ ] New version number
- [ ] "Install Now" button
- [ ] "Install Later" button

#### Test Cases

**Test Case 3.1: User clicks "Install Now"**
- [ ] App quits immediately
- [ ] Installer runs
- [ ] App restarts with new version
- [ ] New version number shown in app

**Test Case 3.2: User clicks "Install Later"**
- [ ] Dialog closes
- [ ] App continues running
- [ ] Update installs on next quit

**Test Case 3.3: User quits app normally**
- [ ] App quits
- [ ] Update installs automatically
- [ ] App can be launched again
- [ ] New version number shown

### Test 4: Manual Update Check

#### Setup

1. Open app
2. Go to Settings
3. Find "Check for Updates" section

#### Expected Behavior

Section shows:
- [ ] Current version number
- [ ] "Check for Updates" button
- [ ] Last check time (if available)

#### Test Cases

**Test Case 4.1: Update available**
1. Click "Check for Updates"
2. Loading indicator appears
3. Update dialog appears
4. Shows new version info
5. Offers download

**Test Case 4.2: No update available**
1. Click "Check for Updates"
2. Loading indicator appears
3. Message: "You're up to date"
4. Shows current version

**Test Case 4.3: Check fails (offline)**
1. Disconnect internet
2. Click "Check for Updates"
3. Error message appears
4. Retry option available

### Test 5: Update History Log

#### Setup

1. Perform several update checks
2. Download an update
3. Install an update
4. Go to Settings → Update History

#### Expected Behavior

Log shows:
- [ ] All update checks
- [ ] Download events
- [ ] Install events
- [ ] Timestamps
- [ ] Version numbers
- [ ] Success/failure status

#### Test Cases

**Test Case 5.1: View history**
- [ ] All events listed
- [ ] Sorted by date (newest first)
- [ ] Clear descriptions

**Test Case 5.2: Filter history**
- [ ] Can filter by action type
- [ ] Can search by version
- [ ] Can filter by date range

---

## Error Handling Tests

### Test 1: Network Errors

#### Test Case 1.1: No Internet Connection

1. Disconnect internet
2. Launch app
3. Expected: App starts normally, no update check error shown
4. Go to Settings → Check for Updates
5. Expected: Error message with retry option

#### Test Case 1.2: Slow Connection

1. Use network throttling
2. Start update download
3. Expected: Download progresses slowly but completes

#### Test Case 1.3: Connection Lost During Download

1. Start download
2. Disconnect internet mid-download
3. Expected: Error dialog with retry option
4. Reconnect internet
5. Click retry
6. Expected: Download resumes or restarts

### Test 2: Server Errors

#### Test Case 2.1: GitHub API Rate Limit

1. Make many update checks quickly
2. Expected: Graceful error message
3. Suggests trying again later

#### Test Case 2.2: Release Not Found

1. Configure app to look for non-existent version
2. Expected: "No updates available" message

### Test 3: File Integrity Errors

#### Test Case 3.1: Corrupted Download

1. Simulate corrupted download (if possible)
2. Expected: SHA-512 verification fails
3. Error message shown
4. Retry option available

#### Test Case 3.2: Incomplete Download

1. Cancel download mid-way
2. Restart app
3. Expected: Can start download again

### Test 4: Installation Errors

#### Test Case 4.1: Insufficient Disk Space

1. Fill disk to near capacity
2. Try to download update
3. Expected: Clear error message about disk space

#### Test Case 4.2: Installer Fails

1. Simulate installer failure (if possible)
2. Expected: Error message shown
3. App continues running old version
4. Can retry installation

---

## GitHub Actions Tests

### Test 1: Tag-Triggered Release

#### Setup

```bash
git tag v1.0.7
git push origin v1.0.7
```

#### Monitor

1. Go to: https://github.com/MORADOK/VaccineHomeBot/actions
2. Watch workflow run

#### Verify

- [ ] Workflow starts automatically
- [ ] Build step completes
- [ ] Publish step completes
- [ ] Release created on GitHub
- [ ] Files uploaded correctly

### Test 2: Manual Workflow Dispatch

#### Setup

1. Go to: https://github.com/MORADOK/VaccineHomeBot/actions
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter version: 1.0.7
5. Click "Run workflow"

#### Verify

- [ ] Workflow starts
- [ ] Build completes
- [ ] Release created
- [ ] Files uploaded

### Test 3: Workflow Failure Handling

#### Test Case 3.1: Build Fails

1. Introduce build error
2. Push tag
3. Expected: Workflow fails at build step
4. No release created
5. Error clearly shown in logs

#### Test Case 3.2: Upload Fails

1. Revoke GitHub token temporarily
2. Try to publish
3. Expected: Workflow fails at publish step
4. Clear error message

---

## Performance Tests

### Test 1: Update Check Speed

**Measure:**
- Time from app start to update check complete
- Expected: < 5 seconds

### Test 2: Download Speed

**Measure:**
- Download speed for 89 MB installer
- Expected: Limited by user's connection, not app

### Test 3: Installation Speed

**Measure:**
- Time from "Install Now" to app restart
- Expected: < 30 seconds

---

## Security Tests

### Test 1: HTTPS Verification

**Verify:**
- [ ] All update checks use HTTPS
- [ ] No fallback to HTTP
- [ ] SSL certificate validated

### Test 2: File Integrity

**Verify:**
- [ ] SHA-512 checksum verified
- [ ] Corrupted files rejected
- [ ] Only signed installers accepted

### Test 3: Token Security

**Verify:**
- [ ] Token not exposed in logs
- [ ] Token not in source code
- [ ] Token not in error messages

---

## Regression Tests

Run these tests before every release:

### Core Functionality

- [ ] App starts successfully
- [ ] Login works
- [ ] Patient portal loads
- [ ] Staff portal loads
- [ ] Database operations work
- [ ] All menus accessible

### Update System

- [ ] Update check on startup
- [ ] Manual update check
- [ ] Download progress
- [ ] Installation works
- [ ] Update history logs

### UI/UX

- [ ] All dialogs display correctly
- [ ] Buttons work
- [ ] Progress bars animate
- [ ] Error messages clear
- [ ] No console errors

---

## Test Environments

### Development

- **OS**: Windows 10/11
- **Node**: 18.x
- **Network**: Fast connection
- **Purpose**: Quick testing during development

### Staging

- **OS**: Windows 10/11 (clean install)
- **Node**: Not required (testing installer)
- **Network**: Normal connection
- **Purpose**: Pre-release testing

### Production

- **OS**: Various Windows versions
- **Network**: Various speeds
- **Purpose**: Real-world testing

---

## Test Checklist

### Before Publishing

- [ ] Run `npm run verify-publish`
- [ ] Test local build
- [ ] Test installer on clean machine
- [ ] Verify all features work
- [ ] Check for console errors

### After Publishing

- [ ] Verify release on GitHub
- [ ] Test download links
- [ ] Test auto-update from previous version
- [ ] Verify update history logs
- [ ] Monitor for errors

### Weekly

- [ ] Test manual update check
- [ ] Verify update history
- [ ] Check for security updates
- [ ] Review error logs

### Monthly

- [ ] Full regression test
- [ ] Test on multiple Windows versions
- [ ] Performance testing
- [ ] Security audit

---

## Automated Testing

### Unit Tests

```bash
npm run test:run
```

**Coverage:**
- Update state management
- Progress calculation
- Error handling
- IPC communication

### Integration Tests

**Manual for now, future automation:**
- Update flow end-to-end
- Dialog interactions
- File operations

---

## Test Reporting

### Bug Report Template

```markdown
## Bug Description
[Clear description of the issue]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happened]

## Environment
- OS: Windows 10/11
- App Version: 1.0.6
- Network: [Fast/Slow/Offline]

## Logs
[Paste relevant logs]

## Screenshots
[Attach screenshots if applicable]
```

### Test Results Template

```markdown
## Test Session: [Date]

### Environment
- Tester: [Name]
- OS: Windows 10/11
- App Version: 1.0.7
- Previous Version: 1.0.6

### Tests Performed
- [x] Update detection
- [x] Download progress
- [x] Installation
- [ ] Error handling (failed)

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Additional observations]
```

---

## Quick Reference

### Test Commands

```bash
# Verify setup
npm run verify-publish

# Build locally
npm run dist-win

# Publish draft
npm run publish-draft

# Publish release
npm run publish-win

# Run tests
npm run test:run
```

### Test URLs

- Releases: https://github.com/MORADOK/VaccineHomeBot/releases
- Actions: https://github.com/MORADOK/VaccineHomeBot/actions
- Latest release: https://github.com/MORADOK/VaccineHomeBot/releases/latest

---

## Next Steps

After testing:

1. ✅ Document any issues found
2. ✅ Fix critical issues before release
3. ✅ Update test cases based on findings
4. ✅ Proceed with release if all tests pass

---

## Document History

- **Created**: 2025-11-17
- **Last Updated**: 2025-11-17
- **Version**: 1.0

For questions or improvements, please contact the development team.
