import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = {
  // Clients
  getClients: () => axios.get(`${API_URL}/clients`),
  createClient: (data) => axios.post(`${API_URL}/clients`, data),
  updateClient: (id, data) => axios.put(`${API_URL}/clients/${id}`, data),
  deleteClient: (id) => axios.delete(`${API_URL}/clients/${id}`),

  // Vehicles
  getVehicles: () => axios.get(`${API_URL}/vehicles`),
  getVehiclesByClient: (clientId) => axios.get(`${API_URL}/vehicles/by-client/${clientId}`),
  createVehicle: (data) => axios.post(`${API_URL}/vehicles`, data),
  updateVehicle: (id, data) => axios.put(`${API_URL}/vehicles/${id}`, data),
  deleteVehicle: (id) => axios.delete(`${API_URL}/vehicles/${id}`),

  // Services
  getServices: () => axios.get(`${API_URL}/services`),
  createService: (data) => axios.post(`${API_URL}/services`, data),
  updateService: (id, data) => axios.put(`${API_URL}/services/${id}`, data),
  deleteService: (id) => axios.delete(`${API_URL}/services/${id}`),

  // Parts
  getParts: () => axios.get(`${API_URL}/parts`),
  createPart: (data) => axios.post(`${API_URL}/parts`, data),
  updatePart: (id, data) => axios.put(`${API_URL}/parts/${id}`, data),
  deletePart: (id) => axios.delete(`${API_URL}/parts/${id}`),

  // Appointments
  getAppointments: () => axios.get(`${API_URL}/appointments`),
  createAppointment: (data) => axios.post(`${API_URL}/appointments`, data),
  updateAppointment: (id, data) => axios.put(`${API_URL}/appointments/${id}`, data),
  deleteAppointment: (id) => axios.delete(`${API_URL}/appointments/${id}`),

  // Quotes
  getQuotes: () => axios.get(`${API_URL}/quotes`),
  createQuote: (data) => axios.post(`${API_URL}/quotes`, data),
  updateQuote: (id, data) => axios.put(`${API_URL}/quotes/${id}`, data),
  updateQuoteStatus: (id, status) => axios.patch(`${API_URL}/quotes/${id}/status`, { status }),
  deleteQuote: (id) => axios.delete(`${API_URL}/quotes/${id}`),
  approveQuote: (id) => axios.post(`${API_URL}/quotes/${id}/approve`),
  rejectQuote: (id) => axios.post(`${API_URL}/quotes/${id}/reject`),
  downloadQuotePDF: (id) => axios.get(`${API_URL}/quotes/${id}/pdf`, { responseType: 'blob' }),

  // Settings
  getSettings: () => axios.get(`${API_URL}/settings`),
  updateSettings: (data) => axios.put(`${API_URL}/settings`, data),

  // Dashboard
  getDashboardStats: () => axios.get(`${API_URL}/dashboard/stats`),
};

export default api;
