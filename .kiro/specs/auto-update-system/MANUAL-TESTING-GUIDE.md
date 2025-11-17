# Manual Testing Guide - Auto-Update System

## Overview

This guide provides step-by-step instructions for manually testing the auto-update system in various real-world scenarios. These tests should be performed before releasing new versions to ensure the update mechanism works correctly.

## Prerequisites

- Two or more versions of the application built and published to GitHub Releases
- Test environment with internet connection
- Test environment that can be disconnected from internet
- Admin access to install/uninstall the application

---

## Test Scenario 1: Update from Old Version to New

**Objective:** Verify that the application can successfully detect, download, and install updates from an older version to a newer version.

### Setup
1. Install an older version of the application (e.g., v1.0.5)
2. Ensure a newer version is published on GitHub Releases (e.g., v1.0.7)
3. Ensure internet connection is active

### Test Steps

#### 1.1 Automatic Update Check on Startup
1. Launch the application (v1.0.5)
2. Wait for the automatic update check (should happen within 5 seconds)
3. **Expected Result:** 
   - Update dialog appears showing new version information
   - Dialog displays version number (v1.0.7)
   - Release notes are visible
   - "Download" and "Skip" buttons are present

#### 1.2 Download Update
1. Click the "Download" button
2. **Expected Result:**
   - Update dialog closes
   - Progress dialog appears
   - Progress bar shows 0% initially
   - Download speed (MB/s) is displayed
   - Bytes transferred and total size are shown
   - Progress updates in real-time

#### 1.3 Monitor Download Progress
1. Observe the download progress dialog
2. **Expected Result:**
   - Progress bar moves smoothly from 0% to 100%
   - Download speed is reasonable (based on connection)
   - Estimated time remaining decreases
   - No errors or freezing

#### 1.4 Install Update
1. Wait for download to complete
2. **Expected Result:**
   - Progress dialog closes
   - Install dialog appears
   - Dialog shows "Update Ready to Install" message
   - Version number is displayed
   - "Install Now" and "Install Later" buttons are present

#### 1.5 Install Now
1. Click "Install Now" button
2. **Expected Result:**
   - Application quits immediately
   - Installer runs automatically
   - Application restarts with new version (v1.0.7)

#### 1.6 Verify Update
1. Check the application version in Settings
2. Check update history log
3. **Expected Result:**
   - Version shows v1.0.7
   - Update log shows successful installation
   - All features work correctly

### Pass Criteria
- ✅ Update detected automatically
- ✅ Download completed successfully
- ✅ Installation completed without errors
- ✅ Application runs on new version
- ✅ Update logged correctly

---

## Test Scenario 2: Offline Behavior

**Objective:** Verify that the application handles offline scenarios gracefully without blocking startup or causing errors.

### Setup
1. Install the application (any version)
2. Disconnect from internet (disable Wi-Fi/Ethernet)

### Test Steps

#### 2.1 Startup Without Internet
1. Launch the application while offline
2. **Expected Result:**
   - Application starts normally
   - No error dialogs appear
   - No indefinite loading or hanging
   - Application is fully functional
   - Update check fails silently in background

#### 2.2 Manual Update Check While Offline
1. Navigate to Settings
2. Click "Check for Updates" button
3. **Expected Result:**
   - Loading indicator appears briefly
   - Error message displays: "Unable to check for updates. Please check your internet connection."
   - "Retry" button is available
   - Application remains functional

#### 2.3 Reconnect and Retry
1. Reconnect to internet
2. Click "Retry" button in Settings
3. **Expected Result:**
   - Update check succeeds
   - Shows either "You're up to date" or update available dialog
   - No residual errors from previous offline attempt

#### 2.4 Download Interruption
1. Start downloading an update
2. Disconnect internet mid-download
3. **Expected Result:**
   - Download pauses or fails
   - Error dialog appears: "Download failed. Please check your connection."
   - "Retry" button is available
   - Application remains stable

