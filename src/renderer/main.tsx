import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { onlineManager } from '@tanstack/react-query';
import App from './App';
import { registerServiceWorker } from './app/sw/registerServiceWorker';
import { store } from './app/store/store';

const initialStatus = store.getState().network.systemStatus;
onlineManager.setOnline(initialStatus === 'online' || initialStatus === 'slow');

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
