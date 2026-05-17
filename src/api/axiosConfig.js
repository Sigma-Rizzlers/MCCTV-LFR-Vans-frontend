import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token to every request if one exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Log errors; clear stale token when the server says 401 (token no longer valid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    console.error(`[API Error] ${status} on ${url}`, error.response?.data ?? error.message);

    // A 401 on any authenticated endpoint means the stored token is stale —
    // remove it so the UI shows the Admin login button instead of stale state.
    if (status === 401) {
      localStorage.removeItem("authToken");
      // Dispatch a custom event so App.jsx can update isAuthenticated state
      window.dispatchEvent(new Event("auth:logout"));
    }

    return Promise.reject(error);
  }
);

export default api;
