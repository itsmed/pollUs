import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { configure } from '@votr/shared';
import '../app/globals.css';
import App from './App';

configure({ apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
