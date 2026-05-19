import axios from "axios"
import toast from "react-hot-toast"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
})

// Request interceptor: attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("intellilearn_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("intellilearn_token")
      localStorage.removeItem("intellilearn_user")
      window.location.href = "/login"
      toast.error("Session expired. Please log in again.")
    } else if (error.code === "ECONNABORTED" || !error.response) {
      toast.error("Connection error. Check your internet.")
    }
    return Promise.reject(error)
  }
)

export default api
