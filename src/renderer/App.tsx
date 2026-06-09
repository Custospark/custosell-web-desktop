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
import { UpdateNotification } from './shared/components/Feedback/UpdateNotification';
import { AppRoutes } from './app/routes';
import { AuthBootstrap } from './app/components/AuthBootstrap';
import { LogoutProvider } from './app/contexts/LogoutContext';
import './App.css';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;

const CACHE_VERSION = 'v2';

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
          <LogoutProvider>
            <AppProvider>
              <ToastProvider>
              <NetworkOfflineOverlay />
              {isElectron && <UpdateNotification />}
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
