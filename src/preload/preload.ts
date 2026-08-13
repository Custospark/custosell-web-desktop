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

export interface OfflineBridge {
  onFlushRequest: (handler: () => Promise<void>) => void;
}

const offlineBridge: OfflineBridge = {
  onFlushRequest: (handler) => {
    ipcRenderer.on('offline:flush-before-quit', async (event) => {
      try {
        await handler();
      } finally {
        event.sender.send('offline:flush-before-quit-done');
      }
    });
  },
};

export interface ShellBridge {
  openExternal: (url: string) => Promise<boolean>;
}

const shellBridge: ShellBridge = {
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url) as Promise<boolean>,
};

export interface PaymentWindowBridge {
  close: () => Promise<boolean>;
}

const paymentWindowBridge: PaymentWindowBridge = {
  close: () => ipcRenderer.invoke('payment-window:close') as Promise<boolean>,
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('secureStore', secureStore);
  contextBridge.exposeInMainWorld('appUpdates', appUpdates);
  contextBridge.exposeInMainWorld('offlineBridge', offlineBridge);
  contextBridge.exposeInMainWorld('electronShell', shellBridge);
  contextBridge.exposeInMainWorld('electronPaymentWindow', paymentWindowBridge);
} else {
  (window as Window & { secureStore?: typeof secureStore }).secureStore = secureStore;
  (window as Window & { appUpdates?: AppUpdatesBridge }).appUpdates = appUpdates;
  (window as Window & { offlineBridge?: OfflineBridge }).offlineBridge = offlineBridge;
  (window as Window & { electronShell?: ShellBridge }).electronShell = shellBridge;
  (window as Window & { electronPaymentWindow?: PaymentWindowBridge }).electronPaymentWindow = paymentWindowBridge;
}
