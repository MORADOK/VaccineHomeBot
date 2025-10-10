import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LineBotPage from "./pages/LineBotPage";
import PatientPortalPage from "./pages/PatientPortalPage";
import StaffPortalPage from "./pages/StaffPortalPage";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import SimpleAuthPage from "./pages/SimpleAuthPage";
import LoadingPage from "./pages/LoadingPage";
import FastIndexPage from "./pages/FastIndexPage";
import LiffPatientPortalPage from "./pages/LiffPatientPortalPage";
import VaccineStatusPage from "./pages/VaccineStatusPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.PROD ? '/VaccineHomeBot' : ''}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/auth" element={<SimpleAuthPage />} />
            <Route path="/auth-full" element={<AuthPage />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/line-bot" element={<LineBotPage />} />
            <Route path="/LineBot" element={<LineBotPage />} />
            <Route path="/patient-portal" element={<PatientPortalPage />} />
            <Route path="/PatientPortal" element={<PatientPortalPage />} />
            <Route path="/staff-portal" element={<StaffPortalPage />} />
            <Route path="/StaffPortal" element={<StaffPortalPage />} />
            <Route path="/liff-patient-portal" element={<LiffPatientPortalPage />} />
            <Route path="/vaccine-status" element={<VaccineStatusPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
