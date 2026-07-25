import axios from "axios"
import toast from "react-hot-toast"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
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

// Helper to handle and display response errors after retries are exhausted
const handleResponseError = (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("intellilearn_token")
    localStorage.removeItem("intellilearn_user")
    window.location.href = "/login"
    toast.error("Session expired. Please log in again.", { id: "session_expired" })
  } else if (error.code === "ECONNABORTED") {
    toast.error("Request timed out. The server is taking too long to respond.", { id: "timeout_error" })
  } else if (!error.response) {
    // No response at all — backend is likely down or CORS issue
    const msg = error.message?.includes("Network Error")
      ? "Cannot reach the server. Make sure the backend is running on port 8000."
      : `Network error: ${error.message}`
    toast.error(msg, { id: "connection_error" })
  }
  return Promise.reject(error)
}

// Response interceptor: handle errors globally with automatic retries for GET requests
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase()
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      window.dispatchEvent(new CustomEvent('badge-update'))
    }
    // Dismiss any active retry toasts for this URL on success
    if (response.config?.url) {
      toast.dismiss(`retry_${response.config.url}`)
    }
    return response
  },
  async (error) => {
    const { config } = error

    // Retry only GET requests on timeout or network errors (no response)
    const isGetRequest = config?.method?.toLowerCase() === 'get'
    const isTimeoutOrNetworkError = error.code === 'ECONNABORTED' || !error.response

    if (!config || !isGetRequest || !isTimeoutOrNetworkError) {
      return handleResponseError(error)
    }

    // Set or increment retry count
    config.__retryCount = config.__retryCount || 0
    const RETRY_LIMIT = 3

    if (config.__retryCount >= RETRY_LIMIT) {
      // Retries exhausted, dismiss retry toast and show final error
      toast.dismiss(`retry_${config.url}`)
      return handleResponseError(error)
    }

    config.__retryCount += 1

    // Wait with exponential backoff (1s, 2s, 3s)
    const delay = 1000 * config.__retryCount
    const backoff = new Promise((resolve) => setTimeout(resolve, delay))

    toast.loading(
      `Connection slow. Retrying request (${config.__retryCount}/${RETRY_LIMIT})...`,
      { id: `retry_${config.url}` }
    )

    await backoff
    return api(config)
  }
)

export default api
