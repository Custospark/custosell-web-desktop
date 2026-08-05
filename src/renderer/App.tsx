import { Provider } from 'react-redux';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { store } from './app/store/store';
import { queryClient } from './app/api/axiosConfig';
import { shouldPersistQuery } from './app/api/queryPersist';
import { AppProvider } from './app/contexts/AppContext';
import { ToastProvider } from './app/contexts/ToastContext';
import { ConfirmProvider } from './shared/components/Feedback/ConfirmProvider';
import NetworkOfflineOverlay from './shared/components/Errors/NetworkOfflineOverlay';
import { AppRoutes } from './app/routes';
import { AuthBootstrap } from './app/components/AuthBootstrap';
import { LogoutProvider } from './app/contexts/LogoutContext';
import { ScrollToTop } from './shared/components/routing/ScrollToTop';
import { PwaInstallPrompt } from './shared/components/pwa/PwaInstallPrompt';
import { ServiceWorkerNotificationsBridge } from './app/sw/ServiceWorkerNotificationsBridge';
import { unlockAudio } from './app/sound/orderChime';
import './App.css';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;

const CACHE_VERSION = 'v3';

if (typeof window !== 'undefined') {
  // Browsers/Electron require a user gesture before an AudioContext can start —
  // unlock once on the first interaction so polling chimes can play afterwards.
  const unlockOnce = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { passive: true });
  window.addEventListener('keydown', unlockOnce);
}

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'CUSTOSELL_QUERY_CACHE',
  throttleTime: 1000,
});

function App() {
  return (
    <Provider store={store}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 30,
          buster: CACHE_VERSION,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersistQuery,
          },
        }}
      >
        <Router>
          <ScrollToTop />
          <PwaInstallPrompt />
          <ServiceWorkerNotificationsBridge />
          <LogoutProvider>
            <AppProvider>
              <ToastProvider>
              <NetworkOfflineOverlay />
              <ConfirmProvider>
                  <AuthBootstrap>
                    <AppRoutes />
                  </AuthBootstrap>
                </ConfirmProvider>
              </ToastProvider>
            </AppProvider>
          </LogoutProvider>
        </Router>
      </PersistQueryClientProvider>
    </Provider>
  );
}

export default App;
