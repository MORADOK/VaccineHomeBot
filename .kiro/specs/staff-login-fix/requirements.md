# Requirements Document - Staff Login System Fix

## Introduction

ระบบการล๊อกอินของเจ้าหน้าที่ในปัจจุบันมีปัญหาหลักคือไม่มีข้อมูลใน user_roles table ทำให้ Supabase RPC functions ที่มีอยู่แล้วไม่สามารถทำงานได้อย่างถูกต้อง ต้องการแก้ไขเพื่อให้เจ้าหน้าที่สามารถเข้าถึงระบบได้

## Requirements

### Requirement 1: Initial Admin Setup

**User Story:** As a system administrator, I want to set up the first admin user, so that I can access the staff portal and manage other users.

#### Acceptance Criteria

1. WHEN the system is first deployed THEN there SHALL be a way to create the first admin user
2. WHEN an admin user is created THEN they SHALL have access to all staff portal features
3. WHEN the first admin logs in THEN they SHALL be able to assign roles to other users

### Requirement 2: Role Assignment System

**User Story:** As an admin, I want to assign roles to users, so that staff members can access the appropriate parts of the system.

#### Acceptance Criteria

1. WHEN an admin views the user management interface THEN they SHALL see all registered users
2. WHEN an admin selects a user THEN they SHALL be able to assign healthcare_staff or admin roles
3. WHEN a role is assigned THEN the user SHALL immediately have access to the corresponding features
4. WHEN a user registers THEN they SHALL automatically receive a 'patient' role by default

### Requirement 3: Improved Authentication Flow

**User Story:** As a staff member, I want clear feedback when I cannot access the system, so that I know what action to take.

#### Acceptance Criteria

1. WHEN a user without staff role tries to access staff portal THEN they SHALL see a clear message explaining they need staff access
2. WHEN there is an authentication error THEN the system SHALL display specific error messages
3. WHEN a user is waiting for role assignment THEN they SHALL see a pending access message
4. WHEN authentication is in progress THEN users SHALL see appropriate loading indicators

### Requirement 4: Fallback Authentication

**User Story:** As a developer, I want demo accounts to work alongside the database-driven authentication, so that development and testing can continue smoothly.

#### Acceptance Criteria

1. WHEN database authentication fails THEN the system SHALL fall back to demo accounts
2. WHEN using demo accounts THEN users SHALL have appropriate permissions
3. WHEN switching between authentication methods THEN the user experience SHALL remain consistent

### Requirement 5: Role Management Interface

**User Story:** As an admin, I want a user-friendly interface to manage user roles, so that I can efficiently control system access.

#### Acceptance Criteria

1. WHEN an admin accesses role management THEN they SHALL see a list of all users with their current roles
2. WHEN an admin wants to change a user's role THEN they SHALL be able to do so with simple clicks
3. WHEN role changes are made THEN they SHALL be logged for audit purposes
4. WHEN viewing users THEN admins SHALL see user registration date and last login information

### Requirement 6: Automatic Role Detection

**User Story:** As a system, I want to automatically assign appropriate roles based on email domains, so that staff from the hospital can get immediate access.

#### Acceptance Criteria

1. WHEN a user with @vchomehospital.co.th email registers THEN they SHALL automatically receive healthcare_staff role
2. WHEN a user with other email domains registers THEN they SHALL receive patient role
3. WHEN automatic role assignment occurs THEN it SHALL be logged in the system
4. WHEN there are conflicts in role assignment THEN manual admin approval SHALL be required