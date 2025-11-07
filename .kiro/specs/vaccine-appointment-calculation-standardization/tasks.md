# Implementation Plan

- [x] 1. Create Vaccine Calculation Utility Module





  - Create new utility file with core calculation functions
  - Implement type definitions and interfaces
  - Add validation and error handling logic
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3_

- [x] 1.1 Create utility file structure


  - Create `src/lib/vaccineCalculationUtils.ts`
  - Define TypeScript interfaces for VaccineSchedule, CompletedDose, CalculationParams, CalculationResult
  - Define CalculationErrorType enum and CalculationError interface
  - Export all type definitions
  - _Requirements: 1.1, 2.1_

- [x] 1.2 Implement parseDoseIntervals function


  - Handle array of numbers input
  - Handle JSON string input
  - Return empty array for invalid input
  - Add error logging for parse failures
  - _Requirements: 1.1, 1.4, 5.3_

- [x] 1.3 Implement findFirstDoseDate function


  - Sort completed doses by appointment_date
  - Return earliest date
  - Return null for empty array
  - Validate date format
  - _Requirements: 2.1, 4.4_

- [x] 1.4 Implement calculateCumulativeDays function


  - Sum intervals from index 0 to currentDose - 1
  - Return 0 for first dose (currentDose = 0)
  - Handle edge cases (empty intervals, negative values)
  - _Requirements: 2.2_

- [x] 1.5 Implement validateVaccineSchedule function


  - Check if schedule exists
  - Validate total_doses > 0
  - Validate dose_intervals is not empty
  - Validate vaccine_type is not empty
  - Return boolean result
  - _Requirements: 1.3, 5.1_

- [x] 1.6 Implement main calculateNextDoseDate function


  - Validate input parameters using validateVaccineSchedule
  - Check for completed doses, return error if none
  - Parse dose_intervals using parseDoseIntervals
  - Find first_dose_date using findFirstDoseDate
  - Check if vaccine is complete (currentDose >= total_doses)
  - Calculate cumulative days using calculateCumulativeDays
  - Add cumulative days to first_dose_date to get next_dose_date
  - Calculate daysUntilNextDose from today
  - Build and return CalculationResult with debug info
  - Handle all errors and return CalculationError when needed
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4_

- [x] 1.7 Implement logCalculationSteps function


  - Log vaccine information with emoji prefixes
  - Log first dose date
  - Log each interval step with cumulative total
  - Log final calculated date
  - Log next dose number and interval used
  - Use consistent format across all logs
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 1.8 Write unit tests for utility functions
  - Test parseDoseIntervals with arrays, JSON strings, and invalid inputs
  - Test findFirstDoseDate with multiple dates and empty array
  - Test calculateCumulativeDays with various dose numbers
  - Test validateVaccineSchedule with valid and invalid schedules
  - Test calculateNextDoseDate with single-dose vaccines
  - Test calculateNextDoseDate with multi-dose vaccines
  - Test calculateNextDoseDate with cumulative intervals
  - Test calculateNextDoseDate when vaccine is complete
  - Test error cases (missing schedule, no doses, invalid data)
  - Achieve 90%+ code coverage
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 2. Update VaccineScheduleCalculator Component
  - Replace inline calculation logic with utility function
  - Update state management to use CalculationResult
  - Implement error handling for calculation failures
  - Update UI to display calculation debug information
  - _Requirements: 3.1, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [ ] 2.1 Import and integrate utility function
  - Import calculateNextDoseDate and related types from vaccineCalculationUtils
  - Remove old inline calculation code from loadPatientTracking
  - Replace with utility function call for each patient
  - Map CalculationResult to tracking data structure
  - _Requirements: 3.1_

- [ ] 2.2 Update error handling
  - Check if result is CalculationError
  - Display toast notification for errors
  - Log error details to console
  - Continue processing other patients on individual errors
  - _Requirements: 5.4_

- [ ] 2.3 Update tracking data structure
  - Add calculation_info field to tracking items
  - Store debugInfo from CalculationResult
  - Store calculationMethod for transparency
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2.4 Update UI to show calculation details
  - Display interval used for next dose
  - Show calculation method (from_first_dose)
  - Add tooltip or expandable section with debug info
  - Show comparison if existing appointment differs from calculated
  - _Requirements: 2.5, 7.3_

