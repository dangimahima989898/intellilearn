import api from "./api"

const authService = {
  register: async (name, email, password, role = "student", extra = {}) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
      ...extra
    })
    return response.data
  },

  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password })
    return response.data
  },

  getMe: async () => {
    const response = await api.get("/auth/me")
    return response.data
  },

  updateFCMToken: async (fcm_token) => {
    const response = await api.put("/auth/update-fcm-token", { fcm_token })
    return response.data
  },

  changePassword: async (current_password, new_password) => {
    const response = await api.put("/auth/change-password", {
      current_password,
      new_password,
    })
    return response.data
  },

  logout: () => {
    localStorage.removeItem("intellilearn_token")
    localStorage.removeItem("intellilearn_user")
  },
}

export default authService
