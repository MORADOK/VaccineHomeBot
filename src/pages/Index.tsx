import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkflowAnalyzer from '@/components/WorkflowAnalyzer';
import VaccineWorkflowDesigner from '@/components/VaccineWorkflowDesigner';
import StaffDashboard from '@/components/StaffDashboard';
import PatientRegistration from '@/components/PatientRegistration';
import SetupGuide from '@/components/SetupGuide';
import RenderSetupGuide from '@/components/RenderSetupGuide';
import TroubleshootingGuide from '@/components/TroubleshootingGuide';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="designer" className="w-full">
        <div className="container mx-auto pt-6">
          <TabsList className="grid w-full grid-cols-6 max-w-5xl mx-auto">
            <TabsTrigger value="setup">คู่มือติดตั้ง</TabsTrigger>
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="staff">เจ้าหน้าที่</TabsTrigger>
            <TabsTrigger value="patient">คนไข้ LINE</TabsTrigger>
            <TabsTrigger value="troubleshooting">แก้ไขปัญหา</TabsTrigger>
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
        
        <TabsContent value="troubleshooting" className="mt-0">
          <TroubleshootingGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
