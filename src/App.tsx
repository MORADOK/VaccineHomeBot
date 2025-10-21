// App.tsx — stable Router placement + BASE_URL basename
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

// ใช้ BASE_URL ของ Vite (กำหนดใน vite.config.ts: base: '/VaccineHomeBot/')
const BASENAME = import.meta.env.BASE_URL;

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter basename={BASENAME}>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <main className="flex-1 scroll-area">
              <Routes>
                {/* Home */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/loading" element={<LoadingPage />} />

                {/* Auth */}
                <Route path="/auth" element={<AuthPage />} />            {/* ✅ ใช้หน้าเต็ม */}
                <Route path="/Auth" element={<AuthPage />} />            {/* เผื่อพิมพ์ตัวใหญ่ */}
                <Route path="/auth-simple" element={<SimpleAuthPage />} /> {/* เก็บหน้าแบบย่อไว้ใช้งานอื่น */}

                {/* Admin/Staff */}
                <Route path="/admin" element={<Index />} />
                <Route path="/staff-portal" element={<StaffPortalPage />} />
                <Route path="/StaffPortal" element={<StaffPortalPage />} />

                {/* Patient */}
                <Route path="/patient-portal" element={<PatientPortalPage />} />
                <Route path="/PatientPortal" element={<PatientPortalPage />} />
                <Route path="/liff-patient-portal" element={<LiffPatientPortalPage />} />
                <Route path="/vaccine-status" element={<VaccineStatusPage />} />

                {/* Line bot (รองรับทั้งตัวเล็ก/ใหญ่) */}
                <Route path="/line-bot" element={<LineBotPage />} />
                <Route path="/LineBot" element={<LineBotPage />} />

                {/* Optional fast page */}
                <Route path="/fast" element={<FastIndexPage />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
