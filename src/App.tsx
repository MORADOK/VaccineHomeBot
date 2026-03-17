// App.tsx — stable Router placement + BASE_URL basename with Lazy Loading
import { useState, useEffect, lazy, Suspense } from "react";
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

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PatientPortalPage = lazy(() => import("./pages/PatientPortalPage"));
const StaffPortalPage = lazy(() => import("./pages/StaffPortalPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SimpleAuthPage = lazy(() => import("./pages/SimpleAuthPage"));
const LoadingPage = lazy(() => import("./pages/LoadingPage"));
const FastIndexPage = lazy(() => import("./pages/FastIndexPage"));
const LiffPatientPortalPage = lazy(() => import("./pages/LiffPatientPortalPage"));
const VaccineStatusPage = lazy(() => import("./pages/VaccineStatusPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const NextAppointmentsPage = lazy(() => import("./pages/NextAppointmentsPage"));
const PatientRegistrationsPage = lazy(() => import("./pages/PatientRegistrationsPage"));
const PastVaccinationsPage = lazy(() => import("./pages/PastVaccinationsPage"));
const EditAppointmentsPage = lazy(() => import("./pages/EditAppointmentsPage"));
const AppointmentVerificationPage = lazy(() => import("./pages/AppointmentVerificationPage"));
const LineDebuggerPage = lazy(() => import("./pages/LineDebuggerPage"));
const FixAppointmentsPage = lazy(() => import("./pages/FixAppointmentsPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">กำลังโหลด...</p>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
              <DownloadPage />
            </Suspense>
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
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Home - Redirect to Admin */}
                <Route path="/" element={<Index />} />
                <Route path="/loading" element={<LoadingPage />} />

                {/* Auth */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/Auth" element={<AuthPage />} />
                <Route path="/auth-simple" element={<SimpleAuthPage />} />

                {/* Admin/Staff */}
                <Route path="/admin" element={<Index />} />
                <Route path="/staff-portal" element={<StaffPortalPage />} />
                <Route path="/StaffPortal" element={<StaffPortalPage />} />
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

                {/* Download */}
                <Route path="/download" element={<DownloadPage />} />

                {/* Optional fast page */}
                <Route path="/fast" element={<FastIndexPage />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
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
