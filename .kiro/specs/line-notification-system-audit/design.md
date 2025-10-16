# Design Document

## Overview

This design document outlines a comprehensive audit and testing system for the LINE notification infrastructure. The system will perform deep inspection of all notification components, validate functionality, measure performance, and generate detailed reports on the health and effectiveness of the LINE notification system.

## Architecture

### Current System Analysis

The notification system consists of multiple interconnected components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINE Notification Ecosystem                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Auto Vaccine    │  │ Manual Trigger  │  │ Notification    │ │
│  │ Notifications   │  │ System          │  │ Processor       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Send LINE       │  │ Database        │  │ LINE API        │ │
│  │ Message         │  │ Tables          │  │ Integration     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Enhanced Audit Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINE Notification Audit System               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ System Health   │  │ Message         │  │ Performance     │ │
│  │ Checker         │  │ Validator       │  │ Monitor         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Configuration   │  │ End-to-End      │  │ Report          │ │
│  │ Auditor         │  │ Tester          │  │ Generator       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. System Health Checker

**Purpose:** Validate all system components and dependencies

**Interface:**
```typescript
interface SystemHealthResult {
  database: {
    connectivity: boolean;
    tables: {
      appointments: TableHealthStatus;
      appointment_notifications: TableHealthStatus;
      notification_jobs: TableHealthStatus;
    };
    performance: {
      queryTime: number;
      connectionPool: number;
    };
  };
  lineApi: {
    connectivity: boolean;
    authentication: boolean;
    rateLimits: {
      current: number;
      limit: number;
      resetTime: Date;
    };
  };
  environment: {
    requiredVars: EnvironmentVariableStatus[];
    configuration: ConfigurationStatus;
  };
}

interface TableHealthStatus {
  exists: boolean;
  recordCount: number;
  lastUpdated: Date;
  indexHealth: boolean;
}
```

**Key Methods:**
```typescript
class SystemHealthChecker {
  async checkDatabaseHealth(): Promise<DatabaseHealthResult>;
  async checkLineApiHealth(): Promise<LineApiHealthResult>;
  async checkEnvironmentConfiguration(): Promise<EnvironmentHealthResult>;
  async validateTableStructures(): Promise<TableValidationResult>;
  async measureSystemPerformance(): Promise<PerformanceMetrics>;
}
```

### 2. Message Validator

**Purpose:** Validate message content, structure, and formatting

**Interface:**
```typescript
interface MessageValidationResult {
  richMessage: {
    structure: boolean;
    requiredFields: boolean;
    uriValidation: boolean;
    imageUrls: boolean;
    textEncoding: boolean;
  };
  fallbackMessage: {
    formatting: boolean;
    completeness: boolean;
    encoding: boolean;
    length: boolean;
  };
  branding: {
    hospitalLogo: boolean;
    hospitalName: boolean;
    contactInfo: boolean;
    colors: boolean;
  };
}
```

**Key Methods:**
```typescript
class MessageValidator {
  async validateRichMessageStructure(message: FlexMessage): Promise<ValidationResult>;
  async validateFallbackMessage(message: string): Promise<ValidationResult>;
  async validateBrandingElements(message: any): Promise<BrandingValidationResult>;
  async validateUriSafety(uris: string[]): Promise<UriValidationResult>;
  async validateThaiLanguageSupport(content: string): Promise<LanguageValidationResult>;
}
```

### 3. Performance Monitor

**Purpose:** Measure system performance and identify bottlenecks

**Interface:**
```typescript
interface PerformanceMetrics {
  responseTime: {
    database: number;
    lineApi: number;
    messageGeneration: number;
    endToEnd: number;
  };
  throughput: {
    messagesPerMinute: number;
    appointmentsProcessed: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };
}
```

### 4. Configuration Auditor

**Purpose:** Validate system configuration and environment setup

**Interface:**
```typescript
interface ConfigurationAuditResult {
  environmentVariables: {
    required: EnvironmentVariableCheck[];
    optional: EnvironmentVariableCheck[];
    security: SecurityConfigCheck[];
  };
  lineConfiguration: {
    channelAccessToken: boolean;
    webhookUrl: boolean;
    permissions: string[];
  };
  databaseConfiguration: {
    connectionString: boolean;
    poolSettings: boolean;
    migrations: boolean;
  };
}
```

### 5. End-to-End Tester

**Purpose:** Test complete notification workflow from start to finish

**Interface:**
```typescript
interface EndToEndTestResult {
  appointmentDetection: {
    tomorrowAppointments: number;
    overdueAppointments: number;
    dataAccuracy: boolean;
  };
  messageGeneration: {
    richMessageCreated: boolean;
    fallbackMessageCreated: boolean;
    contentAccuracy: boolean;
  };
  delivery: {
    lineApiCalled: boolean;
    responseReceived: boolean;
    deliveryConfirmed: boolean;
  };
  logging: {
    notificationRecorded: boolean;
    statusUpdated: boolean;
    auditTrail: boolean;
  };
}
```

