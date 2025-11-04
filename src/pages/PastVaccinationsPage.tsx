import { useState, useEffect } from 'react';
import PastVaccinations from '@/components/PastVaccinations';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const PastVaccinationsPage = () => {
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
    <AppLayout user={user} title="ประวัติการฉีดวัคซีน">
      <PastVaccinations />
    </AppLayout>
  );
};

export default PastVaccinationsPage;