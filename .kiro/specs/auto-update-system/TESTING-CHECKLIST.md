# Auto-Update System - Testing Checklist

## Quick Reference for Manual Testing

This is a condensed checklist for quick testing sessions. For detailed instructions, see [MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md).

---

## Pre-Test Setup

- [ ] Install older version of application (e.g., v1.0.5)
- [ ] Ensure newer version is published on GitHub Releases (e.g., v1.0.7)
- [ ] Verify internet connection is working
- [ ] Have ability to disconnect/reconnect internet
- [ ] Have admin privileges for installation

---

## Test 1: Update from Old Version to New ⏱️ ~5 minutes

- [ ] Launch application (older version)
- [ ] Update dialog appears automatically
- [ ] Click "Download" button
- [ ] Progress dialog shows download progress
- [ ] Progress reaches 100%
- [ ] Install dialog appears
- [ ] Click "Install Now"
- [ ] Application quits and installs
- [ ] Application restarts on new version
- [ ] Verify version in Settings
- [ ] Check update log shows successful installation

**Critical Issues:** _______________________________________________

---

## Test 2: Offline Behavior ⏱️ ~3 minutes

- [ ] Disconnect from internet
- [ ] Launch application
- [ ] Application starts normally (no errors)
- [ ] Go to Settings → Check for Updates
- [ ] Error message appears (connection issue)
- [ ] Reconnect to internet
- [ ] Click "Retry"
- [ ] Update check succeeds

**Critical Issues:** _______________________________________________

---

## Test 3: Download Interruption ⏱️ ~4 minutes

- [ ] Start downloading update
- [ ] Disconnect internet mid-download
- [ ] Error dialog appears
- [ ] Reconnect internet
- [ ] Click "Retry" or restart app
- [ ] Download resumes/restarts
- [ ] Download completes successfully

**Critical Issues:** _______________________________________________

---

## Test 4: Install Later ⏱️ ~3 minutes

- [ ] Download update
- [ ] Click "Install Later"
- [ ] Application continues running
- [ ] Use application normally
- [ ] Quit application (File → Exit)
- [ ] Installer runs automatically
- [ ] Relaunch application
- [ ] Verify new version installed

**Critical Issues:** _______________________________________________

---

## Test 5: Skip Update ⏱️ ~2 minutes

- [ ] Launch application with update available
- [ ] Click "Skip" button
- [ ] Application continues normally
- [ ] Restart application
- [ ] Update dialog appears again (not skipped permanently)

**Critical Issues:** _______________________________________________

---

## Test 6: Manual Update Check ⏱️ ~2 minutes

### When Up to Date
- [ ] Go to Settings
- [ ] Click "Check for Updates"
- [ ] Loading indicator appears
- [ ] Message: "You're up to date!"

### When Update Available
- [ ] Go to Settings (on older version)
- [ ] Click "Check for Updates"
- [ ] Update dialog appears
- [ ] Can download and install

**Critical Issues:** _______________________________________________

---

## Test 7: Multiple Consecutive Updates ⏱️ ~8 minutes

- [ ] Install v1.0.5
- [ ] Update to v1.0.6
- [ ] Application restarts
- [ ] Update dialog appears for v1.0.7
- [ ] Update to v1.0.7
- [ ] All updates logged correctly
- [ ] No conflicts or errors

**Critical Issues:** _______________________________________________

---

## Test 8: Error Recovery ⏱️ ~5 minutes

### Insufficient Disk Space
- [ ] Fill disk to < 100MB free
- [ ] Try to download update
- [ ] Clear error message appears
- [ ] Application remains stable

### Retry After Error
- [ ] Encounter any error
- [ ] Close error dialog
- [ ] Retry update process
- [ ] Update succeeds on retry

**Critical Issues:** _______________________________________________

---

## Test 9: Edge Cases ⏱️ ~3 minutes

### Rapid Restarts
- [ ] Launch and quit application 5 times quickly
- [ ] No crashes or errors
- [ ] Application remains stable

### Update During Active Use
- [ ] Use application (view records, etc.)
- [ ] Download update
- [ ] Choose "Install Later"
- [ ] Continue working
- [ ] No data loss or interruption

**Critical Issues:** _______________________________________________

---

## Verification Checks

### Update Logs
- [ ] Open Settings → Update History
- [ ] All actions are logged
- [ ] Timestamps are correct
- [ ] Success/failure status is accurate
- [ ] Error details are present (if any)

### File Cleanup
- [ ] Check installation directory
- [ ] No leftover temporary files
- [ ] No partial downloads remaining

### Application Stability
- [ ] All features work after update
- [ ] No crashes or freezes
- [ ] Data integrity maintained
- [ ] Performance is normal

---

## Test Session Summary

**Date:** _______________  
**Tester:** _______________  
**Starting Version:** _______________  
**Target Version:** _______________  
**Environment:** _______________

### Results
- **Total Tests:** _____
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendation
- [ ] ✅ APPROVE FOR RELEASE
- [ ] ⚠️ APPROVE WITH MINOR ISSUES
- [ ] ❌ NEEDS FIXES BEFORE RELEASE

### Notes
_______________________________________________
_______________________________________________
_______________________________________________

---

## Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Update not detected | Check GitHub Releases, verify latest.yml exists |
| Download fails | Check internet, disk space, firewall |
| Installation fails | Run as admin, close all instances, check antivirus |
| Offline errors | Expected behavior, verify error message is clear |
| Progress stuck | Wait 30 seconds, check logs, retry if needed |

---

## Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Signature:** _______________

**Reviewed By:** _______________  
**Date:** _______________  
**Signature:** _______________
