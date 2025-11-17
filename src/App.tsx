// App.tsx — stable Router placement + BASE_URL basename
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { UpdateDialog } from "@/components/UpdateDialog";
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog";
import { UpdateInstallDialog } from "@/components/UpdateInstallDialog";
import { UpdateErrorDialog } from "@/components/UpdateErrorDialog";

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
import EditAppointmentsPage from "./pages/EditAppointmentsPage";
import ManageStaffPage from "./pages/ManageStaffPage";
import AppointmentVerificationPage from "./pages/AppointmentVerificationPage";
import LineDebuggerPage from "./pages/LineDebuggerPage";
import FixAppointmentsPage from "./pages/FixAppointmentsPage";

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
  const { toast } = useToast();
  
  // Update state management
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    version: '',
    releaseDate: '',
    releaseNotes: '',
  });
  
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
  });

  const [updateError, setUpdateError] = useState<UpdateError>({
    message: '',
    type: '',
    canRetry: false,
    manualDownloadUrl: '',
    technicalDetails: '',
  });

  // Setup IPC listeners for update events
  useEffect(() => {
    if (!isElectron || !window.electron?.ipcRenderer) {
      return;
    }

    const ipc = window.electron.ipcRenderer;

    // Listen for update-available event
    const handleUpdateAvailable = (_event: any, info: UpdateInfo) => {
      console.log('[App] Update available:', info);
      setUpdateInfo(info);
      setUpdateDialogOpen(true);
    };

    // Listen for update-not-available event
    const handleUpdateNotAvailable = (_event: any, info: any) => {
      console.log('[App] Update not available:', info);
    };

    // Listen for download-progress event
    const handleDownloadProgress = (_event: any, progress: DownloadProgress) => {
      console.log('[App] Download progress:', progress.percent.toFixed(2) + '%');
      setDownloadProgress(progress);
    };

    // Listen for update-downloaded event
    const handleUpdateDownloaded = (_event: any, info: UpdateInfo) => {
      console.log('[App] Update downloaded:', info);
      setProgressDialogOpen(false);
      setInstallDialogOpen(true);
    };

    // Listen for update-error event
    const handleUpdateError = (_event: any, error: UpdateError) => {
      console.error('[App] Update error:', error);
      // Close all dialogs and show error dialog
      setUpdateDialogOpen(false);
      setProgressDialogOpen(false);
      setInstallDialogOpen(false);
      setUpdateError(error);
      setErrorDialogOpen(true);
    };

    // Listen for update-retry event
    const handleUpdateRetry = (_event: any, retryInfo: any) => {
      console.log('[App] Update retry:', retryInfo);
      toast({
        title: "Retrying Update",
        description: `${retryInfo.message} (Attempt ${retryInfo.attempt}/${retryInfo.maxRetries})`,
        duration: 3000,
      });
    };

    // Register listeners
    ipc.on('update-available', handleUpdateAvailable);
    ipc.on('update-not-available', handleUpdateNotAvailable);
    ipc.on('download-progress', handleDownloadProgress);
    ipc.on('update-downloaded', handleUpdateDownloaded);
    ipc.on('update-error', handleUpdateError);
    ipc.on('update-retry', handleUpdateRetry);

    // Cleanup listeners on unmount
    return () => {
      ipc.removeListener('update-available', handleUpdateAvailable);
      ipc.removeListener('update-not-available', handleUpdateNotAvailable);
      ipc.removeListener('download-progress', handleDownloadProgress);
      ipc.removeListener('update-downloaded', handleUpdateDownloaded);
      ipc.removeListener('update-error', handleUpdateError);
      ipc.removeListener('update-retry', handleUpdateRetry);
    };
  }, []);

  // Dialog handlers
  const handleDownload = () => {
    console.log('[App] Starting download...');
    setUpdateDialogOpen(false);
    setProgressDialogOpen(true);
    // IPC message is sent from UpdateDialog component
  };

  const handleSkip = () => {
    console.log('[App] Skipping update');
    setUpdateDialogOpen(false);
    // IPC message is sent from UpdateDialog component
  };

  const handleInstallNow = () => {
    console.log('[App] Installing update now...');
    setInstallDialogOpen(false);
    // IPC message is sent from UpdateInstallDialog component
  };

  const handleInstallLater = () => {
    console.log('[App] Installing update later');
    setInstallDialogOpen(false);
  };

  const handleRetry = () => {
    console.log('[App] Retrying update...');
    setErrorDialogOpen(false);
    
    // Retry based on what failed
    if (updateError.type === 'network' || updateError.type === 'integrity') {
      // Retry download
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('download-update');
      }
      setProgressDialogOpen(true);
    } else {
      // Retry check for updates
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('check-for-updates');
      }
    }
  };

  const handleManualDownload = () => {
    console.log('[App] Opening manual download...');
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('open-manual-download');
    }
    setErrorDialogOpen(false);
  };

  const handleErrorClose = () => {
    console.log('[App] Closing error dialog');
    setErrorDialogOpen(false);
  };

  // Choose router based on environment
  const Router = isElectron ? HashRouter : BrowserRouter;
  const routerProps = isElectron ? {} : { basename: BASENAME };

  // 🔒 Security: Block web browser access in production - only allow Electron desktop app
  // Allow web access in development mode for Visual Edits and testing
  const isDevelopment = import.meta.env.DEV;
  if (!isElectron && !isDevelopment) {
    console.log('[App] Web browser detected in production - redirecting to download page only');
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
                <Route path="/manage-staff" element={<ManageStaffPage />} />
                <Route path="/next-appointments" element={<NextAppointmentsPage />} />
                <Route path="/edit-appointments" element={<EditAppointmentsPage />} />
                <Route path="/patient-registrations" element={<PatientRegistrationsPage />} />
                <Route path="/past-vaccinations" element={<PastVaccinationsPage />} />
                <Route path="/verify-appointments" element={<AppointmentVerificationPage />} />
                <Route path="/fix-appointments" element={<FixAppointmentsPage />} />
                <Route path="/line-debugger" element={<LineDebuggerPage />} />

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

          {/* Update Dialogs */}
          <UpdateDialog
            open={updateDialogOpen}
            updateInfo={updateInfo}
            onDownload={handleDownload}
            onSkip={handleSkip}
          />
          
          <UpdateProgressDialog
            open={progressDialogOpen}
            progress={downloadProgress}
          />
          
          <UpdateInstallDialog
            open={installDialogOpen}
            version={updateInfo.version}
            onInstallNow={handleInstallNow}
            onInstallLater={handleInstallLater}
          />

          <UpdateErrorDialog
            open={errorDialogOpen}
            error={updateError}
            onRetry={handleRetry}
            onManualDownload={handleManualDownload}
            onClose={handleErrorClose}
          />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
