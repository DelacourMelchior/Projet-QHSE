import { createRoot } from 'react-dom/client';
import './index.css';
import { StoreProvider } from './store/StoreContext';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