#### 2.5 Resume Download
1. Reconnect to internet
2. Click "Retry" or restart application
3. **Expected Result:**
   - Download resumes or restarts
   - Progress continues from 0% or resumes from last point
   - Download completes successfully

### Pass Criteria
- ✅ Application starts normally when offline
- ✅ No crashes or hangs due to network issues
- ✅ Clear error messages for offline scenarios
- ✅ Retry mechanism works correctly
- ✅ Download can be resumed after reconnection

---

## Test Scenario 3: Multiple Consecutive Updates

**Objective:** Verify that the application can handle multiple updates in sequence without issues.

### Setup
1. Prepare three versions: v1.0.5, v1.0.6, v1.0.7
2. Publish all versions to GitHub Releases
3. Install v1.0.5

### Test Steps

#### 3.1 First Update (v1.0.5 → v1.0.6)
1. Launch application (v1.0.5)
2. Download and install update to v1.0.6
3. Choose "Install Now"
4. **Expected Result:**
   - Application updates to v1.0.6
   - Application restarts successfully

#### 3.2 Second Update (v1.0.6 → v1.0.7)
1. Application should auto-check for updates on restart
2. **Expected Result:**
   - Update dialog appears for v1.0.7
   - Can download and install second update
   - No conflicts or errors from previous update

#### 3.3 Install Later Scenario
1. Launch application (v1.0.5)
2. Download update to v1.0.6
3. Click "Install Later"
4. **Expected Result:**
   - Application continues running on v1.0.5
   - Update is queued for next quit

#### 3.4 Quit and Auto-Install
1. Quit the application normally (File → Exit or close window)
2. **Expected Result:**
   - Application quits
   - Installer runs automatically
   - Application can be launched again on v1.0.6

#### 3.5 Verify Update History
1. Check update history log in Settings
2. **Expected Result:**
   - All updates are logged
   - Timestamps are correct
   - No duplicate or missing entries

### Pass Criteria
- ✅ Multiple updates work in sequence
- ✅ "Install Later" queues update correctly
- ✅ Auto-install on quit works
- ✅ No conflicts between consecutive updates
- ✅ Update history is accurate

---

## Test Scenario 4: Error Recovery

**Objective:** Verify that the application can recover from various error conditions during the update process.

### Setup
1. Install the application
2. Prepare to simulate various error conditions

### Test Steps

#### 4.1 Corrupted Download
1. Start downloading an update
2. Simulate corruption (if possible, or test with intentionally corrupted file)
3. **Expected Result:**
   - SHA-512 verification fails
   - Error dialog appears: "Update file verification failed"
   - Option to retry download
   - Application remains stable

#### 4.2 Insufficient Disk Space
1. Fill up disk space (leave < 100MB free)
2. Try to download an update
3. **Expected Result:**
   - Download fails with clear error message
   - Error dialog: "Insufficient disk space to download update"
   - Application continues running
   - No partial files left behind

#### 4.3 GitHub API Rate Limit
1. Make multiple rapid update checks (> 60 in an hour)
2. **Expected Result:**
   - Rate limit error is handled gracefully
   - Error message: "Too many requests. Please try again later."
   - Application remains functional
   - Retry works after waiting period

#### 4.4 Invalid Update Manifest
1. Test with corrupted latest.yml (if possible in test environment)
2. **Expected Result:**
   - Error is caught and logged
   - User sees: "Unable to check for updates"
   - Application doesn't crash
   - Manual download link provided (if available)

#### 4.5 Installation Failure
1. Try to install update without admin privileges (if applicable)
2. **Expected Result:**
   - Installation fails with clear error
   - Error dialog: "Installation failed. Please run as administrator."
   - Application rolls back to current version
   - No broken state

#### 4.6 Recovery After Error
1. After any error, close error dialog
2. Try update process again
3. **Expected Result:**
   - Can retry update process
   - Previous error doesn't block new attempts
   - Update succeeds on retry
   - Error is logged but doesn't persist

