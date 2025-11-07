# Requirements Document

## Introduction

ระบบการคำนวณวันนัดวัคซีนในปัจจุบันมีการคำนวณที่ไม่สอดคล้องกันในหลายส่วนของแอปพลิเคชัน ทำให้เกิดความไม่แม่นยำและสับสนในการกำหนดวันนัดครั้งถัดไป โครงการนี้มีเป้าหมายเพื่อสร้างมาตรฐานการคำนวณวันนัดวัคซีนที่เป็นหนึ่งเดียว โดยยึดข้อมูลจากตาราง `vaccine_schedules` ใน Supabase เป็นแหล่งข้อมูลหลัก (Single Source of Truth)

## Glossary

- **System**: ระบบจัดการนัดหมายวัคซีนในแอปพลิเคชัน
- **vaccine_schedules**: ตารางในฐานข้อมูล Supabase ที่เก็บข้อมูลตารางวัคซีนมาตรฐาน
- **dose_intervals**: อาร์เรย์ของจำนวนวันระหว่างแต่ละโดสวัคซีน เก็บใน vaccine_schedules
- **first_dose_date**: วันที่ฉีดวัคซีนเข็มแรก
- **completed_dose**: โดสวัคซีนที่ฉีดเสร็จสิ้นแล้ว (status = 'completed')
- **next_dose_date**: วันที่คำนวณได้สำหรับการฉีดวัคซีนเข็มถัดไป
- **VaccineScheduleCalculator**: คอมโพเนนต์สำหรับเจ้าหนักงานคำนวณและติดตามวัคซีน
- **PatientNextAppointment**: คอมโพเนนต์สำหรับผู้ป่วยดูนัดหมายของตนเอง
- **NextAppointments**: คอมโพเนนต์สำหรับเจ้าหน้าที่ดูรายการนัดครั้งถัดไปทั้งหมด
- **VaccineDoseCalculator**: คอมโพเนนต์สำหรับคำนวณโดสวัคซีนอัตโนมัติ

## Requirements

### Requirement 1: Single Source of Truth

**User Story:** As a healthcare staff member, I want all vaccine appointment calculations to use the same data source, so that appointment dates are consistent across the entire system

#### Acceptance Criteria

1. WHEN the System calculates next dose dates THEN the System SHALL retrieve dose_intervals from vaccine_schedules table
2. WHEN the System processes vaccine appointments THEN the System SHALL NOT use hardcoded interval values
3. WHEN the System encounters missing vaccine_schedules data THEN the System SHALL log an error and SHALL NOT proceed with calculation
4. WHEN the System retrieves dose_intervals THEN the System SHALL parse JSON format correctly if stored as JSON
5. WHERE vaccine_schedules contains active vaccines THEN the System SHALL filter by active = true

### Requirement 2: Standardized Calculation Method

**User Story:** As a system administrator, I want a single standardized calculation method for all appointment dates, so that the system produces predictable and accurate results

#### Acceptance Criteria

1. WHEN the System calculates next dose date THEN the System SHALL use first_dose_date as the base date
2. WHEN the System determines interval days THEN the System SHALL sum all dose_intervals from index 0 to current_dose - 1
3. WHEN the System computes next appointment THEN the System SHALL add the cumulative interval days to first_dose_date
4. IF doses were given at irregular intervals THEN the System SHALL still calculate based on first_dose_date and standard intervals
5. WHEN the System displays calculated dates THEN the System SHALL show both calculated date and actual appointment date if different

### Requirement 3: Consistent Implementation Across Components

**User Story:** As a developer, I want all components to use the same calculation logic, so that maintenance is easier and bugs are reduced

#### Acceptance Criteria

1. WHEN VaccineScheduleCalculator calculates appointments THEN the System SHALL use the standardized calculation method
2. WHEN PatientNextAppointment calculates appointments THEN the System SHALL use the standardized calculation method
3. WHEN NextAppointments calculates appointments THEN the System SHALL use the standardized calculation method
4. WHEN VaccineDoseCalculator calculates appointments THEN the System SHALL use the standardized calculation method
5. WHERE calculation logic is needed THEN the System SHALL use a shared utility function

### Requirement 4: Accurate Dose Tracking

**User Story:** As a healthcare staff member, I want the system to accurately track completed doses, so that I can determine the correct next dose number

