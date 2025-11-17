# Error Handling Test Plan

## Test Scenarios

### 1. Network Error with Retry
**Steps:**
1. Start the application
2. Disconnect internet
3. Click "Check for Updates" in Help menu
4. Observe retry attempts (3 times)
5. Verify error dialog appears with network error message
6. Reconnect internet
7. Click "Try Again" button
8. Verify update check succeeds

**Expected Results:**
- Toast notifications show retry attempts
- Error dialog displays network error message
- Manual download button is available
- Retry button is enabled
- Logs show retry attempts

### 2. Download Integrity Verification
**Steps:**
1. Start download of an update
2. Manually corrupt the downloaded file (if possible)
3. Wait for download to complete
4. Observe integrity check failure

**Expected Results:**
- Error dialog shows integrity error
- User-friendly message about corrupted file
- Retry button is available
- Logs show integrity verification failure

### 3. Manual Download Fallback
**Steps:**
1. Trigger any error (network, permission, etc.)
2. Click "Manual Download" button in error dialog
3. Verify browser opens to GitHub releases page

**Expected Results:**
- Browser opens to correct URL
- URL points to latest release
- Error dialog closes

### 4. Permission Error
**Steps:**
1. Remove write permissions from app directory
2. Try to download update
3. Observe permission error

**Expected Results:**
- Error dialog shows permission error
- Message suggests running as administrator
- Manual download button is available
- Retry button is disabled

### 5. Disk Space Error
**Steps:**
1. Fill disk to near capacity
2. Try to download update
3. Observe disk space error

**Expected Results:**
- Error dialog shows disk space error
- Message suggests freeing up space
- Retry button is available

### 6. Error Logging
**Steps:**
1. Trigger various errors
2. Check log file at `%APPDATA%/VCHome Hospital/update-logs.json`
3. Verify all errors are logged

**Expected Results:**
- All errors logged with timestamps
- Error details include type and message
- Success status is false for errors
- Retry attempts are logged

### 7. Toast Notifications
**Steps:**
1. Trigger network error
2. Observe toast notifications during retry

**Expected Results:**
- Toast appears for each retry attempt
- Shows retry count (1/3, 2/3, 3/3)
- Displays retry message
- Auto-dismisses after 3 seconds

## Verification Checklist

- [ ] Network errors trigger retry logic
- [ ] Maximum 3 retry attempts
- [ ] 5 second delay between retries
- [ ] SHA-512 integrity verification works
- [ ] Error dialog displays correct error type
- [ ] User-friendly error messages shown
- [ ] Technical details are collapsible
- [ ] Manual download button works
- [ ] Retry button works when enabled
- [ ] Toast notifications appear
- [ ] All errors logged to file
- [ ] Log file limited to 100 entries
- [ ] IPC communication works correctly
- [ ] Error dialog closes properly
- [ ] Update dialogs close on error

## Log File Location

Windows: `%APPDATA%/VCHome Hospital/update-logs.json`

## Console Commands for Testing

### Simulate Network Error (in DevTools):
```javascript
// This would need to be implemented in the main process
window.electron.ipcRenderer.send('simulate-error', 'network');
```

### Check Current Logs:
```javascript
window.electron.ipcRenderer.invoke('get-update-logs').then(console.log);
```

### Get Update State:
```javascript
window.electron.ipcRenderer.invoke('get-update-state').then(console.log);
```

## Notes

- Some errors are difficult to simulate in testing environment
- Network errors can be simulated by disconnecting internet
- Permission errors require changing file system permissions
- Disk space errors require filling the disk
- Integrity errors require manual file corruption

## Success Criteria

✅ All error types handled gracefully
✅ User receives clear, actionable error messages
✅ Retry logic works for transient errors
✅ Manual download fallback always available
✅ All errors logged for debugging
✅ No crashes or unhandled exceptions
✅ UI remains responsive during errors
