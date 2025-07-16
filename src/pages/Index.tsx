import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkflowAnalyzer from '@/components/WorkflowAnalyzer';
import VaccineWorkflowDesigner from '@/components/VaccineWorkflowDesigner';
import RenderSetupGuide from '@/components/RenderSetupGuide';
import TroubleshootingGuide from '@/components/TroubleshootingGuide';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="designer" className="w-full">
        <div className="container mx-auto pt-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto">
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="render">Render Setup</TabsTrigger>
            <TabsTrigger value="troubleshooting">แก้ไขปัญหา</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="designer" className="mt-0">
          <VaccineWorkflowDesigner />
        </TabsContent>
        
        <TabsContent value="analyzer" className="mt-0">
          <WorkflowAnalyzer />
        </TabsContent>
        
        <TabsContent value="render" className="mt-0">
          <RenderSetupGuide />
        </TabsContent>
        
        <TabsContent value="troubleshooting" className="mt-0">
          <TroubleshootingGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
