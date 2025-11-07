import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import FixIncorrectAppointments from '@/components/FixIncorrectAppointments';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const FixAppointmentsPage = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppLayout user={user} title="แก้ไขนัดที่ไม่ตรง">
      <FixIncorrectAppointments />
    </AppLayout>
  );
};

export default FixAppointmentsPage;
