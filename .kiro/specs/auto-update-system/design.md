# Design Document

## Overview

ระบบ Auto-Update จะใช้ `electron-updater` library ซึ่งเป็น official solution สำหรับ Electron apps โดยจะตรวจสอบอัพเดทจาก GitHub Releases และดาวน์โหลดติดตั้งอัตโนมัติ พร้อมแสดง UI ที่เป็นมิตรกับผู้ใช้

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Auto Updater     │  │ Update Manager   │  │ Logger    │ │
│  │ (electron-updater│  │ (Custom Logic)   │  │ Service   │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│           │                     │                    │       │
│           └─────────────────────┴────────────────────┘       │
│                              │                               │
│                    IPC Communication                         │
│                              │                               │
├──────────────────────────────┼───────────────────────────────┤
│                    Renderer Process                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Update Dialog    │  │ Progress Dialog  │  │ Settings  │ │
│  │ Component        │  │ Component        │  │ Page      │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ GitHub Releases  │
                    │ (Update Server)  │
                    └──────────────────┘
```

## Components and Interfaces

### 1. Auto Updater Module (Main Process)

**File:** `public/auto-updater.js`

**Responsibilities:**
- Initialize electron-updater
- Check for updates on app startup
- Handle update events
- Communicate with renderer process via IPC

**Key Methods:**
```javascript
class AutoUpdater {
  initialize()
  checkForUpdates()
  downloadUpdate()
  quitAndInstall()
  
  // Event Handlers
  onUpdateAvailable(info)
  onUpdateNotAvailable(info)
  onDownloadProgress(progressObj)
  onUpdateDownloaded(info)
  onError(error)
}
```

**Configuration:**
```javascript
{
  provider: 'github',
  owner: 'MORADOK',
  repo: 'VaccineHomeBot',
  private: false,
  autoDownload: false,  // Manual download control
  autoInstallOnAppQuit: true
}
```

### 2. Update Manager (Main Process)

**File:** `public/update-manager.js`

**Responsibilities:**
- Manage update state
- Store update preferences
- Handle user choices (install now/later)
- Log update activities

**State Management:**
```javascript
{
  updateAvailable: boolean,
  updateInfo: {
    version: string,
    releaseNotes: string,
    releaseDate: string,
    files: array
  },
  downloadProgress: {
    percent: number,
    bytesPerSecond: number,
    transferred: number,
    total: number
  },
  updateDownloaded: boolean,
  error: string | null
}
```

### 3. Update Dialog Component (Renderer)

**File:** `src/components/UpdateDialog.tsx`

**UI Elements:**
- Update available notification
- Version information
- Release notes display
- Download/Skip buttons

**Props:**
```typescript
interface UpdateDialogProps {
  open: boolean;
  updateInfo: {
    version: string;
    releaseNotes: string;
    releaseDate: string;
  };
  onDownload: () => void;
  onSkip: () => void;
}
```

### 4. Progress Dialog Component (Renderer)

**File:** `src/components/UpdateProgressDialog.tsx`

**UI Elements:**
- Progress bar (0-100%)
- Download speed (MB/s)
- Bytes transferred / Total size
- Estimated time remaining
- Cancel button (optional)

**Props:**
```typescript
interface UpdateProgressDialogProps {
  open: boolean;
  progress: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  onCancel?: () => void;
}
```

### 5. Install Dialog Component (Renderer)

**File:** `src/components/UpdateInstallDialog.tsx`

**UI Elements:**
- Update ready message
- Install now / Install later buttons
- Warning about app restart

**Props:**
```typescript
interface UpdateInstallDialogProps {
  open: boolean;
  version: string;
  onInstallNow: () => void;
  onInstallLater: () => void;
}
```

### 6. Settings Integration (Renderer)

**File:** `src/pages/StaffPortalPage.tsx` (Settings Tab)

**New Section:**
- Current version display
- "Check for Updates" button
- Auto-update toggle
- Update history log

## Data Models

### Update Info
```typescript
interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  files: {
    url: string;
    size: number;
    sha512: string;
  }[];
}
```

### Download Progress
```typescript
interface DownloadProgress {
  percent: number;           // 0-100
  bytesPerSecond: number;    // Download speed
  transferred: number;       // Bytes downloaded
  total: number;            // Total file size
}
```

### Update Log Entry
```typescript
interface UpdateLogEntry {
  timestamp: string;
  action: 'check' | 'download' | 'install' | 'error';
  version?: string;
  details: string;
  success: boolean;
}
```

## IPC Communication

### Main → Renderer Events

```javascript
// Update available
ipcMain.send('update-available', updateInfo)

