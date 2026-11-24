import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/space-grotesk/latin-700.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