### Pass Criteria
- ✅ All errors are caught and handled gracefully
- ✅ Clear error messages for each scenario
- ✅ Application never crashes or enters broken state
- ✅ Retry mechanism works after errors
- ✅ Errors are logged for troubleshooting

---

## Test Scenario 5: User Choice Scenarios

**Objective:** Verify that user choices are respected and handled correctly.

### Test Steps

#### 5.1 Skip Update
1. Launch application with update available
2. Click "Skip" button
3. **Expected Result:**
   - Update dialog closes
   - Application continues normally
   - Update check happens again on next startup

#### 5.2 Cancel Download (if implemented)
1. Start downloading update
2. Click "Cancel" button (if available)
3. **Expected Result:**
   - Download stops
   - Progress dialog closes
   - Partial download is cleaned up
   - Can start download again later

#### 5.3 Install Later
1. Download update
2. Click "Install Later"
3. Continue using application
4. Quit application
5. **Expected Result:**
   - Update installs on quit
   - Application restarts with new version

#### 5.4 Manual Check - No Update
1. Go to Settings
2. Click "Check for Updates" when already on latest version
3. **Expected Result:**
   - Loading indicator appears
   - Message: "You're up to date!"
   - Current version number displayed

#### 5.5 Manual Check - Update Available
1. Go to Settings (on older version)
2. Click "Check for Updates"
3. **Expected Result:**
   - Update dialog appears
   - Same flow as automatic check
   - Can download and install

### Pass Criteria
- ✅ User choices are respected
- ✅ Skip doesn't block future checks
- ✅ Install Later works correctly
- ✅ Manual check works as expected
- ✅ No forced updates (unless critical)

---

## Test Scenario 6: Edge Cases

**Objective:** Test unusual but possible scenarios.

### Test Steps

#### 6.1 Rapid Restarts
1. Launch application
2. Quit immediately
3. Repeat 5 times quickly
4. **Expected Result:**
   - No crashes or errors
   - Update checks don't pile up
   - Application remains stable

#### 6.2 Update During Active Use
1. Start using application (e.g., viewing patient records)
2. Update becomes available
3. Download update
4. Choose "Install Later"
5. Continue working
6. **Expected Result:**
   - No data loss
   - No interruption to workflow
   - Update installs on next quit

#### 6.3 Multiple Instances (if allowed)
1. Launch application
2. Try to launch second instance
3. **Expected Result:**
   - Second instance is prevented OR
   - Both instances handle updates independently
   - No conflicts or corruption

#### 6.4 Downgrade Prevention
1. Try to install older version over newer version (if possible)
2. **Expected Result:**
   - Downgrade is prevented
   - Warning message appears
   - Current version is preserved

### Pass Criteria
- ✅ Edge cases handled gracefully
- ✅ No data corruption
- ✅ No crashes in unusual scenarios
- ✅ Appropriate warnings for invalid operations

---

## Logging and Verification

### Check Update Logs
After each test scenario, verify:

1. **Log Location:** Check update history in Settings
2. **Log Contents:** Should include:
   - Timestamp of each action
   - Action type (check, download, install, error)
   - Version numbers
   - Success/failure status
   - Error details (if any)

### Verify File Integrity
1. Check installation directory
2. Verify no leftover temporary files
3. Confirm proper cleanup after updates

---

## Test Results Template

Use this template to document test results:

