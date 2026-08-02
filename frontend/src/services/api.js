import React from "react"
import axios from "axios"
import toast from "react-hot-toast"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
})

// Track active requests to disable/enable submit buttons globally
let activeRequests = 0;
let observer = null;

const updateSubmitButtons = (loading) => {
  const buttons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
  buttons.forEach(button => {
    if (loading) {
      if (button.getAttribute('data-originally-disabled') === null) {
        button.setAttribute('data-originally-disabled', button.disabled ? 'true' : 'false');
      }
      button.disabled = true;
    } else {
      const originallyDisabled = button.getAttribute('data-originally-disabled');
      if (originallyDisabled === 'true') {
        button.disabled = true;
      } else {
        button.disabled = false;
      }
      button.removeAttribute('data-originally-disabled');
    }
  });
};

const startButtonObserver = () => {
  if (observer) return;
  observer = new MutationObserver(() => {
    updateSubmitButtons(true);
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

const stopButtonObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

const incrementActiveRequests = () => {
  activeRequests++;
  console.log(`[API Request Start] Active requests count: ${activeRequests}`);
  updateSubmitButtons(true);
  if (activeRequests === 1) {
    startButtonObserver();
  }
};

const decrementActiveRequests = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  console.log(`[API Request End] Active requests count: ${activeRequests}`);
  if (activeRequests === 0) {
    stopButtonObserver();
    updateSubmitButtons(false);
  }
};

// Request interceptor: attach JWT token to every request and increment active request count for write requests
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toLowerCase();
    if (["post", "put", "delete", "patch"].includes(method)) {
      incrementActiveRequests();
    }
    const token = localStorage.getItem("intellilearn_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    const method = error.config?.method?.toLowerCase();
    if (error.config && ["post", "put", "delete", "patch"].includes(method)) {
      decrementActiveRequests();
    }
    return Promise.reject(error);
  }
)

// Helper to check if a URL is an analytics request
const isAnalyticsRequest = (config) => {
  if (!config || !config.url) return false;
  const url = config.url.toLowerCase();
  return url.includes("analytics") || url.includes("dashboard/stats") || url.includes("faculty/all");
};

// Helper to handle and display response errors after retries are exhausted or on non-GET / timeout errors
const handleResponseError = (error) => {
  if (axios.isCancel(error)) {
    return Promise.reject(error);
  }

  if (error.response?.status === 401) {
    localStorage.removeItem("intellilearn_token")
    localStorage.removeItem("intellilearn_user")
    window.location.href = "/login"
    toast.dismiss();
    toast.error("Session expired. Please log in again.", { id: "session_expired" })
    return Promise.reject(error);
  }

  // If this is an analytics request, suppress all toasts to prevent UI clutter/spam
  if (isAnalyticsRequest(error.config)) {
    return Promise.reject(error);
  }

  const isTimeout = error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout");
  const isNetworkError = !error.response;

  if (isTimeout || isNetworkError) {
    const friendlyMessage = "We're having trouble connecting right now. Please check your internet connection and try again.";
    // Propagate the network error silently to components so they stay in loading state without popups
    return Promise.reject(new Error(friendlyMessage));
  }


  // Handle other types of errors (e.g. 400, 500)
  const fallbackMsg = error.response?.data?.detail || error.message || "An unexpected error occurred.";
  toast.dismiss();
  toast.error(fallbackMsg, { id: `error_${error.config?.url || "global"}` });
  return Promise.reject(error);
}

// Response interceptor: handle errors globally with automatic retries for GET requests
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    if (["post", "put", "delete", "patch"].includes(method)) {
      decrementActiveRequests();
      window.dispatchEvent(new CustomEvent('badge-update'))
    }
    // Dismiss any active loading/error toasts for this URL on success
    if (response.config?.url) {
      toast.dismiss(`loading_${response.config.url}`);
      toast.dismiss(`error_${response.config.url}`);
    }
    return response
  },
  async (error) => {
    const method = error.config?.method?.toLowerCase();
    if (error.config && ["post", "put", "delete", "patch"].includes(method)) {
      decrementActiveRequests();
    }
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    const { config } = error

    if (!config) {
      return Promise.reject(error)
    }

    const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')
    const isGetRequest = config.method?.toLowerCase() === 'get'
    const isNetworkError = !error.response && !isTimeout

    // Log detailed retry errors only in the browser console.
    console.error("API request failed:", {
      url: config.url,
      method: config.method,
      retryCount: config.__retryCount || 0,
      code: error.code,
      message: error.message,
      errorDetail: error
    });

    // Retry only GET requests on network errors (do NOT retry timeouts/ECONNABORTED)
    if (isGetRequest && isNetworkError) {
      config.__retryCount = config.__retryCount || 0
      const RETRY_LIMIT = 3

      if (config.__retryCount < RETRY_LIMIT) {
        config.__retryCount += 1

        // Silent background retry with exponential backoff
        const delay = 1000 * Math.pow(2, config.__retryCount - 1)
        const backoff = new Promise((resolve) => setTimeout(resolve, delay))

        // Suppress toasts on analytics endpoints
        if (!isAnalyticsRequest(config)) {
          toast.dismiss();
          toast.loading("Please wait while we process your request.", {
            id: `loading_${config.url}`
          })
        }

        await backoff
        return api(config)
      }
    }

    // Fall back to general error handler
    return handleResponseError(error)
  }
)

export default api
