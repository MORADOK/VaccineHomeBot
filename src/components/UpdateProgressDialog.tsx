import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";

interface UpdateProgressDialogProps {
  open: boolean;
  progress: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  onCancel?: () => void;
}

export function UpdateProgressDialog({
  open,
  progress,
  onCancel,
}: UpdateProgressDialogProps) {
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format speed to MB/s
  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(2)} MB/s`;
  };

  // Calculate estimated time remaining
  const calculateTimeRemaining = (): string => {
    if (progress.bytesPerSecond === 0) return "Calculating...";
    
    const remainingBytes = progress.total - progress.transferred;
    const secondsRemaining = remainingBytes / progress.bytesPerSecond;
    
    if (secondsRemaining < 60) {
      return `${Math.ceil(secondsRemaining)} seconds`;
    } else if (secondsRemaining < 3600) {
      const minutes = Math.ceil(secondsRemaining / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.ceil((secondsRemaining % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[450px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary animate-pulse" />
            Downloading Update
          </DialogTitle>
          <DialogDescription>
            Please wait while the update is being downloaded
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="font-semibold text-primary">
                {progress.percent.toFixed(1)}%
              </span>
            </div>
            <Progress value={progress.percent} className="h-3" />
          </div>

          {/* Download Stats */}
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Download Speed:</span>
              <span className="font-medium">
                {formatSpeed(progress.bytesPerSecond)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Downloaded:</span>
              <span className="font-medium">
                {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time Remaining:</span>
              <span className="font-medium">
                {calculateTimeRemaining()}
              </span>
            </div>
          </div>

          {/* Info Message */}
          <p className="text-xs text-center text-muted-foreground">
            The application will prompt you to install once the download is complete
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
