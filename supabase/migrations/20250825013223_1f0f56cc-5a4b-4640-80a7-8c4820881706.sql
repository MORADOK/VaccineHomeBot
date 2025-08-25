-- Update one appointment to completed for testing trigger
UPDATE appointments 
SET status = 'completed', updated_at = now() 
WHERE appointment_id = 'HOM-448503-rabies';