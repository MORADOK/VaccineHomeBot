# Requirements Document

## Introduction

ปรับปรุงระบบการแจ้งเตือนการนัดหมายฉีดวัคซีนให้มีการแสดงโลโก้โรงพยาบาลและชื่อ "รพ.โฮม" อย่างสมบูรณ์และสอดคล้องกันทุกช่องทางการสื่อสار รวมถึงการปรับปรุงการแสดงผลให้เป็นมาตรฐานเดียวกันทั้งในข้อความ LINE Rich Message และข้อความ fallback

## Requirements

### Requirement 1

**User Story:** As a patient, I want to see the hospital logo and name "รพ.โฮม" clearly in all notification messages, so that I can easily identify the source and trust the authenticity of the appointment reminders.

#### Acceptance Criteria

1. WHEN a notification is sent THEN the system SHALL display the hospital logo image prominently in the message header
2. WHEN a notification is sent THEN the system SHALL show "โรงพยาบาลโฮม" as the primary hospital name
3. WHEN a notification is sent THEN the system SHALL include "รพ.โฮม" as the abbreviated hospital name for easy recognition
4. WHEN a Rich Message is displayed THEN the system SHALL show the logo with proper aspect ratio and sizing
5. IF the Rich Message fails to load THEN the fallback text message SHALL include the hospital name clearly

### Requirement 2

**User Story:** As a healthcare administrator, I want consistent hospital branding across all notification channels, so that patients receive professional and recognizable communications from our facility.

#### Acceptance Criteria

1. WHEN sending LINE Rich Messages THEN the system SHALL use the official hospital logo from the configured image URL
2. WHEN sending fallback text messages THEN the system SHALL include "โรงพยาบาลโฮม (รพ.โฮม)" in the message header
3. WHEN displaying hospital location information THEN the system SHALL consistently use "โรงพยาบาลโฮม" as the location name
4. WHEN creating notification records THEN the system SHALL log the hospital branding information for audit purposes

### Requirement 3

**User Story:** As a patient receiving overdue appointment notifications, I want to clearly see the hospital branding and contact information, so that I can easily identify and contact the correct healthcare facility.

#### Acceptance Criteria

1. WHEN an overdue notification is sent THEN the system SHALL display the standard hospital logo without color modifications
2. WHEN an overdue notification is sent THEN the system SHALL include "โรงพยาบาลโฮม" prominently in the message
3. WHEN contact information is displayed THEN the system SHALL show the hospital phone number with proper formatting
4. WHEN map links are provided THEN the system SHALL use "โรงพยาบาลโฮม" as the search query
5. WHEN vaccine names are displayed THEN the system SHALL use Thai language for all vaccine names
6. WHEN appointment dates are displayed THEN the system SHALL use Thai date format (DD/MM/BBBB) for both reminder and overdue notifications

### Requirement 4

**User Story:** As a system administrator, I want the hospital branding to be configurable and maintainable, so that updates to logos or names can be managed centrally without code changes.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL load hospital branding configuration from environment variables or config files
2. WHEN the logo URL is updated THEN all new notifications SHALL use the updated logo without requiring code deployment
3. WHEN hospital name or contact information changes THEN the system SHALL support configuration updates
4. IF branding configuration is missing THEN the system SHALL use fallback values and log appropriate warnings