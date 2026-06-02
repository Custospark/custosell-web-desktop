import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store/store';
import { queryClient } from './app/api/axiosConfig';
import { AppProvider } from './app/contexts/AppContext';
import { ToastProvider } from './app/contexts/ToastContext';
import { ConfirmProvider } from './shared/components/Feedback/ConfirmProvider';
import { AppRoutes } from './app/routes';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AppRoutes />
              </ConfirmProvider>
            </ToastProvider>
          </AppProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
