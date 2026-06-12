import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Type definitions for IPC communication
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  files?: any[];
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

interface UpdateState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  updateDownloaded: boolean;
  error: string | null;
  isChecking: boolean;
  isDownloading: boolean;
}

// Check if we're running in Electron
const isElectron = () => {
  return window && (window as any).electron !== undefined;
};

// IPC Communication helpers
const invoke = async (channel: string, ...args: any[]) => {
  if (!isElectron()) {
    console.warn('Not running in Electron environment');
    return null;
  }

  try {
    const ipcRenderer = (window as any).electron?.ipcRenderer;
    if (ipcRenderer) {
      return await ipcRenderer.invoke(channel, ...args);
    }
  } catch (error) {
    console.error(`IPC invoke error (${channel}):`, error);
    throw error;
  }

  return null;
};

const on = (channel: string, callback: (...args: any[]) => void) => {
  if (!isElectron()) return () => {};

  const ipcRenderer = (window as any).electron?.ipcRenderer;
  if (ipcRenderer) {
    ipcRenderer.on(channel, callback);

    return () => {
      ipcRenderer.removeListener(channel, callback);
    };
  }

  return () => {};
};

export const useAutoUpdate = () => {
  const { toast } = useToast();
  const [state, setState] = useState<UpdateState>({
    updateAvailable: false,
    updateInfo: null,
    downloadProgress: null,
    updateDownloaded: false,
    error: null,
    isChecking: false,
    isDownloading: false,
  });

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!isElectron()) {
      toast({
        title: 'ไม่รองรับในโหมดเว็บ',
        description: 'ระบบอัปเดตอัตโนมัติใช้งานได้เฉพาะใน Desktop App เท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const result = await invoke('check-for-updates');

      if (result?.isDev) {
        toast({
          title: 'โหมดพัฒนา',
          description: 'ระบบอัปเดตอัตโนมัติไม่ทำงานในโหมดพัฒนา',
        });
        setState(prev => ({ ...prev, isChecking: false }));
        return;
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to check for updates');
      }

      setState(prev => ({ ...prev, isChecking: false }));
    } catch (error: any) {
      console.error('Check for updates error:', error);
      setState(prev => ({ ...prev, isChecking: false, error: error.message }));

      toast({
        title: 'ตรวจสอบอัปเดตไม่สำเร็จ',
        description: error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อัปเดตได้',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Download update
  const downloadUpdate = useCallback(async () => {
    if (!isElectron()) return;

    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      const result = await invoke('download-update');

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to download update');
      }
    } catch (error: any) {
      console.error('Download update error:', error);
      setState(prev => ({ ...prev, isDownloading: false, error: error.message }));

      toast({
        title: 'ดาวน์โหลดอัปเดตไม่สำเร็จ',
        description: error.message || 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Install update
  const installUpdate = useCallback(async () => {
    if (!isElectron()) return;

    try {
      await invoke('install-update');
    } catch (error: any) {
      console.error('Install update error:', error);

      toast({
        title: 'ติดตั้งอัปเดตไม่สำเร็จ',
        description: error.message || 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Get app version
  const getAppVersion = useCallback(async () => {
    if (!isElectron()) return 'Web Version';

    try {
      const version = await invoke('get-app-version');
      return version || 'Unknown';
    } catch (error) {
      console.error('Get app version error:', error);
      return 'Unknown';
    }
  }, []);

  // Setup IPC listeners
  useEffect(() => {
    if (!isElectron()) return;

    // Update available
    const unsubscribeAvailable = on('update-available', (event: any, info: UpdateInfo) => {
      console.log('Update available:', info);

      setState(prev => ({
        ...prev,
        updateAvailable: true,
        updateInfo: info,
        isChecking: false,
      }));

      toast({
        title: '🎉 มีเวอร์ชันใหม่!',
        description: `เวอร์ชัน ${info.version} พร้อมให้ดาวน์โหลดแล้ว`,
      });
    });

    // Update not available
    const unsubscribeNotAvailable = on('update-not-available', (event: any, info: any) => {
      console.log('Update not available:', info);

      setState(prev => ({
        ...prev,
        updateAvailable: false,
        isChecking: false,
      }));

      toast({
        title: 'ใช้เวอร์ชันล่าสุดอยู่แล้ว',
        description: `เวอร์ชันปัจจุบัน: ${info.version}`,
      });
    });

    // Download progress
    const unsubscribeProgress = on('download-progress', (event: any, progress: DownloadProgress) => {
      console.log('Download progress:', progress.percent);

      setState(prev => ({
        ...prev,
        downloadProgress: progress,
        isDownloading: true,
      }));
    });

    // Update downloaded
    const unsubscribeDownloaded = on('update-downloaded', (event: any, info: UpdateInfo) => {
      console.log('Update downloaded:', info);

      setState(prev => ({
        ...prev,
        updateDownloaded: true,
        downloadProgress: null,
        isDownloading: false,
      }));

      toast({
        title: '✅ ดาวน์โหลดเสร็จสิ้น',
        description: `เวอร์ชัน ${info.version} พร้อมติดตั้งแล้ว`,
        action: {
          label: 'ติดตั้งเดี๋ยวนี้',
          onClick: installUpdate,
        },
      });
    });

    // Update error
    const unsubscribeError = on('update-error', (event: any, errorInfo: any) => {
      console.error('Update error:', errorInfo);

      setState(prev => ({
        ...prev,
        error: errorInfo.message,
        isChecking: false,
        isDownloading: false,
      }));

      toast({
        title: 'เกิดข้อผิดพลาด',
        description: errorInfo.message || 'ไม่สามารถอัปเดตได้',
        variant: 'destructive',
      });
    });

    // Cleanup
    return () => {
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, [toast, installUpdate]);

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getAppVersion,
    isElectron: isElectron(),
  };
};
