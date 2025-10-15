# Design Document

## Overview

This design document outlines the enhancement of the hospital notification system to include comprehensive branding with the hospital logo and "รพ.โฮม" name. The system will be updated to provide consistent, professional, and recognizable communications across all notification channels while maintaining configurability for future updates.

## Architecture

### Current System Analysis
The notification system currently exists in `supabase/functions/auto-vaccine-notifications/index.ts` and already includes:
- LINE Rich Message support with basic hospital branding
- Fallback text message functionality
- Appointment reminder and overdue notification workflows
- Hospital logo integration using lovable-uploads URL

### Enhanced Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification System                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Branding Config │  │ Message Builder │  │ Delivery    │ │
│  │ Manager         │  │ Service         │  │ Service     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Rich Message    │  │ Fallback Text   │  │ Audit       │ │
│  │ Templates       │  │ Templates       │  │ Logger      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Branding Configuration Manager

**Purpose:** Centralized management of hospital branding assets and information

**Interface:**
```typescript
interface HospitalBrandingConfig {
  logoUrl: string;
  hospitalName: {
    full: string;        // "โรงพยาบาลโฮม"
    abbreviated: string; // "รพ.โฮม"
    english: string;     // "VCHome Hospital"
  };
  contactInfo: {
    phone: string;       // "038-511-123"
    mapQuery: string;    // "โรงพยาบาลโฮม"
  };
  colors: {
    primary: string;     // "#1DB446"
    warning: string;     // "#FF6B6B"
    background: string;  // "#F8F9FA"
  };
}
```

**Environment Variables:**
```
# Hospital Branding Configuration
HOSPITAL_LOGO_URL=https://your-domain.com/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png
HOSPITAL_NAME_FULL=โรงพยาบาลโฮม
HOSPITAL_NAME_ABBREVIATED=รพ.โฮม
HOSPITAL_NAME_ENGLISH=VCHome Hospital
HOSPITAL_PHONE=038-511-123
HOSPITAL_MAP_QUERY=โรงพยาบาลโฮม
```

### 2. Enhanced Rich Message Templates

**Reminder Message Template:**
- Header with hospital logo and dual-language name display
- Professional medical color scheme
- Clear appointment details with Thai labels
- Hospital location prominently displayed
- Action buttons for contact and map navigation

**Overdue Message Template:**
- Warning-styled header with logo
- Urgent color scheme (red/orange tones)
- Clear indication of overdue status
- Prominent contact information for rescheduling

### 3. Fallback Text Message Templates

**Structure:**
```
🏥 [Hospital Name Full] ([Hospital Name Abbreviated])
[Message Type Icon] [Message Title]

[Patient Greeting]
[Appointment Details]
🏥 สถานที่: [Hospital Name Full]

[Action Required]
📞 ติดต่อ: [Hospital Phone]
```

### 4. Message Builder Service

**Responsibilities:**
- Load branding configuration from environment variables
- Generate Rich Messages with proper branding
- Create fallback text messages with consistent formatting
- Handle missing configuration gracefully with defaults

**Key Methods:**
```typescript
class MessageBuilder {
  private config: HospitalBrandingConfig;
  
  buildReminderRichMessage(appointment: AppointmentData): FlexMessage;
  buildOverdueRichMessage(appointment: AppointmentData): FlexMessage;
  buildReminderFallbackText(appointment: AppointmentData): string;
  buildOverdueFallbackText(appointment: AppointmentData): string;
  private loadBrandingConfig(): HospitalBrandingConfig;
}
```

## Data Models

### Enhanced Notification Log
```typescript
interface NotificationRecord {
  id: string;
  appointment_id: string;
  notification_type: 'reminder' | 'overdue';
  sent_to: string;
  line_user_id?: string;
  message_content: string;
  rich_message_content?: object;
  hospital_branding_version: string; // For audit trail
  status: 'sent' | 'failed';
  sent_at: timestamp;
  created_at: timestamp;
}
```

### Branding Audit Log
```typescript
interface BrandingAuditLog {
  id: string;
  config_version: string;
  logo_url: string;
  hospital_names: object;
  contact_info: object;
  applied_at: timestamp;
  applied_by: string;
}
```

## Error Handling

### Configuration Loading Errors
- **Missing Logo URL:** Use default hospital icon with warning log
- **Missing Hospital Names:** Use fallback values from code constants
- **Invalid Environment Variables:** Log warnings and use defaults

### Message Delivery Errors
- **Rich Message Failure:** Always send fallback text message
- **LINE API Errors:** Log detailed error information for debugging
- **Network Timeouts:** Implement retry mechanism with exponential backoff

### Graceful Degradation
```typescript
const FALLBACK_CONFIG: HospitalBrandingConfig = {
  logoUrl: '/default-hospital-logo.png',
  hospitalName: {
    full: 'โรงพยาบาลโฮม',
    abbreviated: 'รพ.โฮม',
    english: 'VCHome Hospital'
  },
  contactInfo: {
    phone: '038-511-123',
    mapQuery: 'โรงพยาบาลโฮม'
  },
  colors: {
    primary: '#1DB446',
    warning: '#FF6B6B',
    background: '#F8F9FA'
  }
};
```

## Testing Strategy

### Unit Testing
- Branding configuration loading and validation
- Message template generation with various appointment data
- Fallback mechanism when configuration is missing
- Error handling for invalid data inputs

### Integration Testing
- End-to-end notification flow with real appointment data
- LINE API integration with Rich Messages
- Database logging of notification records
- Configuration updates without service restart

### Visual Testing
- Rich Message rendering in LINE app simulator
- Logo display and aspect ratio validation
- Text formatting and Thai language support
- Color scheme consistency across message types

### Performance Testing
- Configuration loading performance
- Message generation speed with large appointment batches
- Memory usage during bulk notification processing
- Database logging performance impact

## Security Considerations

### Configuration Security
- Environment variables for sensitive branding assets
- Validation of logo URLs to prevent injection attacks
- Sanitization of hospital name inputs
- Secure storage of contact information

### Message Content Security
- Input validation for appointment data
- Prevention of script injection in Rich Messages
- Secure handling of patient personal information
- Audit logging for compliance requirements

## Implementation Phases

### Phase 1: Configuration Enhancement
1. Add environment variables for hospital branding
2. Create branding configuration loader
3. Implement fallback mechanisms
4. Add configuration validation

### Phase 2: Message Template Updates
1. Enhance Rich Message templates with new branding
2. Update fallback text message formats
3. Implement consistent styling and colors
4. Add proper Thai language support

### Phase 3: Logging and Monitoring
1. Enhanced notification logging with branding info
2. Audit trail for configuration changes
3. Performance monitoring for message generation
4. Error tracking and alerting

### Phase 4: Testing and Validation
1. Comprehensive unit and integration testing
2. Visual validation of message rendering
3. Performance testing with production data
4. Security audit and penetration testing