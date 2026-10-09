import { createRoot } from 'react-dom/client';
import './index.css';
import { StoreProvider } from './store/StoreContext';
import { rawLocal } from './store/local';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';

// Two boundaries, both offering the raw data: the inner one keeps the store alive when a screen fails; the outer one is for the store itself failing on data it cannot use
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary label="L'application" raw={rawLocal}>
    <StoreProvider>
      <ErrorBoundary label="L'application" raw={rawLocal} onBack={() => { window.location.hash = ''; }}>
        <App />
      </ErrorBoundary>
    </StoreProvider>
  </ErrorBoundary>,
);
