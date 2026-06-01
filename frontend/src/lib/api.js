// api.js — the single configured axios instance used for ALL backend calls.
// The frontend never talks to microservices directly; it only hits the API gateway
// (VITE_API_URL). This file also sets up two interceptors: one that attaches the
// JWT to every outgoing request, and one that handles errors/expired sessions globally
// so individual pages don't have to repeat that boilerplate.

import axios from 'axios';
import toast from 'react-hot-toast';

// Create a pre-configured client. baseURL points at the gateway; falls back to localhost
// in development. timeout aborts requests that hang longer than 15 seconds.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 15000,
});

// Attach JWT from localStorage to every request
// Request interceptor: runs just before each request leaves the browser.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xwz_token');
  // If we have a token, add the standard `Authorization: Bearer <token>` header so the gateway can authenticate us.
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config; // must return the (possibly modified) config for the request to proceed
});

// Global response handling
// Response interceptor: first callback handles success, second handles errors.
api.interceptors.response.use(
  (res) => res, // success: pass the response through unchanged
  (error) => {
    // Pull the HTTP status and the most useful message available (server message > axios message > generic).
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Network error';

    if (status === 401) {
      // token expired / invalid → force logout (unless we're already on auth pages)
      const path = window.location.pathname;
      // Skip the auto-logout on auth pages, otherwise a failed login would redirect onto itself.
      if (!path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/verify')) {
        localStorage.removeItem('xwz_token');
        localStorage.removeItem('xwz_user');
        toast.error('Session expired. Please log in again.');
        // Small delay lets the toast show before we hard-redirect to the login page.
        setTimeout(() => (window.location.href = '/login'), 800);
      }
    }
    // Normalize the error into a small, predictable shape so callers can rely on { status, message, errors }.
    return Promise.reject({ status, message, errors: error.response?.data?.errors });
  }
);

export default api;
