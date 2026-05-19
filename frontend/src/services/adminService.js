import api from "./api"

const adminService = {
  // Subjects
  getSubjects: async () => {
    const response = await api.get("/subjects")
    return response.data
  },
  createSubject: async (data) => {
    const response = await api.post("/subjects", data)
    return response.data
  },
  updateSubject: async (id, data) => {
    const response = await api.put(`/subjects/${id}`, data)
    return response.data
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`/subjects/${id}`)
    return response.data
  },

  // Notes
  getNotes: async (subjectId = null) => {
    const url = subjectId ? `/notes?subject_id=${subjectId}` : "/notes"
    const response = await api.get(url)
    return response.data
  },
  uploadNote: async (formData) => {
    // Note: for multipart/form-data, the API interceptor handles the token,
    // and axios automatically sets the multipart content-type when passing FormData
    const response = await api.post("/notes/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data
  },
  downloadNote: async (id) => {
    const response = await api.get(`/notes/download/${id}`, { responseType: 'blob' })
    return response.data
  },
  deleteNote: async (id) => {
    const response = await api.delete(`/notes/${id}`)
    return response.data
  },

  // Timetable
  getTimetable: async () => {
    const response = await api.get("/timetable")
    return response.data
  },
  createTimetableSlot: async (data) => {
    const response = await api.post("/timetable", data)
    return response.data
  },
  deleteTimetableSlot: async (id) => {
    const response = await api.delete(`/timetable/${id}`)
    return response.data
  },

  // Events
  getEvents: async (type = null) => {
    const url = type ? `/events?event_type=${type}` : "/events"
    const response = await api.get(url)
    return response.data
  },
  createEvent: async (data) => {
    const response = await api.post("/events", data)
    return response.data
  },
  deleteEvent: async (id) => {
    const response = await api.delete(`/events/${id}`)
    return response.data
  }
}

export default adminService