// Update not available
ipcMain.send('update-not-available', info)

// Download progress
ipcMain.send('download-progress', progressObj)

// Update downloaded
ipcMain.send('update-downloaded', updateInfo)

// Error occurred
ipcMain.send('update-error', error)
```

### Renderer → Main Events

```javascript
// Check for updates manually
ipcRenderer.send('check-for-updates')

// Start download
ipcRenderer.send('download-update')

// Install and restart
ipcRenderer.send('install-update')

// Skip this version
ipcRenderer.send('skip-version', version)
```

## Error Handling

### Network Errors
- Timeout after 30 seconds
- Retry up to 3 times
- Fallback to manual download link

### Download Errors
- Verify file integrity (SHA-512)
- Resume interrupted downloads
- Clear cache on corruption

### Installation Errors
- Backup current version
- Rollback on failure
- Log detailed error information

## Security Considerations

### Code Signing
- Sign all release builds with valid certificate
- Verify signatures before installation
- Reject unsigned or invalid updates

### HTTPS Only
- All update checks via HTTPS
- Verify SSL certificates
- No insecure fallbacks

### Integrity Verification
- SHA-512 checksum validation
- Reject tampered files
- Log verification failures

## Testing Strategy

### Unit Tests
- Update state management
- Progress calculation
- Error handling logic

### Integration Tests
- IPC communication
- Update flow end-to-end
- Dialog interactions

### Manual Tests
- Update from old version
- Network interruption handling
- User choice scenarios
- Multiple update checks

## Implementation Phases

### Phase 1: Core Setup
1. Install electron-updater
2. Configure package.json
3. Setup GitHub Releases publishing
4. Basic update check on startup

### Phase 2: UI Components
1. Create UpdateDialog component
2. Create UpdateProgressDialog component
3. Create UpdateInstallDialog component
4. Integrate with main app

### Phase 3: Settings Integration
1. Add "Check for Updates" button
2. Display current version
3. Show update history
4. Auto-update preferences

### Phase 4: Polish & Testing
1. Add logging
2. Error handling
3. User experience improvements
4. Comprehensive testing

## Release Process

### Building for Auto-Update

```bash
# Build and package with code signing
npm run dist-win

# Publish to GitHub Releases
# - Upload .exe installer
# - Upload latest.yml (update manifest)
# - Add release notes
# - Tag with version number
```

### Update Manifest (latest.yml)

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

## User Experience Flow

### Automatic Update Check (On Startup)

```
1. App starts
2. Check for updates in background
3. If update available:
   → Show "Update Available" dialog
   → User clicks "Download"
   → Show progress dialog
   → Download completes
   → Show "Install Now/Later" dialog
4. If no update:
   → Continue normally
```

### Manual Update Check (From Settings)

```
1. User clicks "Check for Updates"
2. Show loading spinner
3. If update available:
   → Show update details
   → Offer download
4. If no update:
   → Show "You're up to date" message
```

### Install Flow

```
1. Update downloaded
2. Show "Ready to Install" dialog
3. User chooses:
   a) Install Now → Quit and install immediately
   b) Install Later → Install on next quit
```

## Configuration

### package.json

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "MORADOK",
      "repo": "VaccineHomeBot"
    },
    "win": {
      "publisherName": "VCHome Hospital",
      "signAndEditExecutable": true
    }
  }
}
```

### Environment Variables

```
GH_TOKEN=<github_personal_access_token>
```
