import * as React from "react";
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
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface UpdateInstallDialogProps {
  open: boolean;
  version: string;
  onInstallNow: () => void;
  onInstallLater: () => void;
}

export function UpdateInstallDialog({
  open,
  version,
  onInstallNow,
  onInstallLater,
}: UpdateInstallDialogProps) {
  // Send IPC message to main process when install now is clicked
  const handleInstallNow = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("install-update");
    }
    onInstallNow();
  };

  // Handle install later - just close the dialog
  const handleInstallLater = () => {
    onInstallLater();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onInstallLater()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Update Ready to Install
          </DialogTitle>
          <DialogDescription>
            Version {version} has been downloaded successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Success Message */}
          <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Download Complete
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                The update is ready to be installed on your system
              </p>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              <strong>Important:</strong> The application will restart to complete the installation.
              Please save any unsaved work before proceeding.
            </AlertDescription>
          </Alert>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Install Now</p>
                <p className="text-xs text-muted-foreground">
                  Quit and install the update immediately to get the latest features and fixes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Install Later</p>
                <p className="text-xs text-muted-foreground">
                  Continue working and install the update when you quit the application
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleInstallLater}>
            <Clock className="h-4 w-4" />
            Install Later
          </Button>
          <Button onClick={handleInstallNow}>
            <CheckCircle2 className="h-4 w-4" />
            Install Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
