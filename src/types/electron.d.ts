// Electron IPC type definitions
export {};

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        once: (channel: string, listener: (...args: any[]) => void) => void;
        removeListener: (channel: string, listener: (...args: any[]) => void) => void;
      };
    };
  }
}
