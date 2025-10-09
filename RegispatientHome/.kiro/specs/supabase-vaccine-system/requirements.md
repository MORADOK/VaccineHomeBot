# Requirements Document

## Introduction

การพัฒนาระบบลงทะเบียนวัคซีนที่ใช้ Supabase Functions แทน webhook เดิม โดยเพิ่มความสามารถในการจัดเก็บข้อมูลและดึงข้อมูลผู้ป่วยจาก LINE ID และชื่อ เพื่อให้ระบบมีประสิทธิภาพและความยืดหยุ่นมากขึ้น

## Requirements

### Requirement 1: Database Schema และ Data Storage

**User Story:** As a hospital administrator, I want patient registration data to be stored in a structured database, so that I can manage and query patient information efficiently.

#### Acceptance Criteria

1. WHEN a patient submits registration THEN the system SHALL store patient data in Supabase database
2. WHEN storing patient data THEN the system SHALL include fields: id, patient_name, phone_number, line_user_id, created_at, updated_at
3. WHEN storing data THEN the system SHALL validate phone number format for Thai mobile numbers
4. WHEN storing data THEN the system SHALL prevent duplicate registrations based on phone number or LINE ID
5. IF duplicate registration is detected THEN the system SHALL update existing record instead of creating new one

### Requirement 2: Supabase Function Implementation

**User Story:** As a developer, I want to replace the current webhook with Supabase Functions, so that the system has better performance and maintainability.

#### Acceptance Criteria

1. WHEN frontend submits registration THEN the system SHALL call Supabase Function instead of external webhook
2. WHEN Supabase Function receives request THEN it SHALL validate input data
3. WHEN validation passes THEN the function SHALL store data in database
4. WHEN operation completes THEN the function SHALL return appropriate success/error response
5. IF validation fails THEN the function SHALL return detailed error messages

### Requirement 3: Patient Data Retrieval by LINE ID

**User Story:** As a hospital staff member, I want to retrieve patient information using LINE ID, so that I can quickly access patient records during consultation.

#### Acceptance Criteria

1. WHEN staff searches by LINE ID THEN the system SHALL return matching patient record
2. WHEN LINE ID is found THEN the system SHALL return patient_name, phone_number, registration_date
3. WHEN LINE ID is not found THEN the system SHALL return appropriate not found message
4. WHEN multiple records exist for same LINE ID THEN the system SHALL return the most recent record

### Requirement 4: Patient Data Retrieval by Name

**User Story:** As a hospital staff member, I want to search for patients by name, so that I can find patient records when LINE ID is not available.

#### Acceptance Criteria

1. WHEN staff searches by patient name THEN the system SHALL return matching patient records
2. WHEN partial name is provided THEN the system SHALL perform fuzzy search
3. WHEN multiple matches are found THEN the system SHALL return all matching records with registration dates
4. WHEN no matches are found THEN the system SHALL return appropriate not found message
5. WHEN search query is too short THEN the system SHALL require minimum 2 characters

### Requirement 5: Frontend Integration

**User Story:** As a patient, I want the registration form to work seamlessly with the new backend, so that my registration experience remains smooth.

#### Acceptance Criteria

1. WHEN patient submits form THEN the system SHALL call Supabase Function endpoint
2. WHEN registration is successful THEN the system SHALL show success message
3. WHEN registration fails THEN the system SHALL show appropriate error message
4. WHEN duplicate registration is detected THEN the system SHALL inform user that record was updated
5. IF network error occurs THEN the system SHALL provide retry option

### Requirement 6: Security และ Authentication

**User Story:** As a system administrator, I want the API to be secure and properly authenticated, so that patient data is protected.

#### Acceptance Criteria

1. WHEN accessing Supabase Functions THEN the system SHALL use proper API key authentication
2. WHEN storing sensitive data THEN the system SHALL follow data protection best practices
3. WHEN handling errors THEN the system SHALL not expose sensitive information
4. WHEN rate limiting is needed THEN the system SHALL implement appropriate throttling
5. IF unauthorized access is attempted THEN the system SHALL reject the request

### Requirement 7: Data Query Interface

**User Story:** As a hospital staff member, I want a simple interface to query patient data, so that I can efficiently manage patient records.

#### Acceptance Criteria

1. WHEN staff needs to query data THEN the system SHALL provide search interface
2. WHEN searching by LINE ID THEN the system SHALL return results within 2 seconds
3. WHEN searching by name THEN the system SHALL support Thai language search
4. WHEN displaying results THEN the system SHALL show relevant patient information clearly
5. IF no results are found THEN the system SHALL suggest alternative search methods