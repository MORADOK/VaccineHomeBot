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
import { Download, X } from "lucide-react";

interface UpdateDialogProps {
  open: boolean;
  updateInfo: {
    version: string;
    releaseNotes: string;
    releaseDate: string;
  };
  onDownload: () => void;
  onSkip: () => void;
}

export function UpdateDialog({
  open,
  updateInfo,
  onDownload,
  onSkip,
}: UpdateDialogProps) {
  // Send IPC message to main process when download is clicked
  const handleDownload = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("download-update");
    }
    onDownload();
  };

  // Send IPC message to main process when skip is clicked
  const handleSkip = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("skip-version", updateInfo.version);
    }
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Update Available
          </DialogTitle>
          <DialogDescription>
            A new version of VCHome Hospital is ready to download
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Version:</span>
              <span className="text-sm font-semibold text-primary">
                v{updateInfo.version}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Release Date:</span>
              <span className="text-sm text-muted-foreground">
                {new Date(updateInfo.releaseDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {updateInfo.releaseNotes && (
            <div className="space-y-2">
              <span className="text-sm font-medium">What's New:</span>
              <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground max-h-[200px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans">
                  {updateInfo.releaseNotes}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip}>
            <X className="h-4 w-4" />
            Skip This Version
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
