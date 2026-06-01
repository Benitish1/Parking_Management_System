// main.jsx — application entry point.
// This is the very first file that runs in the browser. Its job is to mount the
// React app into the page and wrap it in the "global" providers (theme, routing,
// auth) plus the toast notification system so every component can use them.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Find the <div id="root"> in index.html and render the whole React tree into it.
ReactDOM.createRoot(document.getElementById('root')).render(
  // Provider order matters: outer providers are available to everything inside them.
  // ThemeProvider (dark/light) > BrowserRouter (URL routing) > AuthProvider (login state).
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
          {/* Toaster renders react-hot-toast pop-up notifications app-wide; styled here to match the dark glassy theme. */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: 'rgba(17,22,42,0.95)',
                color: '#e5e7eb',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              },
              success: { iconTheme: { primary: '#34d399', secondary: '#0b1020' } },
              error: { iconTheme: { primary: '#f43f5e', secondary: '#0b1020' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
