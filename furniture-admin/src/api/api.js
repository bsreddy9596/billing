import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("adminToken");
    const employeeToken = localStorage.getItem("token");

    // ❤️ Correct rule:
    // If admin logged in → always send admin token
    // Else → use employee token
    const finalToken = adminToken || employeeToken;

    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
