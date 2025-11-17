# Requirements Document

## Introduction

เพิ่มระบบอัพเดทอัตโนมัติสำหรับ Desktop Application (Electron) ที่สามารถตรวจสอบ ดาวน์โหลด และติดตั้งเวอร์ชันใหม่โดยอัตโนมัติ พร้อมแสดง Progress Bar และสถานะการดาวน์โหลด โดยไม่ต้องให้ผู้ใช้ดาวน์โหลดและติดตั้งใหม่ด้วยตนเอง

## Glossary

- **Auto-Update System**: ระบบอัพเดทอัตโนมัติที่ตรวจสอบและติดตั้งเวอร์ชันใหม่
- **electron-updater**: Library สำหรับจัดการการอัพเดทใน Electron apps
- **Update Server**: เซิร์ฟเวอร์ที่เก็บไฟล์อัพเดท (GitHub Releases)
- **Progress Bar**: แถบแสดงความคืบหน้าการดาวน์โหลด
- **Update Dialog**: หน้าต่างแจ้งเตือนและแสดงสถานะการอัพเดท

## Requirements

### Requirement 1

**User Story:** As a hospital staff member, I want the application to automatically check for updates when it starts, so that I always have the latest features and bug fixes without manual intervention.

#### Acceptance Criteria

1. WHEN THE application starts THEN THE system SHALL check for available updates from the update server
2. WHEN an update is available THEN THE system SHALL display a notification dialog with update details
3. WHEN no update is available THEN THE system SHALL start normally without showing update dialogs
4. WHEN THE update check fails THEN THE system SHALL log the error and continue starting normally
5. WHEN THE user is offline THEN THE system SHALL skip the update check and start normally

### Requirement 2

**User Story:** As a hospital staff member, I want to see a progress bar when downloading updates, so that I know how long the download will take and that the application is working properly.

#### Acceptance Criteria

1. WHEN an update is being downloaded THEN THE system SHALL display a progress dialog with download percentage
2. WHEN THE download progresses THEN THE system SHALL update the progress bar in real-time
3. WHEN THE download completes THEN THE system SHALL show a completion message
4. WHEN THE download speed is available THEN THE system SHALL display the download speed in MB/s
5. WHEN THE estimated time remaining is available THEN THE system SHALL display the time remaining

### Requirement 3

**User Story:** As a hospital staff member, I want the option to install updates immediately or postpone them, so that I can choose when to restart the application based on my workflow.

#### Acceptance Criteria

1. WHEN an update is downloaded THEN THE system SHALL prompt the user to install now or later
2. WHEN THE user chooses "Install Now" THEN THE system SHALL quit and install the update immediately
3. WHEN THE user chooses "Install Later" THEN THE system SHALL continue running and remind on next startup
4. WHEN THE update is critical THEN THE system SHALL require immediate installation
5. WHEN THE application quits normally THEN THE system SHALL install pending updates automatically

### Requirement 4

**User Story:** As a system administrator, I want update information to be logged, so that I can track update history and troubleshoot issues.

#### Acceptance Criteria

1. WHEN THE system checks for updates THEN it SHALL log the check time and result
2. WHEN an update is downloaded THEN THE system SHALL log the version and file size
3. WHEN an update is installed THEN THE system SHALL log the installation time and success status
4. WHEN an error occurs THEN THE system SHALL log detailed error information
5. WHEN THE application starts THEN THE system SHALL log the current version

### Requirement 5

**User Story:** As a hospital staff member, I want to manually check for updates from the settings menu, so that I can get the latest version without waiting for automatic checks.

#### Acceptance Criteria

1. WHEN THE user clicks "Check for Updates" in settings THEN THE system SHALL immediately check for updates
2. WHEN checking manually THEN THE system SHALL show a loading indicator
3. WHEN no update is available THEN THE system SHALL display "You are up to date" message
4. WHEN an update is available THEN THE system SHALL show update details and download option
5. WHEN THE manual check fails THEN THE system SHALL display an error message with retry option

### Requirement 6

**User Story:** As a developer, I want the update system to use GitHub Releases as the update server, so that updates are distributed reliably and securely.

#### Acceptance Criteria

1. WHEN publishing a new version THEN THE system SHALL upload release files to GitHub Releases
2. WHEN checking for updates THEN THE system SHALL query GitHub Releases API
3. WHEN downloading updates THEN THE system SHALL download from GitHub CDN
4. WHEN THE release includes release notes THEN THE system SHALL display them to users
5. WHEN THE release is marked as pre-release THEN THE system SHALL only show it to beta testers
