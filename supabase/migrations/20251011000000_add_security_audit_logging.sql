-- Add Security Audit Logging
-- This migration adds audit logging capabilities for security events

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON public.audit_logs(success);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (using service_role)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    _user_id UUID,
    _event_type TEXT,
    _event_details JSONB DEFAULT NULL,
    _success BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_details,
        success,
        created_at
    ) VALUES (
        _user_id,
        _event_type,
        _event_details,
        _success,
        NOW()
    )
    RETURNING id INTO _log_id;

    RETURN _log_id;
END;
$$;

-- 3. Create function to get failed login attempts
CREATE OR REPLACE FUNCTION public.get_failed_login_attempts(
    _user_id UUID,
    _minutes INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.audit_logs
    WHERE user_id = _user_id
      AND event_type = 'login_failed'
      AND success = false
      AND created_at > NOW() - (_minutes || ' minutes')::INTERVAL;
$$;

-- 4. Create function to check if user is locked out
CREATE OR REPLACE FUNCTION public.is_user_locked_out(
    _user_id UUID,
    _max_attempts INTEGER DEFAULT 5,
    _lockout_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT public.get_failed_login_attempts(_user_id, _lockout_minutes) >= _max_attempts;
$$;

-- 5. Add last_login column to user_roles table (if not exists)
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 6. Create function to update last login time
CREATE OR REPLACE FUNCTION public.update_last_login(_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE public.user_roles
    SET last_login = NOW()
    WHERE user_id = _user_id;
$$;

-- 7. Create view for recent security events (admins only)
CREATE OR REPLACE VIEW public.recent_security_events AS
SELECT
    al.id,
    al.user_id,
    u.email,
    al.event_type,
    al.event_details,
    al.success,
    al.created_at,
    al.ip_address
FROM public.audit_logs al
LEFT JOIN auth.users u ON u.id = al.user_id
WHERE al.created_at > NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC
LIMIT 1000;

-- Grant access to admins
GRANT SELECT ON public.recent_security_events TO authenticated;

-- 8. Create function to get security stats
CREATE OR REPLACE FUNCTION public.get_security_stats()
RETURNS TABLE (
    total_logins BIGINT,
    failed_logins BIGINT,
    unique_users BIGINT,
    lockouts BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        COUNT(*) FILTER (WHERE event_type IN ('login_success', 'login_failed')) as total_logins,
        COUNT(*) FILTER (WHERE event_type = 'login_failed') as failed_logins,
        COUNT(DISTINCT user_id) FILTER (WHERE event_type IN ('login_success', 'login_failed')) as unique_users,
        COUNT(*) FILTER (WHERE event_type = 'account_locked') as lockouts
    FROM public.audit_logs
    WHERE created_at > NOW() - INTERVAL '30 days';
$$;

-- Comment on table and columns
COMMENT ON TABLE public.audit_logs IS 'Security audit log for tracking authentication and authorization events';
COMMENT ON COLUMN public.audit_logs.event_type IS 'Type of event: login_success, login_failed, logout, role_changed, permission_denied, etc.';
COMMENT ON COLUMN public.audit_logs.event_details IS 'Additional details about the event in JSON format';
COMMENT ON COLUMN public.audit_logs.success IS 'Whether the event was successful or failed';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_login_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_locked_out TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_stats TO authenticated;