```
## Test Session: [Date]
**Tester:** [Name]
**Application Version:** [Starting Version]
**Target Version:** [Update Version]
**Environment:** [Windows 10/11, etc.]

### Scenario 1: Update from Old to New
- [ ] Automatic detection: PASS/FAIL
- [ ] Download: PASS/FAIL
- [ ] Installation: PASS/FAIL
- [ ] Verification: PASS/FAIL
- **Notes:** [Any issues or observations]

### Scenario 2: Offline Behavior
- [ ] Offline startup: PASS/FAIL
- [ ] Manual check offline: PASS/FAIL
- [ ] Download interruption: PASS/FAIL
- [ ] Resume download: PASS/FAIL
- **Notes:** [Any issues or observations]

### Scenario 3: Multiple Updates
- [ ] First update: PASS/FAIL
- [ ] Second update: PASS/FAIL
- [ ] Install later: PASS/FAIL
- [ ] Auto-install on quit: PASS/FAIL
- **Notes:** [Any issues or observations]

### Scenario 4: Error Recovery
- [ ] Corrupted download: PASS/FAIL
- [ ] Disk space: PASS/FAIL
- [ ] Rate limit: PASS/FAIL
- [ ] Installation failure: PASS/FAIL
- [ ] Recovery: PASS/FAIL
- **Notes:** [Any issues or observations]

### Scenario 5: User Choices
- [ ] Skip update: PASS/FAIL
- [ ] Install later: PASS/FAIL
- [ ] Manual check: PASS/FAIL
- **Notes:** [Any issues or observations]

### Scenario 6: Edge Cases
- [ ] Rapid restarts: PASS/FAIL
- [ ] Update during use: PASS/FAIL
- [ ] Multiple instances: PASS/FAIL
- **Notes:** [Any issues or observations]

### Overall Assessment
- **Total Tests:** [X]
- **Passed:** [X]
- **Failed:** [X]
- **Blocked:** [X]
- **Critical Issues:** [List any critical issues]
- **Recommendation:** APPROVE FOR RELEASE / NEEDS FIXES
```

---

## Troubleshooting Common Issues

### Issue: Update Not Detected
**Possible Causes:**
- GitHub Releases not properly configured
- latest.yml not generated or uploaded
- Version number format incorrect
- Network connectivity issues

**Debug Steps:**
1. Check GitHub Releases page manually
2. Verify latest.yml exists and is accessible
3. Check application logs for errors
4. Verify version number in package.json

### Issue: Download Fails
**Possible Causes:**
- Network interruption
- Insufficient disk space
- Firewall blocking download
- Corrupted release file

**Debug Steps:**
1. Check internet connection
2. Verify disk space
3. Check firewall settings
4. Try downloading release file manually

### Issue: Installation Fails
**Possible Causes:**
- Insufficient permissions
- Antivirus blocking installer
- Application still running
- Corrupted installer file

**Debug Steps:**
1. Run as administrator
2. Temporarily disable antivirus
3. Ensure all instances are closed
4. Verify installer file integrity

---

## Pre-Release Checklist

Before releasing a new version, ensure:

- [ ] All manual test scenarios pass
- [ ] Update logs are working correctly
- [ ] Error messages are clear and helpful
- [ ] No crashes or data loss in any scenario
- [ ] Offline behavior is graceful
- [ ] User choices are respected
- [ ] GitHub Releases is properly configured
- [ ] Code signing certificate is valid
- [ ] Release notes are accurate and complete
- [ ] Version numbers are correct everywhere

---

## Notes for Testers

1. **Take Screenshots:** Document each step with screenshots for bug reports
2. **Record Timing:** Note how long downloads and installations take
3. **Test on Clean System:** At least one test should be on a fresh Windows installation
4. **Test with Real Data:** Use application with actual patient data (test data) during updates
5. **Document Everything:** Even small issues should be noted
6. **Test Multiple Times:** Run critical scenarios at least twice to ensure consistency

---

## Success Criteria

The auto-update system is ready for production when:

✅ All test scenarios pass consistently
✅ No critical or high-priority bugs remain
✅ Error handling is comprehensive and user-friendly
✅ Update process is smooth and intuitive
✅ No data loss or corruption in any scenario
✅ Offline behavior is acceptable
✅ Logging provides adequate troubleshooting information
✅ User experience is professional and polished

---

## Contact

If you encounter issues during testing:
- Document the issue with screenshots and logs
- Note the exact steps to reproduce
- Check update logs in Settings
- Report to development team with all details
