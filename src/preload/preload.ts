import { contextBridge, ipcRenderer } from 'electron';

const secureStore = {
  set: (key: string, value: string) => ipcRenderer.invoke('secure-store:set', key, value) as Promise<boolean>,
  get: (key: string) => ipcRenderer.invoke('secure-store:get', key) as Promise<string | null>,
  delete: (key: string) => ipcRenderer.invoke('secure-store:delete', key) as Promise<void>,
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('secureStore', secureStore);
} else {
  (window as Window & { secureStore?: typeof secureStore }).secureStore = secureStore;
}
