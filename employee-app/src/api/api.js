import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// ✅ ADMIN + EMPLOYEE TOKEN SUPPORT
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("token");
    const employeeToken = localStorage.getItem("employeeToken");

    const token = adminToken || employeeToken;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
