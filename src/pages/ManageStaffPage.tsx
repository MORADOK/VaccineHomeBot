import { useState, useEffect } from 'react';
import StaffDashboard from '@/components/StaffDashboard';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const ManageStaffPage = () => {
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
    <AppLayout user={user} title="จัดการเจ้าหน้าที่">
      <StaffDashboard />
    </AppLayout>
  );
};

export default ManageStaffPage;
