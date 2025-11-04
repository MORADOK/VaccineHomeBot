// App.tsx — stable Router placement + BASE_URL basename
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
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
import DownloadPage from "./pages/DownloadPage";
import NextAppointmentsPage from "./pages/NextAppointmentsPage";
import PatientRegistrationsPage from "./pages/PatientRegistrationsPage";
import PastVaccinationsPage from "./pages/PastVaccinationsPage";
import LiffCheckerPage from "./pages/LiffCheckerPage";

const queryClient = new QueryClient();

// Electron detection: Check user agent instead of protocol (works in both dev and production)
// In dev mode: Electron uses http://localhost:5173
// In production: Electron uses file:// protocol
const isElectron = /electron/i.test(navigator.userAgent) || window.location.protocol === 'file:';
const BASENAME = import.meta.env.BASE_URL;

console.log('[App] User Agent:', navigator.userAgent);
console.log('[App] Protocol:', window.location.protocol);
console.log('[App] Is Electron:', isElectron);
console.log('[App] Using', isElectron ? 'HashRouter' : 'BrowserRouter');
console.log('[App] Basename:', BASENAME);

const App = () => {
  // Choose router based on environment
  const Router = isElectron ? HashRouter : BrowserRouter;
  const routerProps = isElectron ? {} : { basename: BASENAME };

  // 🔒 Security: Block web browser access - only allow Electron desktop app
  if (!isElectron) {
    console.log('[App] Web browser detected - redirecting to download page only');
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <DownloadPage />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <Router {...routerProps}>
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
                <Route path="/next-appointments" element={<NextAppointmentsPage />} />
                <Route path="/patient-registrations" element={<PatientRegistrationsPage />} />
                <Route path="/past-vaccinations" element={<PastVaccinationsPage />} />

                {/* Patient */}
                <Route path="/patient-portal" element={<PatientPortalPage />} />
                <Route path="/PatientPortal" element={<PatientPortalPage />} />
                <Route path="/liff-patient-portal" element={<LiffPatientPortalPage />} />
                <Route path="/vaccine-status" element={<VaccineStatusPage />} />
                <Route path="/liff-checker" element={<LiffCheckerPage />} />

                {/* Line bot (รองรับทั้งตัวเล็ก/ใหญ่) */}
                <Route path="/line-bot" element={<LineBotPage />} />
                <Route path="/LineBot" element={<LineBotPage />} />

                {/* Download */}
                <Route path="/download" element={<DownloadPage />} />

                {/* Optional fast page */}
                <Route path="/fast" element={<FastIndexPage />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
