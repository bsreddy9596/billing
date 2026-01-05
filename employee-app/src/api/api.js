import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

/* 🔑 ATTACH TOKEN AUTOMATICALLY */
api.interceptors.request.use(
  (config) => {
    const employeeToken = localStorage.getItem("employeeToken");
    const adminToken = localStorage.getItem("adminToken");

    const token = employeeToken || adminToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
