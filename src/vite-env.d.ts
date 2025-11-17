/// <reference types="vite/client" />

// Electron IPC types
interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  files?: any[];
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

interface UpdateError {
  message: string;
  type: string;
  canRetry: boolean;
  manualDownloadUrl?: string;
  technicalDetails?: string;
  stack?: string;
}

interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
}

interface Window {
  electron?: ElectronAPI;
}
