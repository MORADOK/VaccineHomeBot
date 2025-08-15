-- Update vaccine schedules with hospital's complete vaccine data
-- Remove all existing vaccine schedules and replace with new data

DELETE FROM public.vaccine_schedules;

-- Insert updated vaccine schedules for the hospital
INSERT INTO public.vaccine_schedules (vaccine_name, vaccine_type, total_doses, dose_intervals, age_restrictions, contraindications, indications, side_effects, efficacy_duration, booster_required, booster_interval) VALUES

-- วัคซีนไข้หวัดใหญ่ (Influenza)
('วัคซีนไข้หวัดใหญ่', 'flu', 2, '[365]', '{"min_age": 6}', '["severe_allergic_reaction", "guillain_barre_syndrome", "fever_illness"]', '["general_population", "healthcare_worker", "elderly", "chronic_disease", "pregnant_women"]', '["pain_at_injection", "low_grade_fever", "muscle_aches", "fatigue"]', 365, true, 365),

-- วัคซีนไวรัสตับอักเสบบี (Hepatitis B)
('วัคซีนไวรัสตับอักเสบบี', 'hep_b', 3, '[30, 150]', '{"min_age": 0}', '["severe_allergic_reaction", "yeast_allergy"]', '["healthcare_worker", "high_risk_exposure", "newborns", "dialysis_patients"]', '["pain_at_injection", "fatigue", "fever", "headache"]', 10950, false, null),

-- วัคซีนป้องกันบาดทะยัก (Tetanus)
('วัคซีนป้องกันบาดทะยัก', 'tetanus', 3, '[30, 180]', '{"min_age": 2}', '["severe_allergic_reaction", "neurological_disorders"]', '["general_population", "wound_exposure", "travelers"]', '["pain_at_injection", "swelling", "fever", "redness"]', 3650, true, 3650),

-- วัคซีนงูสวัด (Shingles/Zoster)
('วัคซีนงูสวัด', 'shingles', 2, '[90]', '{"min_age": 50}', '["pregnancy", "immunocompromised", "severe_allergic_reaction", "active_tuberculosis"]', '["adults_over_50", "immunocompromised_adults"]', '["pain_at_injection", "redness", "swelling", "muscle_pain", "fatigue"]', 1460, false, null),

-- วัคซีนป้องกันมะเร็งปากมดลูก (HPV)
('วัคซีนป้องกันมะเร็งปากมดลูก', 'hpv', 3, '[30, 150]', '{"min_age": 9, "max_age": 45}', '["pregnancy", "severe_allergic_reaction", "bleeding_disorders"]', '["adolescents", "young_adults", "women", "men"]', '["pain_at_injection", "swelling", "redness", "dizziness", "nausea"]', 3650, false, null),

-- วัคซีนปอดอักเสบ (Pneumonia)
('วัคซีนปอดอักเสบ', 'pneumonia', 2, '[60]', '{"min_age": 2}', '["severe_allergic_reaction", "acute_illness"]', '["elderly", "chronic_disease", "immunocompromised", "smokers"]', '["pain_at_injection", "fever", "irritability", "swelling"]', 1825, false, null),

-- วัคซีนอีสุกอีใส (Chickenpox/Varicella)
('วัคซีนอีสุกอีใส', 'chickenpox', 2, '[30]', '{"min_age": 12}', '["pregnancy", "immunocompromised", "severe_allergic_reaction", "active_tuberculosis", "recent_blood_transfusion"]', '["children", "adults_without_immunity", "healthcare_workers"]', '["pain_at_injection", "fever", "mild_rash", "swelling"]', 7300, false, null),

-- วัคซีนพิษสุนัขบ้า (Rabies)
('วัคซีนพิษสุนัขบ้า', 'rabies', 5, '[3, 4, 7, 14]', '{"min_age": 0}', '["severe_allergic_reaction"]', '["animal_bite_exposure", "high_risk_travelers", "veterinarians", "animal_handlers"]', '["pain_at_injection", "swelling", "fever", "headache", "nausea"]', 1095, false, null);