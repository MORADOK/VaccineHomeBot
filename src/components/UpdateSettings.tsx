import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

const UpdateSettings = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Get current version from package.json or electron
    const version = '1.0.6'; // This will be replaced by actual version from electron
    setCurrentVersion(version);

    // Check if running in Electron
    if (window.electron?.ipcRenderer) {
      // Listen for update events
      const handleUpdateAvailable = (_event: any, info: UpdateInfo) => {
        setUpdateStatus('available');
        setUpdateInfo(info);
        setIsChecking(false);
        toast({
          title: "มีอัพเดทใหม่",
          description: `เวอร์ชัน ${info.version} พร้อมให้ดาวน์โหลด`,
        });
      };

      const handleUpdateNotAvailable = () => {
        setUpdateStatus('not-available');
        setIsChecking(false);
        toast({
          title: "คุณใช้เวอร์ชันล่าสุดแล้ว",
          description: "ไม่มีอัพเดทใหม่ในขณะนี้",
        });
      };

      const handleUpdateError = (_event: any, error: { message: string }) => {
        setUpdateStatus('error');
        setErrorMessage(error.message);
        setIsChecking(false);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถตรวจสอบอัพเดทได้",
          variant: "destructive",
        });
      };

      window.electron.ipcRenderer.on('update-available', handleUpdateAvailable);
      window.electron.ipcRenderer.on('update-not-available', handleUpdateNotAvailable);
      window.electron.ipcRenderer.on('update-error', handleUpdateError);

      return () => {
        // Cleanup listeners
        window.electron?.ipcRenderer.removeListener('update-available', handleUpdateAvailable);
        window.electron?.ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable);
        window.electron?.ipcRenderer.removeListener('update-error', handleUpdateError);
      };
    }
  }, [toast]);

  const handleCheckForUpdates = () => {
    if (!window.electron?.ipcRenderer) {
      toast({
        title: "ไม่รองรับ",
        description: "ฟีเจอร์นี้ใช้ได้เฉพาะใน Desktop App เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setUpdateStatus('checking');
    setErrorMessage('');
    window.electron.ipcRenderer.send('check-for-updates');
  };

  const handleDownloadUpdate = () => {
    if (!window.electron?.ipcRenderer || !updateInfo) return;
    
    window.electron.ipcRenderer.send('download-update');
    toast({
      title: "เริ่มดาวน์โหลด",
      description: "กำลังดาวน์โหลดอัพเดท...",
    });
  };

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
      case 'available':
        return <Download className="h-5 w-5 text-orange-500" />;
      case 'not-available':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return 'กำลังตรวจสอบอัพเดท...';
      case 'available':
        return `มีเวอร์ชันใหม่ ${updateInfo?.version} พร้อมให้ดาวน์โหลด`;
      case 'not-available':
        return 'คุณใช้เวอร์ชันล่าสุดแล้ว';
      case 'error':
        return `เกิดข้อผิดพลาด: ${errorMessage}`;
      default:
        return 'คลิกปุ่มด้านล่างเพื่อตรวจสอบอัพเดท';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ตรวจสอบอัพเดท</CardTitle>
        <CardDescription>
          ตรวจสอบและติดตั้งเวอร์ชันใหม่ของแอปพลิเคชัน
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Version */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">เวอร์ชันปัจจุบัน</p>
            <p className="text-2xl font-bold text-primary">{currentVersion}</p>
          </div>
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">สถานะ</p>
              <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
              
              {/* Show release notes if update available */}
              {updateStatus === 'available' && updateInfo?.releaseNotes && (
                <div className="mt-3 p-3 bg-muted/50 rounded text-xs">
                  <p className="font-semibold mb-1">รายละเอียดการอัพเดท:</p>
                  <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCheckForUpdates}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                กำลังตรวจสอบ...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                ตรวจสอบอัพเดท
              </>
            )}
          </Button>

          {updateStatus === 'available' && (
            <Button
              onClick={handleDownloadUpdate}
              variant="default"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลดอัพเดท
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          แอปพลิเคชันจะตรวจสอบอัพเดทอัตโนมัติเมื่อเปิดโปรแกรม
        </p>
      </CardContent>
    </Card>
  );
};

export default UpdateSettings;
