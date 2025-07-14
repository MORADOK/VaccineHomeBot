import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkflowAnalyzer from '@/components/WorkflowAnalyzer';
import VaccineWorkflowDesigner from '@/components/VaccineWorkflowDesigner';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="designer" className="w-full">
        <div className="container mx-auto pt-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="designer" className="mt-0">
          <VaccineWorkflowDesigner />
        </TabsContent>
        
        <TabsContent value="analyzer" className="mt-0">
          <WorkflowAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