#### Acceptance Criteria

1. WHEN the System counts completed doses THEN the System SHALL query appointments table with status = 'completed'
2. WHEN the System identifies patient vaccines THEN the System SHALL group by patient_id and vaccine_type
3. WHEN the System determines current dose THEN the System SHALL count all completed appointments for that vaccine type
4. WHEN the System finds first dose date THEN the System SHALL select the earliest completed appointment date
5. IF no completed doses exist THEN the System SHALL NOT calculate next dose date

### Requirement 5: Validation and Error Handling

**User Story:** As a system user, I want clear error messages when calculations cannot be performed, so that I understand what data is missing

#### Acceptance Criteria

1. IF vaccine_schedules data is missing THEN the System SHALL display error message "ไม่พบข้อมูลวัคซีน"
2. IF first_dose_date is missing THEN the System SHALL display error message "ไม่พบข้อมูลเข็มแรก"
3. IF dose_intervals is invalid THEN the System SHALL log error and SHALL use default interval of 30 days
4. WHEN the System encounters calculation errors THEN the System SHALL log detailed error information
5. WHEN the System displays errors to users THEN the System SHALL provide actionable guidance

### Requirement 6: Logging and Debugging

**User Story:** As a developer, I want detailed logging of calculation steps, so that I can debug issues and verify correctness

#### Acceptance Criteria

1. WHEN the System calculates next dose THEN the System SHALL log vaccine_type, total_doses, and dose_intervals
2. WHEN the System processes intervals THEN the System SHALL log each interval addition with cumulative total
3. WHEN the System computes final date THEN the System SHALL log first_dose_date, total_days, and calculated_date
4. WHEN the System finds existing appointments THEN the System SHALL log comparison between calculated and scheduled dates
5. WHERE logging is implemented THEN the System SHALL use console.log with emoji prefixes for readability

### Requirement 7: Handling Existing Appointments

**User Story:** As a healthcare staff member, I want the system to respect existing scheduled appointments, so that patients are not confused by conflicting dates

#### Acceptance Criteria

1. WHEN the System finds existing future appointments THEN the System SHALL display the scheduled appointment date
2. WHEN the System displays appointments THEN the System SHALL indicate whether appointment exists or needs creation
3. IF calculated date differs from scheduled date THEN the System SHALL log both dates for comparison
4. WHEN the System creates new appointments THEN the System SHALL check for existing appointments first
5. WHERE appointment already exists THEN the System SHALL NOT create duplicate appointments

### Requirement 8: Performance and Efficiency

**User Story:** As a system user, I want appointment calculations to be fast, so that I can work efficiently

#### Acceptance Criteria

1. WHEN the System loads vaccine schedules THEN the System SHALL cache results for reuse
2. WHEN the System processes multiple patients THEN the System SHALL batch database queries where possible
3. WHEN the System calculates appointments THEN the System SHALL complete within 2 seconds for up to 100 patients
4. WHEN the System queries appointments THEN the System SHALL use appropriate database indexes
5. WHERE calculations are repeated THEN the System SHALL memoize results when appropriate

### Requirement 9: Data Integrity

**User Story:** As a healthcare administrator, I want calculation results to be accurate and verifiable, so that patient care is not compromised

#### Acceptance Criteria

1. WHEN the System calculates next dose date THEN the System SHALL verify the result is after first_dose_date
2. WHEN the System determines completion status THEN the System SHALL verify current_dose against total_doses
3. IF calculated date is in the past THEN the System SHALL flag as overdue
4. WHEN the System saves calculations THEN the System SHALL include source data for audit trail
5. WHERE data inconsistencies are detected THEN the System SHALL alert administrators

### Requirement 10: Testing and Verification

**User Story:** As a quality assurance tester, I want to verify calculation accuracy, so that I can ensure system reliability

#### Acceptance Criteria

1. WHEN the System is tested THEN test cases SHALL cover all vaccine types in vaccine_schedules
2. WHEN calculations are verified THEN test data SHALL include edge cases like irregular intervals
3. WHEN the System is validated THEN results SHALL be compared against manual calculations
4. WHERE bugs are found THEN the System SHALL include regression tests
5. WHEN the System is deployed THEN calculation accuracy SHALL be verified in production
