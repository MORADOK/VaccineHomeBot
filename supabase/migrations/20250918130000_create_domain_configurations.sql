-- Create domain_configurations table for managing custom domain settings
CREATE TABLE public.domain_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  subdomain TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'enabled')),
  dns_record_type TEXT NOT NULL CHECK (dns_record_type IN ('ANAME', 'CNAME', 'A')),
  target_value TEXT NOT NULL,
  ssl_enabled BOOLEAN DEFAULT false,
  verification_token TEXT,
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.domain_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for domain_configurations table
-- Allow staff to manage domain configurations
CREATE POLICY "Staff can view domain configurations" 
ON public.domain_configurations 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert domain configurations" 
ON public.domain_configurations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can update domain configurations" 
ON public.domain_configurations 
FOR UPDATE 
USING (true);

CREATE POLICY "Staff can delete domain configurations" 
ON public.domain_configurations 
FOR DELETE 
USING (true);

-- Allow service role to manage domain configurations (for functions)
CREATE POLICY "Service role can manage domain configurations" 
ON public.domain_configurations 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_domain_configurations_updated_at
  BEFORE UPDATE ON public.domain_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_domain_configurations_domain ON public.domain_configurations(domain);
CREATE INDEX idx_domain_configurations_status ON public.domain_configurations(status);
CREATE INDEX idx_domain_configurations_dns_type ON public.domain_configurations(dns_record_type);
CREATE INDEX idx_domain_configurations_created_at ON public.domain_configurations(created_at);
CREATE INDEX idx_domain_configurations_last_verified ON public.domain_configurations(last_verified_at);

-- Add comments for documentation
COMMENT ON TABLE public.domain_configurations IS 'Stores custom domain configuration settings and verification status';
COMMENT ON COLUMN public.domain_configurations.domain IS 'The custom domain name (e.g., vaccinehomehospital.co.th)';
COMMENT ON COLUMN public.domain_configurations.subdomain IS 'Optional subdomain (e.g., www)';
COMMENT ON COLUMN public.domain_configurations.status IS 'Current verification and configuration status';
COMMENT ON COLUMN public.domain_configurations.dns_record_type IS 'Type of DNS record required (ANAME preferred, A as fallback)';
COMMENT ON COLUMN public.domain_configurations.target_value IS 'Target value for DNS record (domain or IP)';
COMMENT ON COLUMN public.domain_configurations.ssl_enabled IS 'Whether SSL certificate is active for this domain';
COMMENT ON COLUMN public.domain_configurations.verification_token IS 'Token used for domain ownership verification';
COMMENT ON COLUMN public.domain_configurations.last_verified_at IS 'Timestamp of last successful verification check';
COMMENT ON COLUMN public.domain_configurations.error_message IS 'Last error message if verification failed';