- [ ]* 2.5 Test VaccineScheduleCalculator changes
  - Test loading patient tracking with various vaccine types
  - Test error handling when vaccine schedule is missing
  - Test UI display of calculation information
  - Verify console logs are formatted correctly
  - Test with real database data
  - _Requirements: 10.1, 10.5_

- [ ] 3. Update PatientNextAppointment Component
  - Replace calculation logic with utility function
  - Standardize error handling
  - Update UI to show calculation transparency
  - _Requirements: 3.2, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2_

- [ ] 3.1 Import and integrate utility function
  - Import calculateNextDoseDate from vaccineCalculationUtils
  - Replace calculation code in loadNextAppointments
  - Update nextAppointmentPromises to use utility
  - Map CalculationResult to NextAppointment interface
  - _Requirements: 3.2_

- [ ] 3.2 Update error handling
  - Handle CalculationError results
  - Display user-friendly error messages
  - Log errors without blocking UI
  - Show partial results when some calculations fail
  - _Requirements: 5.4_

- [ ] 3.3 Update UI display
  - Show calculated next dose date
  - Display days until next dose
  - Add indicator for calculation method
  - Show warning if calculated date differs from scheduled
  - _Requirements: 2.5, 7.3_

- [ ]* 3.4 Test PatientNextAppointment changes
  - Test with user having multiple vaccines
  - Test with completed vaccines
  - Test with vaccines needing next dose
  - Test error scenarios
  - Verify LINE LIFF integration still works
  - _Requirements: 10.1, 10.5_

- [ ] 4. Update NextAppointments Component
  - Integrate utility function for staff view
  - Add calculation verification display
  - Show comparison between calculated and scheduled dates
  - _Requirements: 3.3, 7.1, 7.2, 7.3, 7.4_

- [ ] 4.1 Import and integrate utility function
  - Import calculateNextDoseDate from vaccineCalculationUtils
  - Replace calculation code in loadNextAppointments
  - Update patient processing loop to use utility
  - Store calculation results with appointment data
  - _Requirements: 3.3_

- [ ] 4.2 Add calculation verification
  - Compare calculated date with existing scheduled date
  - Flag discrepancies for staff review
  - Log comparison results
  - _Requirements: 7.3, 7.4_

- [ ] 4.3 Update UI for staff view
  - Display calculated date alongside scheduled date
  - Show visual indicator for matching/mismatching dates
  - Add badge showing calculation status
  - Provide action button to update appointment if needed
  - _Requirements: 2.5, 7.1, 7.2_

- [ ] 4.4 Implement appointment creation validation
  - Check calculated date before creating appointment
  - Prevent duplicate appointments
  - Validate appointment date matches calculation
  - _Requirements: 7.4, 7.5, 9.1, 9.2_

- [ ]* 4.5 Test NextAppointments changes
  - Test with multiple patients needing appointments
  - Test appointment creation with calculated dates
  - Test discrepancy detection and display
  - Test reminder sending functionality
  - Verify performance with 100+ patients
  - _Requirements: 8.3, 10.1, 10.5_

- [ ] 5. Update VaccineDoseCalculator Component
  - Replace manual calculation with utility
  - Use standardized validation
  - Display calculation breakdown
  - _Requirements: 3.4, 5.1, 5.2, 6.1, 6.2_

- [ ] 5.1 Import and integrate utility function
  - Import calculateNextDoseDate from vaccineCalculationUtils
  - Replace calculation code in calculateNextDose
  - Use utility for dose calculation
  - Map result to DoseCalculation interface
  - _Requirements: 3.4_

- [ ] 5.2 Update validation
  - Use validateVaccineSchedule before calculation
  - Validate lastDoseDate format
  - Validate currentDose is within range
  - Show validation errors to user
  - _Requirements: 5.1, 5.2_

- [ ] 5.3 Update UI to show calculation breakdown
  - Display step-by-step calculation
  - Show intervals used
  - Display cumulative days
  - Show calculation from first dose
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 5.4 Test VaccineDoseCalculator changes
  - Test manual dose calculation
  - Test with different vaccine types
  - Test validation error handling
  - Test saving to database
  - Verify notification scheduling still works
  - _Requirements: 10.1, 10.5_

