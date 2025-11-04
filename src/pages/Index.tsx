import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkflowAnalyzer from '@/components/WorkflowAnalyzer';
import VaccineWorkflowDesigner from '@/components/VaccineWorkflowDesigner';
import StaffDashboard from '@/components/StaffDashboard';
import PatientRegistration from '@/components/PatientRegistration';
import SetupGuide from '@/components/SetupGuide';
import RenderSetupGuide from '@/components/RenderSetupGuide';
import LineBot from '@/components/LineBot';
import PatientPortal from '@/components/PatientPortal';
import StaffPortal from '@/components/StaffPortal';
import GoogleSheetsIntegration from '@/components/GoogleSheetsIntegration';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const Index = () => {
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
    <AppLayout user={user} title="ระบบผู้ดูแล - Admin Dashboard">
      <Tabs defaultValue="designer" className="w-full">
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="setup">คู่มือติดตั้ง</TabsTrigger>
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="LineBot">LINE Bot</TabsTrigger>
            <TabsTrigger value="PatientPortal">ลงทะเบียนผู้ป่วย</TabsTrigger>
            <TabsTrigger value="StaffPortal">เจ้าหน้าที่</TabsTrigger>
            <TabsTrigger value="googlesheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="staff">Dashboard เดิม</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="designer" className="mt-0">
          <VaccineWorkflowDesigner />
        </TabsContent>
        
        <TabsContent value="analyzer" className="mt-0">
          <WorkflowAnalyzer />
        </TabsContent>
        
        <TabsContent value="staff" className="mt-0">
          <StaffDashboard />
        </TabsContent>
        
        <TabsContent value="patient" className="mt-0">
          <PatientRegistration />
        </TabsContent>
        
        <TabsContent value="setup" className="mt-0">
          <SetupGuide />
        </TabsContent>
        
        <TabsContent value="LineBot" className="mt-0">
          <LineBot />
        </TabsContent>
        
        <TabsContent value="PatientPortal" className="mt-0">
          <PatientPortal />
        </TabsContent>
        
        <TabsContent value="StaffPortal" className="mt-0">
          <StaffPortal />
        </TabsContent>
        
        <TabsContent value="googlesheets" className="mt-0">
          <GoogleSheetsIntegration />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Index;
