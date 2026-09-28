import { createRoot } from 'react-dom/client';
import './index.css';
import { StoreProvider } from './store/StoreContext';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <ErrorBoundary label="L'application" onBack={() => { window.location.hash = ''; }}>
      <App />
    </ErrorBoundary>
  </StoreProvider>,
);
