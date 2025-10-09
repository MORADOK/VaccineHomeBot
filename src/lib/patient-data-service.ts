import { supabase } from '@/integrations/supabase/client';

export interface PatientRecord {
  id?: string;
  patient_id: string;
  full_name: string;
  phone: string;
  id_number: string;
  birth_date: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  hospital: string;
  registration_source: 'web_portal' | 'staff_portal' | 'line_bot' | 'external_system';
  created_at?: string;
  updated_at?: string;
}

export interface VaccineRecord {
  id?: string;
  patient_id: string;
  vaccine_type: string;
  dose_number: number;
  vaccination_date: string;
  vaccination_time?: string;
  batch_number?: string;
  manufacturer?: string;
  administered_by: string;
  location: string;
  side_effects?: string;
  notes?: string;
  next_dose_date?: string;
  created_at?: string;
  updated_at?: string;
}

export class PatientDataService {
  // Patient Management
  static async createPatient(patientData: Omit<PatientRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PatientRecord> {
    const { data, error } = await supabase
      .from('patient_registrations')
      .insert([{
        ...patientData,
        registration_id: patientData.patient_id,
        source: patientData.registration_source
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    return this.mapToPatientRecord(data);
  }

  static async getPatient(patientId: string): Promise<PatientRecord | null> {
    const { data, error } = await supabase
      .from('patient_registrations')
      .select('*')
      .eq('registration_id', patientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching patient:', error);
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }

    return this.mapToPatientRecord(data);
  }

  static async updatePatient(patientId: string, updates: Partial<PatientRecord>): Promise<PatientRecord> {
    const { data, error } = await supabase
      .from('patient_registrations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('registration_id', patientId)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return this.mapToPatientRecord(data);
  }

  static async searchPatients(query: string): Promise<PatientRecord[]> {
    const { data, error } = await supabase
      .from('patient_registrations')
      .select('*')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,registration_id.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching patients:', error);
      throw new Error(`Failed to search patients: ${error.message}`);
    }

    return data.map(this.mapToPatientRecord);
  }

  // Vaccine Record Management
  static async addVaccineRecord(vaccineData: Omit<VaccineRecord, 'id' | 'created_at' | 'updated_at'>): Promise<VaccineRecord> {
    // First, create appointment record
    const appointmentData = {
      appointment_id: `VAC-${Date.now()}`,
      patient_name: '', // Will be filled from patient data
      patient_phone: '',
      patient_id_number: '',
      vaccine_type: vaccineData.vaccine_type,
      appointment_date: vaccineData.vaccination_date,
      appointment_time: vaccineData.vaccination_time,
      status: 'completed',
      scheduled_by: vaccineData.administered_by,
      notes: vaccineData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get patient info to complete appointment data
    const patient = await this.getPatient(vaccineData.patient_id);
    if (patient) {
      appointmentData.patient_name = patient.full_name;
      appointmentData.patient_phone = patient.phone;
      appointmentData.patient_id_number = patient.id_number;
    }

    const { data, error } = await supabase
      .from('vaccine_appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating vaccine record:', error);
      throw new Error(`Failed to create vaccine record: ${error.message}`);
    }

    return this.mapToVaccineRecord(data, vaccineData);
  }

  static async getVaccineHistory(patientId: string): Promise<VaccineRecord[]> {
    const { data, error } = await supabase
      .from('vaccine_appointments')
      .select('*')
      .eq('patient_id_number', patientId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error fetching vaccine history:', error);
      throw new Error(`Failed to fetch vaccine history: ${error.message}`);
    }

    return data.map(appointment => this.mapToVaccineRecord(appointment));
  }

  static async getUpcomingVaccinations(patientId?: string): Promise<VaccineRecord[]> {
    let query = supabase
      .from('vaccine_appointments')
      .select('*')
      .in('status', ['scheduled', 'confirmed'])
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true });

    if (patientId) {
      query = query.eq('patient_id_number', patientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching upcoming vaccinations:', error);
      throw new Error(`Failed to fetch upcoming vaccinations: ${error.message}`);
    }

    return data.map(appointment => this.mapToVaccineRecord(appointment));
  }

  // Statistics and Reports
  static async getVaccinationStats(startDate?: string, endDate?: string) {
    let query = supabase
      .from('vaccine_appointments')
      .select('vaccine_type, status, appointment_date')
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('appointment_date', startDate);
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vaccination stats:', error);
      throw new Error(`Failed to fetch vaccination stats: ${error.message}`);
    }

    // Process statistics
    const stats = {
      totalVaccinations: data.length,
      byVaccineType: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      completionRate: 0
    };

    data.forEach(record => {
      // Count by vaccine type
      stats.byVaccineType[record.vaccine_type] = 
        (stats.byVaccineType[record.vaccine_type] || 0) + 1;

      // Count by date
      const date = record.appointment_date;
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }

  // External System Integration
  static async syncWithExternalSystem(externalData: any[]): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };

    for (const record of externalData) {
      try {
        // Map external data to our format
        const patientData = this.mapExternalToPatient(record);
        
        // Check if patient exists
        const existingPatient = await this.getPatient(patientData.patient_id);
        
        if (existingPatient) {
          // Update existing patient
          await this.updatePatient(patientData.patient_id, patientData);
        } else {
          // Create new patient
          await this.createPatient(patientData);
        }

        // Add vaccine records if present
        if (record.vaccinations && Array.isArray(record.vaccinations)) {
          for (const vaccination of record.vaccinations) {
            const vaccineData = this.mapExternalToVaccine(vaccination, patientData.patient_id);
            await this.addVaccineRecord(vaccineData);
          }
        }

        results.success++;
      } catch (error) {
        results.errors.push(`Failed to sync record ${record.id || 'unknown'}: ${error.message}`);
      }
    }

    return results;
  }

  // Helper methods
  private static mapToPatientRecord(data: any): PatientRecord {
    return {
      id: data.id,
      patient_id: data.registration_id,
      full_name: data.full_name,
      phone: data.phone,
      id_number: data.id_number || '',
      birth_date: data.birth_date || '',
      address: data.address,
      emergency_contact: data.emergency_contact,
      emergency_phone: data.emergency_phone,
      medical_history: data.medical_history,
      allergies: data.allergies,
      current_medications: data.current_medications,
      hospital: data.hospital,
      registration_source: data.source as any,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  private static mapToVaccineRecord(data: any, additional?: Partial<VaccineRecord>): VaccineRecord {
    return {
      id: data.id,
      patient_id: data.patient_id_number,
      vaccine_type: data.vaccine_type,
      dose_number: 1, // Default, should be calculated based on history
      vaccination_date: data.appointment_date,
      vaccination_time: data.appointment_time,
      administered_by: data.scheduled_by || 'Unknown',
      location: 'โรงพยาบาลโฮม',
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      ...additional
    };
  }

  private static mapExternalToPatient(externalRecord: any): Omit<PatientRecord, 'id' | 'created_at' | 'updated_at'> {
    return {
      patient_id: externalRecord.patient_id || externalRecord.id,
      full_name: externalRecord.name || externalRecord.full_name,
      phone: externalRecord.phone || externalRecord.telephone,
      id_number: externalRecord.id_number || externalRecord.national_id,
      birth_date: externalRecord.birth_date || externalRecord.dob,
      address: externalRecord.address,
      emergency_contact: externalRecord.emergency_contact,
      emergency_phone: externalRecord.emergency_phone,
      medical_history: externalRecord.medical_history,
      allergies: externalRecord.allergies,
      current_medications: externalRecord.medications,
      hospital: 'โรงพยาบาลโฮม',
      registration_source: 'external_system'
    };
  }

  private static mapExternalToVaccine(externalVaccination: any, patientId: string): Omit<VaccineRecord, 'id' | 'created_at' | 'updated_at'> {
    return {
      patient_id: patientId,
      vaccine_type: externalVaccination.vaccine_type || externalVaccination.vaccine,
      dose_number: externalVaccination.dose_number || 1,
      vaccination_date: externalVaccination.date || externalVaccination.vaccination_date,
      vaccination_time: externalVaccination.time,
      batch_number: externalVaccination.batch_number,
      manufacturer: externalVaccination.manufacturer,
      administered_by: externalVaccination.administered_by || 'External System',
      location: externalVaccination.location || 'โรงพยาบาลโฮม',
      side_effects: externalVaccination.side_effects,
      notes: externalVaccination.notes,
      next_dose_date: externalVaccination.next_dose_date
    };
  }
}