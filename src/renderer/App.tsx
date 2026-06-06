import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { store } from './app/store/store';
import { queryClient } from './app/api/axiosConfig';
import { AppProvider } from './app/contexts/AppContext';
import { ToastProvider } from './app/contexts/ToastContext';
import { ConfirmProvider } from './shared/components/Feedback/ConfirmProvider';
import NetworkOfflineOverlay from './shared/components/Errors/NetworkOfflineOverlay';
import { AppRoutes } from './app/routes';
import './App.css';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <NetworkOfflineOverlay />
          <AppProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AppRoutes />
              </ConfirmProvider>
            </ToastProvider>
          </AppProvider>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