- [ ] 6. Implement Performance Optimizations
  - Add caching for vaccine schedules
  - Optimize database queries
  - Implement memoization where appropriate
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 6.1 Implement vaccine schedule caching
  - Create in-memory cache with Map
  - Set cache expiration to 5 minutes
  - Implement cache invalidation on updates
  - Add cache hit/miss logging
  - _Requirements: 8.1_

- [ ] 6.2 Optimize database queries
  - Batch vaccine schedule queries
  - Use Promise.all for parallel queries
  - Reduce redundant appointment queries
  - _Requirements: 8.2, 8.4_

- [ ] 6.3 Add memoization to components
  - Use useMemo for calculation results
  - Memoize vaccine schedule lookups
  - Cache parsed intervals
  - _Requirements: 8.5_

- [ ]* 6.4 Performance testing
  - Test with 100+ patients
  - Measure calculation time
  - Verify cache effectiveness
  - Check database query count
  - Ensure response time < 2 seconds
  - _Requirements: 8.3, 10.5_

- [ ] 7. Add Data Integrity Checks
  - Validate calculation results
  - Implement audit trail
  - Add data consistency checks
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 7.1 Implement result validation
  - Verify next_dose_date is after first_dose_date
  - Check completion status matches dose count
  - Flag overdue appointments
  - Validate date is not in distant past
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 7.2 Add audit trail
  - Log calculation inputs and outputs
  - Store calculation method used
  - Record timestamp of calculation
  - Include source data reference
  - _Requirements: 9.4_

- [ ] 7.3 Implement consistency checks
  - Compare calculated vs scheduled dates
  - Alert on significant discrepancies (>7 days)
  - Log inconsistencies for review
  - Provide admin notification for critical issues
  - _Requirements: 9.5_

- [ ]* 7.4 Test data integrity features
  - Test validation with edge cases
  - Verify audit trail completeness
  - Test consistency check alerts
  - Validate error detection
  - _Requirements: 10.1, 10.2, 10.5_

- [ ] 8. Integration Testing and Validation
  - Test cross-component consistency
  - Validate against manual calculations
  - Test with production-like data
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 8.1 Create integration test suite
  - Test same calculation across all 4 components
  - Verify results are identical
  - Test with various vaccine types
  - Test with edge cases (irregular intervals, overdue doses)
  - _Requirements: 10.1, 10.2_

- [ ] 8.2 Manual calculation validation
  - Select 10 real patient cases
  - Calculate expected dates manually
  - Compare with system calculations
  - Document any discrepancies
  - _Requirements: 10.3_

- [ ] 8.3 Production data testing
  - Test with anonymized production data
  - Verify calculations for all active vaccines
  - Check performance with real data volume
  - Validate error handling with real edge cases
  - _Requirements: 10.5_

- [ ]* 8.4 Regression testing
  - Create test cases for all fixed bugs
  - Ensure old issues don't reappear
  - Test backward compatibility
  - Verify existing appointments not affected
  - _Requirements: 10.4_

- [ ] 9. Documentation and Deployment
  - Update code documentation
  - Create user guide
  - Deploy to staging and production
  - _Requirements: All_

- [ ] 9.1 Update code documentation
  - Add JSDoc comments to all utility functions
  - Document calculation algorithm
  - Add usage examples
  - Document error codes and handling
  - _Requirements: All_

- [ ] 9.2 Create user guide
  - Document how calculations work
  - Explain calculation method
  - Provide troubleshooting guide
  - Add FAQ section
  - _Requirements: All_

- [ ] 9.3 Deploy to staging
  - Deploy code changes
  - Run smoke tests
  - Verify calculations with test data
  - Monitor for errors
  - _Requirements: 10.5_

- [ ] 9.4 Production deployment
  - Deploy during low-traffic period
  - Monitor error logs
  - Verify calculations with real data
  - Have rollback plan ready
  - _Requirements: 10.5_

- [ ] 9.5 Post-deployment monitoring
  - Monitor calculation success rate
  - Track error frequency
  - Check performance metrics
  - Gather user feedback
  - Address any issues promptly
  - _Requirements: 10.5_
