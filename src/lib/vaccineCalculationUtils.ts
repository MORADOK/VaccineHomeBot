/**
 * Vaccine Calculation Utility Module
 * 
 * Provides standardized vaccine appointment calculation logic
 * based on vaccine_schedules data from Supabase.
 * 
 * This module serves as the Single Source of Truth for all
 * vaccine dose calculations across the application.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Vaccine schedule data from Supabase vaccine_schedules table
 */
export interface VaccineSchedule {
  id: string;
  vaccine_name: string;
  vaccine_type: string;
  total_doses: number;
  dose_intervals: number[] | any; // Can be array or JSON string
  active: boolean;
  age_restrictions?: {
    min_age?: number;
    max_age?: number;
  };
  contraindications?: string[];
  indications?: string[];
  side_effects?: string[];
  efficacy_duration?: number;
  booster_required?: boolean;
  booster_interval?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Completed vaccine dose from appointments table
 */
export interface CompletedDose {
  appointment_date: string;
  vaccine_type: string;
  status: 'completed';
}

/**
 * Parameters for vaccine calculation
 */
export interface CalculationParams {
  vaccineSchedule: VaccineSchedule | null;
  completedDoses: CompletedDose[];
  currentDoseNumber: number;
}

/**
 * Successful calculation result
 */
export interface CalculationResult {
  nextDoseNumber: number;
  nextDoseDate: string | null;
  daysUntilNextDose: number | null;
  isComplete: boolean;
  calculationMethod: 'from_first_dose' | 'completed';
  firstDoseDate: string | null;
  cumulativeDays: number;
  intervalUsed: number;
  debugInfo: {
    vaccineType: string;
    totalDoses: number;
    intervals: number[];
    completedCount: number;
  };
}

/**
 * Error types for calculation failures
 */
export enum CalculationErrorType {
  MISSING_VACCINE_SCHEDULE = 'MISSING_VACCINE_SCHEDULE',
  INVALID_DOSE_INTERVALS = 'INVALID_DOSE_INTERVALS',
  NO_COMPLETED_DOSES = 'NO_COMPLETED_DOSES',
  INVALID_FIRST_DOSE_DATE = 'INVALID_FIRST_DOSE_DATE',
  CALCULATION_ERROR = 'CALCULATION_ERROR'
}

/**
 * Error result when calculation fails
 */
export interface CalculationError {
  type: CalculationErrorType;
  message: string;
  details?: any;
}


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse dose intervals from various input formats
 * 
 * Handles both array of numbers and JSON string formats.
 * Returns empty array for invalid input.
 * 
 * @param intervals - Dose intervals as array or JSON string
 * @returns Parsed array of interval days
 */
export function parseDoseIntervals(intervals: number[] | any): number[] {
  // Handle null or undefined
  if (!intervals) {
    console.error('❌ parseDoseIntervals: intervals is null or undefined');
    return [];
  }

  // Already an array
  if (Array.isArray(intervals)) {
    return intervals;
  }

  // Try to parse as JSON string
  if (typeof intervals === 'string') {
    try {
      const parsed = JSON.parse(intervals);
      if (Array.isArray(parsed)) {
        return parsed;
      } else {
        console.error('❌ parseDoseIntervals: Parsed JSON is not an array', parsed);
        return [];
      }
    } catch (error) {
      console.error('❌ parseDoseIntervals: Failed to parse JSON string', error);
      return [];
    }
  }

  // Unknown format
  console.error('❌ parseDoseIntervals: Unknown format', typeof intervals);
  return [];
}


/**
 * Find the earliest dose date from completed doses
 * 
 * Sorts completed doses by appointment_date and returns the earliest.
 * Validates date format before returning.
 * 
 * @param completedDoses - Array of completed vaccine doses
 * @returns Earliest appointment date or null if empty
 */
export function findFirstDoseDate(completedDoses: CompletedDose[]): string | null {
  // Handle empty array
  if (!completedDoses || completedDoses.length === 0) {
    return null;
  }

  // Sort by appointment_date and get the earliest
  const sorted = [...completedDoses].sort((a, b) => {
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  });

  const firstDate = sorted[0]?.appointment_date;

  // Validate date format
  if (firstDate && !isNaN(new Date(firstDate).getTime())) {
    return firstDate;
  }

  console.error('❌ findFirstDoseDate: Invalid date format', firstDate);
  return null;
}


/**
 * Calculate cumulative days from first dose to current dose
 * 
 * Sums all intervals from index 0 to currentDose - 1.
 * Returns 0 for first dose (currentDose = 0).
 * 
 * @param intervals - Array of interval days between doses
 * @param currentDose - Current dose number (0-indexed)
 * @returns Total cumulative days
 */
export function calculateCumulativeDays(intervals: number[], currentDose: number): number {
  // First dose has no interval
  if (currentDose <= 0) {
    return 0;
  }

  // Handle empty intervals
  if (!intervals || intervals.length === 0) {
    return 0;
  }

  // Sum intervals from 0 to currentDose - 1
  let cumulative = 0;
  for (let i = 0; i < currentDose && i < intervals.length; i++) {
    const interval = intervals[i];
    
    // Handle negative values
    if (interval < 0) {
      console.warn(`⚠️ calculateCumulativeDays: Negative interval at index ${i}: ${interval}`);
      continue;
    }
    
    cumulative += interval;
  }

  return cumulative;
}


/**
 * Validate vaccine schedule data
 * 
 * Checks if schedule exists and has valid required fields.
 * 
 * @param schedule - Vaccine schedule to validate
 * @returns True if valid, false otherwise
 */
export function validateVaccineSchedule(schedule: VaccineSchedule | null): boolean {
  // Check if schedule exists
  if (!schedule) {
    return false;
  }

  // Validate total_doses > 0
  if (!schedule.total_doses || schedule.total_doses <= 0) {
    console.error('❌ validateVaccineSchedule: Invalid total_doses', schedule.total_doses);
    return false;
  }

  // Validate dose_intervals is not empty
  const intervals = parseDoseIntervals(schedule.dose_intervals);
  if (!intervals || intervals.length === 0) {
    console.error('❌ validateVaccineSchedule: Empty or invalid dose_intervals');
    return false;
  }

  // Validate vaccine_type is not empty
  if (!schedule.vaccine_type || schedule.vaccine_type.trim() === '') {
    console.error('❌ validateVaccineSchedule: Empty vaccine_type');
    return false;
  }

  return true;
}


// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate next vaccine dose date based on standardized method
 * 
 * This is the main calculation function that uses first_dose_date as the base
 * and adds cumulative intervals to determine the next dose date.
 * 
 * Algorithm:
 * 1. Validate vaccine schedule
 * 2. Check for completed doses
 * 3. Find first dose date
 * 4. Parse dose intervals
 * 5. Check if vaccine is complete
 * 6. Calculate cumulative days from first dose
 * 7. Add cumulative days to first dose date
 * 8. Calculate days until next dose
 * 
 * @param params - Calculation parameters
 * @returns Calculation result or error
 */
export function calculateNextDoseDate(
  params: CalculationParams
): CalculationResult | CalculationError {
  try {
    const { vaccineSchedule, completedDoses, currentDoseNumber } = params;

    // Step 1: Validate vaccine schedule
    if (!validateVaccineSchedule(vaccineSchedule)) {
      return {
        type: CalculationErrorType.MISSING_VACCINE_SCHEDULE,
        message: 'ไม่พบข้อมูลวัคซีนในระบบ',
        details: { 
          vaccineType: vaccineSchedule?.vaccine_type,
          hasSchedule: !!vaccineSchedule
        }
      };
    }

    // Step 2: Check for completed doses
    if (!completedDoses || completedDoses.length === 0) {
      return {
        type: CalculationErrorType.NO_COMPLETED_DOSES,
        message: 'ไม่พบข้อมูลการฉีดวัคซีน',
        details: { 
          currentDoseNumber,
          completedCount: 0
        }
      };
    }

    // Step 3: Find first dose date
    const firstDoseDate = findFirstDoseDate(completedDoses);
    if (!firstDoseDate) {
      return {
        type: CalculationErrorType.INVALID_FIRST_DOSE_DATE,
        message: 'ไม่พบข้อมูลเข็มแรก',
        details: { completedDoses }
      };
    }

    // Step 4: Parse dose intervals
    const intervals = parseDoseIntervals(vaccineSchedule!.dose_intervals);
    if (!intervals || intervals.length === 0) {
      console.warn('⚠️ Invalid dose_intervals, using default 30 days');
      // Use default but continue
      intervals.push(30);
    }

    // Step 5: Check if vaccine is complete
    const isComplete = currentDoseNumber >= vaccineSchedule!.total_doses;
    const nextDoseNumber = currentDoseNumber + 1;

    if (isComplete) {
      return {
        nextDoseNumber: vaccineSchedule!.total_doses,
        nextDoseDate: null,
        daysUntilNextDose: null,
        isComplete: true,
        calculationMethod: 'completed',
        firstDoseDate,
        cumulativeDays: 0,
        intervalUsed: 0,
        debugInfo: {
          vaccineType: vaccineSchedule!.vaccine_type,
          totalDoses: vaccineSchedule!.total_doses,
          intervals,
          completedCount: completedDoses.length
        }
      };
    }

    // Step 6: Calculate cumulative days from first dose
    const cumulativeDays = calculateCumulativeDays(intervals, currentDoseNumber);

    // Step 7: Add cumulative days to first dose date
    const firstDate = new Date(firstDoseDate);
    const nextDate = new Date(firstDate);
    nextDate.setDate(nextDate.getDate() + cumulativeDays);
    const nextDoseDate = nextDate.toISOString().split('T')[0];

    // Step 8: Calculate days until next dose
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilNextDose = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get the interval used for this dose
    const intervalUsed = intervals[currentDoseNumber - 1] || intervals[intervals.length - 1] || 0;

    // Build result
    const result: CalculationResult = {
      nextDoseNumber,
      nextDoseDate,
      daysUntilNextDose,
      isComplete: false,
      calculationMethod: 'from_first_dose',
      firstDoseDate,
      cumulativeDays,
      intervalUsed,
      debugInfo: {
        vaccineType: vaccineSchedule!.vaccine_type,
        totalDoses: vaccineSchedule!.total_doses,
        intervals,
        completedCount: completedDoses.length
      }
    };

    return result;

  } catch (error: any) {
    console.error('❌ Calculation error:', error);
    return {
      type: CalculationErrorType.CALCULATION_ERROR,
      message: 'เกิดข้อผิดพลาดในการคำนวณ',
      details: { 
        error: error.message,
        stack: error.stack
      }
    };
  }
}


// ============================================================================
// Logging and Debugging
// ============================================================================

/**
 * Log calculation steps for debugging and transparency
 * 
 * Provides detailed logging of the calculation process with emoji prefixes
 * for easy identification in console logs.
 * 
 * @param params - Calculation parameters
 * @param result - Calculation result
 */
export function logCalculationSteps(
  params: CalculationParams,
  result: CalculationResult | CalculationError
): void {
  // Check if it's an error
  if ('type' in result) {
    console.error('❌ Calculation Error');
    console.error(`   - Type: ${result.type}`);
    console.error(`   - Message: ${result.message}`);
    if (result.details) {
      console.error(`   - Details:`, result.details);
    }
    return;
  }

  // Log successful calculation
  const { vaccineSchedule, completedDoses, currentDoseNumber } = params;
  
  console.log('🎯 Vaccine Calculation');
  console.log(`   - วัคซีน: ${result.debugInfo.vaccineType}`);
  console.log(`   - จำนวนเข็มทั้งหมด: ${result.debugInfo.totalDoses} เข็m`);
  console.log(`   - ระยะห่างระหว่างเข็ม: [${result.debugInfo.intervals.join(', ')}] วัน`);
  
  console.log('💉 First Dose Information');
  console.log(`   - วันที่ฉีดเข็มแรก: ${result.firstDoseDate}`);
  console.log(`   - จำนวนเข็มที่ฉีดแล้ว: ${result.debugInfo.completedCount} เข็ม`);
  
  if (!result.isComplete) {
    console.log('📊 Calculation Steps');
    
    // Log each interval step
    let cumulative = 0;
    const intervals = result.debugInfo.intervals;
    
    for (let i = 0; i < currentDoseNumber && i < intervals.length; i++) {
      cumulative += intervals[i];
      console.log(`   - เข็มที่ ${i + 1} → ${i + 2}: +${intervals[i]} วัน (รวม: ${cumulative} วัน)`);
    }
    
    console.log('📅 Calculated Next Dose');
    console.log(`   - เข็มถัดไป: เข็มที่ ${result.nextDoseNumber}`);
    console.log(`   - ระยะห่างที่ใช้: ${result.intervalUsed} วัน`);
    console.log(`   - รวมระยะห่างจากเข็มแรก: ${result.cumulativeDays} วัน`);
    console.log(`   - วันที่นัดเข็มถัดไป: ${result.nextDoseDate}`);
    console.log(`   - จำนวนวันจนถึงนัด: ${result.daysUntilNextDose} วัน`);
    console.log(`   - วิธีการคำนวณ: ${result.calculationMethod}`);
  } else {
    console.log('✅ Vaccine Complete');
    console.log(`   - ฉีดครบแล้ว ${result.debugInfo.totalDoses} เข็ม`);
  }
}
