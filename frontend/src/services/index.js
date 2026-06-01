// services/index.js — the API layer of the frontend.
// Each exported "service" object groups the backend endpoints for one feature
// (auth, users, parkings, etc.) into named methods. Components call these instead
// of writing axios calls directly, which keeps URLs in one place and easy to change.
//
// Every method uses the shared `api` instance (so the JWT + error handling are applied),
// and `.then((r) => r.data)` unwraps axios's response object down to the backend's
// {success, message, data, meta} envelope — callers then read res.data / res.meta.

import api from '../lib/api';

// ---------------- Auth ----------------
// Signup, OTP verification, login, and "who am I?" (me) against the auth service.
export const authService = {
  signup: (payload) => api.post('/api/auth/signup', payload).then((r) => r.data),
  verifyOtp: (payload) => api.post('/api/auth/verify-otp', payload).then((r) => r.data),
  resendOtp: (email) => api.post('/api/auth/resend-otp', { email }).then((r) => r.data),
  login: (payload) => api.post('/api/auth/login', payload).then((r) => r.data),
  me: () => api.get('/api/auth/me').then((r) => r.data),
};

// ---------------- Users (admin) ----------------
// Admin-only CRUD for user accounts plus a stats summary. `params` becomes the URL query string (e.g. ?page=2).
export const userService = {
  list: (params) => api.get('/api/users', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/users/${id}`).then((r) => r.data),
  create: (payload) => api.post('/api/users', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/users/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/users/${id}`).then((r) => r.data),
  stats: () => api.get('/api/users/stats/summary').then((r) => r.data),
};

// ---------------- Parkings ----------------
// Manage parking lots; getByCode looks one up by its human-readable code, occupancy returns live fill stats.
export const parkingService = {
  list: (params) => api.get('/api/parkings', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/parkings/${id}`).then((r) => r.data),
  getByCode: (code) => api.get(`/api/parkings/code/${code}`).then((r) => r.data),
  create: (payload) => api.post('/api/parkings', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/parkings/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/parkings/${id}`).then((r) => r.data),
  occupancy: () => api.get('/api/parkings/stats/occupancy').then((r) => r.data),
};

// ---------------- Car entries ----------------
// The core workflow: record a car entering (create), mark it leaving (exit),
// and fetch its ticket/bill. PATCH is used for exit because it updates one field on an existing record.
export const carEntryService = {
  list: (params) => api.get('/api/car-entries', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/car-entries/${id}`).then((r) => r.data),
  create: (payload) => api.post('/api/car-entries', payload).then((r) => r.data),
  exit: (id) => api.patch(`/api/car-entries/${id}/exit`).then((r) => r.data),
  ticket: (id) => api.get(`/api/car-entries/${id}/ticket`).then((r) => r.data),
  bill: (id) => api.get(`/api/car-entries/${id}/bill`).then((r) => r.data),
  stats: () => api.get('/api/car-entries/stats/summary').then((r) => r.data),
};

// ---------------- Reports ----------------
// Read-only reporting endpoints (incoming/outgoing cars, revenue, occupancy) used by the Reports/Analytics pages.
export const reportService = {
  outgoing: (params) => api.get('/api/reports/outgoing', { params }).then((r) => r.data),
  incoming: (params) => api.get('/api/reports/incoming', { params }).then((r) => r.data),
  summary: () => api.get('/api/reports/summary').then((r) => r.data),
  revenue: (params) => api.get('/api/reports/revenue', { params }).then((r) => r.data),
  occupancy: () => api.get('/api/reports/occupancy').then((r) => r.data),
};
