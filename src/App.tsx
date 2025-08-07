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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/line-bot" element={<LineBotPage />} />
            <Route path="/LineBot" element={<LineBotPage />} />
            <Route path="/patient-portal" element={<PatientPortalPage />} />
            <Route path="/PatientPortal" element={<PatientPortalPage />} />
            <Route path="/staff-portal" element={<StaffPortalPage />} />
            <Route path="/StaffPortal" element={<StaffPortalPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
