import { contextBridge, ipcRenderer } from 'electron';

const secureStore = {
  set: (key: string, value: string) => ipcRenderer.invoke('secure-store:set', key, value) as Promise<boolean>,
  get: (key: string) => ipcRenderer.invoke('secure-store:get', key) as Promise<string | null>,
  delete: (key: string) => ipcRenderer.invoke('secure-store:delete', key) as Promise<void>,
};

export interface AppUpdatesBridge {
  getPendingVersion: () => Promise<string | null>;
  restartAndInstall: () => Promise<boolean>;
  onUpdateReady: (callback: (version: string) => void) => void;
}

const appUpdates: AppUpdatesBridge = {
  getPendingVersion: () => ipcRenderer.invoke('app-update:pending-version') as Promise<string | null>,
  restartAndInstall: () => ipcRenderer.invoke('app-update:restart-and-install') as Promise<boolean>,
  onUpdateReady: (callback) => {
    ipcRenderer.on('app-update:ready', (_event, payload: { version: string }) => {
      callback(payload.version);
    });
  },
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('secureStore', secureStore);
  contextBridge.exposeInMainWorld('appUpdates', appUpdates);
} else {
  (window as Window & { secureStore?: typeof secureStore }).secureStore = secureStore;
  (window as Window & { appUpdates?: AppUpdatesBridge }).appUpdates = appUpdates;
}
