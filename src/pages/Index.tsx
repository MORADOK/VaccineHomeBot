import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkflowAnalyzer from '@/components/WorkflowAnalyzer';
import VaccineWorkflowDesigner from '@/components/VaccineWorkflowDesigner';
import StaffDashboard from '@/components/StaffDashboard';
import PatientRegistration from '@/components/PatientRegistration';
import SetupGuide from '@/components/SetupGuide';
import RenderSetupGuide from '@/components/RenderSetupGuide';
import TroubleshootingGuide from '@/components/TroubleshootingGuide';
import LineBot from '@/components/LineBot';
import PatientPortal from '@/components/PatientPortal';
import StaffPortal from '@/components/StaffPortal';
import GoogleSheetsIntegration from '@/components/GoogleSheetsIntegration';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="designer" className="w-full">
        <div className="container mx-auto pt-6">
          <TabsList className="grid w-full grid-cols-10 max-w-7xl mx-auto">
            <TabsTrigger value="setup">คู่มือติดตั้ง</TabsTrigger>
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="LineBot">LINE Bot</TabsTrigger>
            <TabsTrigger value="PatientPortal">ลงทะเบียนผู้ป่วย</TabsTrigger>
            <TabsTrigger value="StaffPortal">เจ้าหน้าที่</TabsTrigger>
            <TabsTrigger value="googlesheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="staff">Dashboard เดิม</TabsTrigger>
            <TabsTrigger value="patient">LINE เดิม</TabsTrigger>
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
        
        <TabsContent value="troubleshooting" className="mt-0">
          <TroubleshootingGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
