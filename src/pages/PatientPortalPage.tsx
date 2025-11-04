import { useState, useEffect } from 'react';
import PatientPortal from '@/components/PatientPortal';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const PatientPortalPage = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppLayout user={user} title="ลงทะเบียนผู้ป่วย - Patient Portal">
      <PatientPortal />
    </AppLayout>
  );
};

export default PatientPortalPage;