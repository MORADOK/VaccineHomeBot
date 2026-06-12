import { useEffect, useState } from 'react';
import { useAutoUpdate } from '@/hooks/use-auto-update';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const UpdateNotification = () => {
  const {
    updateAvailable,
    updateInfo,
    downloadProgress,
    updateDownloaded,
    error,
    isChecking,
    isDownloading,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    isElectron,
  } = useAutoUpdate();

  const [showNotification, setShowNotification] = useState(false);

  // Show notification when update is available or downloaded
  useEffect(() => {
    if (updateAvailable || updateDownloaded) {
      setShowNotification(true);
    }
  }, [updateAvailable, updateDownloaded]);

  // Don't show anything if not in Electron or notification is dismissed
  if (!isElectron || !showNotification) {
    return null;
  }

  // Format bytes to readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-5">
      <Card className="border-2 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {updateDownloaded ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>อัปเดตพร้อมติดตั้ง</span>
                </>
              ) : isDownloading ? (
                <>
                  <Download className="h-5 w-5 text-blue-600 animate-bounce" />
                  <span>กำลังดาวน์โหลด...</span>
                </>
              ) : error ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>เกิดข้อผิดพลาด</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <span>มีเวอร์ชันใหม่!</span>
                </>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotification(false)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>

          {updateInfo && (
            <CardDescription className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">v{updateInfo.version}</Badge>
              {updateInfo.releaseDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(updateInfo.releaseDate).toLocaleDateString('th-TH')}
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pb-3 space-y-3">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Download Progress */}
          {isDownloading && downloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ความคืบหน้า:</span>
                <span className="font-medium">{Math.round(downloadProgress.percent)}%</span>
              </div>
              <Progress value={downloadProgress.percent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
                <span>{formatBytes(downloadProgress.bytesPerSecond)}/s</span>
              </div>
            </div>
          )}

          {/* Release Notes */}
          {updateInfo?.releaseNotes && !isDownloading && (
            <div className="max-h-32 overflow-y-auto">
              <p className="text-sm font-medium mb-1">สิ่งที่มีการเปลี่ยนแปลง:</p>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Update Downloaded Message */}
          {updateDownloaded && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                อัปเดตดาวน์โหลดเสร็จสิ้นแล้ว กรุณารีสตาร์ทเพื่อติดตั้ง
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 pt-3 border-t">
          {updateDownloaded ? (
            <>
              <Button
                onClick={installUpdate}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                รีสตาร์ทเพื่อติดตั้ง
              </Button>
              <Button
                onClick={() => setShowNotification(false)}
                variant="outline"
              >
                ทีหลัง
              </Button>
            </>
          ) : isDownloading ? (
            <Button disabled className="w-full">
              <Download className="h-4 w-4 mr-2 animate-pulse" />
              กำลังดาวน์โหลด... {downloadProgress && `${Math.round(downloadProgress.percent)}%`}
            </Button>
          ) : error ? (
            <>
              <Button
                onClick={checkForUpdates}
                variant="outline"
                className="flex-1"
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                ลองอีกครั้ง
              </Button>
              <Button
                onClick={() => setShowNotification(false)}
                variant="outline"
              >
                ปิด
              </Button>
            </>
          ) : updateAvailable ? (
            <>
              <Button
                onClick={downloadUpdate}
                className="flex-1"
                variant="default"
              >
                <Download className="h-4 w-4 mr-2" />
                ดาวน์โหลดเดี๋ยวนี้
              </Button>
              <Button
                onClick={() => setShowNotification(false)}
                variant="outline"
              >
                ข้าม
              </Button>
            </>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
};

export default UpdateNotification;