## Data Models

### Audit Log Structure
```typescript
interface NotificationAuditLog {
  id: string;
  audit_type: 'system_health' | 'message_validation' | 'performance' | 'end_to_end';
  audit_timestamp: Date;
  results: object;
  recommendations: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  created_by: string;
}
```

### Performance Metrics Storage
```typescript
interface PerformanceLog {
  id: string;
  metric_type: string;
  metric_value: number;
  measurement_time: Date;
  context: object;
  threshold_exceeded: boolean;
}
```

### Test Results Storage
```typescript
interface TestExecutionLog {
  id: string;
  test_suite: string;
  test_name: string;
  status: 'passed' | 'failed' | 'warning';
  execution_time: number;
  details: object;
  error_message?: string;
  executed_at: Date;
}
```

## Error Handling

### System Health Errors
- **Database Connection Failures:** Retry with exponential backoff, log detailed connection errors
- **LINE API Unavailability:** Check service status, validate credentials, test with minimal payload
- **Configuration Issues:** Provide specific guidance for missing or invalid settings

### Message Validation Errors
- **Rich Message Structure Errors:** Validate against LINE Flex Message schema, provide specific field errors
- **URI Validation Failures:** Check URL accessibility, validate schemes, test action functionality
- **Encoding Issues:** Detect character encoding problems, validate Thai language support

### Performance Issues
- **Slow Response Times:** Identify bottlenecks, suggest optimization strategies
- **High Error Rates:** Analyze error patterns, recommend fixes
- **Resource Constraints:** Monitor memory and CPU usage, suggest scaling options

## Testing Strategy

### Comprehensive Test Suite

#### 1. Unit Testing
- Individual component validation
- Message format testing
- Configuration validation
- Error handling verification

#### 2. Integration Testing
- Database connectivity and queries
- LINE API integration
- Message delivery workflow
- Logging and audit trail

#### 3. Performance Testing
- Load testing with multiple appointments
- Stress testing with high message volume
- Response time measurement
- Resource usage monitoring

#### 4. End-to-End Testing
- Complete notification workflow
- Real appointment data processing
- Actual LINE message delivery (test environment)
- Full audit trail verification

### Test Data Management

```typescript
interface TestDataSet {
  appointments: {
    tomorrow: AppointmentData[];
    overdue: AppointmentData[];
    invalid: AppointmentData[];
  };
  lineUsers: {
    valid: LineUserData[];
    invalid: LineUserData[];
    blocked: LineUserData[];
  };
  configurations: {
    valid: ConfigurationSet;
    invalid: ConfigurationSet;
    minimal: ConfigurationSet;
  };
}
```

## Security Considerations

### Audit Security
- Secure storage of audit logs with encryption
- Access control for audit results and reports
- Sanitization of sensitive data in logs
- Compliance with healthcare data protection requirements

### Testing Security
- Use test LINE accounts and channels
- Avoid sending notifications to real patients during testing
- Secure handling of test data and credentials
- Proper cleanup of test artifacts

### Configuration Security
- Validation of environment variable security
- Detection of exposed credentials or tokens
- Verification of secure communication channels
- Assessment of access control configurations

## Implementation Phases

### Phase 1: Core Audit Infrastructure
1. Create audit database tables and schemas
2. Implement system health checker
3. Build configuration auditor
4. Set up basic logging and reporting

### Phase 2: Message Validation System
1. Implement Rich Message structure validation
2. Create fallback message validator
3. Build branding compliance checker
4. Add Thai language support validation

### Phase 3: Performance Monitoring
1. Implement performance metrics collection
2. Create bottleneck detection system
3. Build resource usage monitoring
4. Add performance reporting dashboard

### Phase 4: End-to-End Testing
1. Create comprehensive test data sets
2. Implement full workflow testing
3. Build automated test execution
4. Create detailed test reporting

### Phase 5: Reporting and Analytics
1. Build comprehensive audit reports
2. Create performance analytics dashboard
3. Implement alerting for critical issues
4. Add trend analysis and recommendations

## Monitoring and Alerting

### Real-time Monitoring
- System health status dashboard
- Performance metrics visualization
- Error rate tracking
- Notification delivery success rates

### Automated Alerting
- Critical system failures
- Performance threshold breaches
- High error rates
- Configuration issues

### Reporting Schedule
- Daily performance summaries
- Weekly audit reports
- Monthly trend analysis
- Quarterly system health assessments