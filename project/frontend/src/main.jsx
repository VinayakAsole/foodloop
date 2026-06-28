import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { runTestSuite } from './utils/testSuite';

if (import.meta.env.DEV) {
  runTestSuite();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Defer PWA Service Worker registration until browser is idle
// This prevents SW installation from competing with initial page rendering
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('PWA Service Worker active:', reg.scope))
      .catch((err) => console.error('PWA Service Worker failed:', err));
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(registerSW);
  } else {
    setTimeout(registerSW, 2000);
  }
}

