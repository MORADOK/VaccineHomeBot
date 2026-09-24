import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Props = { children: ReactNode; allowedRoles?: string[] };

/** Protects all internal vaccine-system routes. Authentication alone is not
 * enough: the account must also have an enabled application role. */
export default function RequireStaffAuth({ children, allowedRoles = ['healthcare_staff','staff','reader','admin','superadmin'] }: Props) {
  const location = useLocation();
  const [state, setState] = useState<'loading'|'allowed'|'denied'>('loading');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      setState('loading');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !session?.user) { setState('denied'); return; }
      const { data, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      if (!active) return;
      const role = data?.role as string | undefined;
      setState(!roleError && !!role && allowedRoles.includes(role) ? 'allowed' : 'denied');
    };
    void verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setState('denied'); else void verify();
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [location.pathname, allowedRoles.join('|')]);

  if (state === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary"/><p className="mt-3 text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p></div></div>;
  if (state === 'denied') return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}
