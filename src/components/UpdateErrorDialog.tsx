import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Wifi, 
  HardDrive,
  Shield,
  XCircle
} from "lucide-react";

interface UpdateErrorDialogProps {
  open: boolean;
  error: {
    message: string;
    type: string;
    canRetry: boolean;
    manualDownloadUrl?: string;
    technicalDetails?: string;
  };
  onRetry: () => void;
  onManualDownload: () => void;
  onClose: () => void;
}

export function UpdateErrorDialog({
  open,
  error,
  onRetry,
  onManualDownload,
  onClose,
}: UpdateErrorDialogProps) {
  // Get icon based on error type
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="h-5 w-5 text-red-600" />;
      case 'disk_space':
        return <HardDrive className="h-5 w-5 text-red-600" />;
      case 'permission':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'integrity':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  // Get error title based on type
  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Network Connection Error';
      case 'disk_space':
        return 'Insufficient Disk Space';
      case 'permission':
        return 'Permission Denied';
      case 'integrity':
        return 'Download Verification Failed';
      case 'rate_limit':
        return 'Rate Limit Exceeded';
      default:
        return 'Update Failed';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getErrorIcon()}
            {getErrorTitle()}
          </DialogTitle>
          <DialogDescription>
            An error occurred while updating the application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Message */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>

          {/* Technical Details (collapsible) */}
          {error.technicalDetails && (
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
                {error.technicalDetails}
              </div>
            </details>
          )}

          {/* Solutions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">What you can do:</p>
            
            {error.canRetry && (
              <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                <RefreshCw className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Try Again</p>
                  <p className="text-xs text-muted-foreground">
                    Retry the update process
                  </p>
                </div>
              </div>
            )}

            {error.manualDownloadUrl && (
              <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                <Download className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Manual Download</p>
                  <p className="text-xs text-muted-foreground">
                    Download and install the update manually from our website
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Help */}
          {error.type === 'network' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Check your internet connection and firewall settings. 
                If you're behind a proxy, make sure it's configured correctly.
              </p>
            </div>
          )}

          {error.type === 'permission' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Try running the application as administrator or 
                check that you have write permissions to the installation directory.
              </p>
            </div>
          )}

          {error.type === 'disk_space' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Free up at least 500 MB of disk space and try again.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {error.manualDownloadUrl && (
            <Button variant="secondary" onClick={onManualDownload}>
              <Download className="h-4 w-4" />
              Manual Download
            </Button>
          )}
          
          {error.canRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
