-- Add monitoring columns to domain_configurations table
ALTER TABLE domain_configurations 
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ssl_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Create domain_alerts table for tracking domain issues
CREATE TABLE IF NOT EXISTS domain_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('accessibility', 'ssl_expiring', 'ssl_expired', 'config_drift')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Add index for efficient querying
    CONSTRAINT domain_alerts_domain_fkey FOREIGN KEY (domain) REFERENCES domain_configurations(domain) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_domain_alerts_domain ON domain_alerts(domain);
CREATE INDEX IF NOT EXISTS idx_domain_alerts_resolved ON domain_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_domain_alerts_created_at ON domain_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_domain_configurations_last_health_check ON domain_configurations(last_health_check);

-- Enable RLS on domain_alerts table
ALTER TABLE domain_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for domain_alerts
CREATE POLICY "Users can view domain alerts" ON domain_alerts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert domain alerts" ON domain_alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update domain alerts" ON domain_alerts
    FOR UPDATE USING (true);

-- Add comments for documentation
COMMENT ON TABLE domain_alerts IS 'Stores alerts and notifications for domain monitoring issues';
COMMENT ON COLUMN domain_alerts.alert_type IS 'Type of alert: accessibility, ssl_expiring, ssl_expired, config_drift';
COMMENT ON COLUMN domain_alerts.severity IS 'Alert severity level: low, medium, high, critical';
COMMENT ON COLUMN domain_configurations.last_health_check IS 'Timestamp of the last health check performed';
COMMENT ON COLUMN domain_configurations.is_accessible IS 'Whether the domain is currently accessible';
COMMENT ON COLUMN domain_configurations.ssl_valid IS 'Whether the SSL certificate is valid';
COMMENT ON COLUMN domain_configurations.ssl_expires_at IS 'SSL certificate expiration date';
COMMENT ON COLUMN domain_configurations.response_time_ms IS 'Last recorded response time in milliseconds';