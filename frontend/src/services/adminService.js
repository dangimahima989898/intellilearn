import api from "./api"

const adminService = {
  // Students
  getStudents: async (courseId = null, semester = null, section = null, search = null) => {
    const params = new URLSearchParams()
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    if (section) params.append("section", section)
    if (search) params.append("search", search)
    const response = await api.get(`/admin/students?${params.toString()}`)
    return response.data
  },

  // Subjects
  getSubjects: async (courseId = null, semester = null) => {
    const params = new URLSearchParams()
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    const response = await api.get(`/subjects?${params.toString()}`)
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
  getArchivedSubjects: async () => {
    const response = await api.get("/subjects/archived")
    return response.data
  },
  restoreSubject: async (id) => {
    const response = await api.post(`/subjects/${id}/restore`)
    return response.data
  },
  deleteSubjectPermanent: async (id) => {
    const response = await api.delete(`/subjects/${id}/permanent`)
    return response.data
  },

  // Notes
  getNotes: async (subjectId = null, courseId = null, semester = null, includeArchived = false) => {
    const params = new URLSearchParams()
    if (subjectId) params.append("subject_id", subjectId)
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    if (includeArchived) params.append("include_archived", "true")
    const response = await api.get(`/notes?${params.toString()}`)
    return response.data
  },
  uploadNote: async (formData) => {
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
  getTimetable: async (courseId = null, semester = null) => {
    const params = new URLSearchParams()
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    const response = await api.get(`/timetable?${params.toString()}`)
    return response.data
  },
  createTimetableSlot: async (data) => {
    const response = await api.post("/timetable", data)
    return response.data
  },
  updateTimetableSlot: async (id, data) => {
    const response = await api.put(`/timetable/${id}`, data)
    return response.data
  },
  deleteTimetableSlot: async (id) => {
    const response = await api.delete(`/timetable/${id}`)
    return response.data
  },

  // Events
  getEvents: async (type = null, courseId = null, semester = null) => {
    const params = new URLSearchParams()
    if (type) params.append("event_type", type)
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    const response = await api.get(`/events?${params.toString()}`)
    return response.data
  },
  createEvent: async (data) => {
    const response = await api.post("/events", data)
    return response.data
  },
  deleteEvent: async (id) => {
    const response = await api.delete(`/events/${id}`)
    return response.data
  },

  // Enrolled Students Registry & Onboarding
  getEnrolledStudents: async (semester = null, branch = null, status = null, search = null) => {
    const params = new URLSearchParams()
    if (semester) params.append("semester", semester)
    if (branch) params.append("branch", branch)
    if (status) params.append("status", status)
    if (search) params.append("search", search)
    const response = await api.get(`/api/admin/enrolled-students?${params.toString()}`)
    return response.data
  },
  resendCredentials: async (id) => {
    const response = await api.post(`/api/admin/resend-credentials/${id}`)
    return response.data
  },
  generateCredentials: async (id) => {
    const response = await api.post(`/api/admin/generate-credentials/${id}`)
    return response.data
  },

  // Semester advancement
  advanceSemester: async (courseId, fromSemester, toSemester) => {
    const response = await api.put("/admin/advance-semester", {
      course_id: courseId,
      from_semester: fromSemester,
      to_semester: toSemester
    })
    return response.data
  },

  // Delete students
  deleteStudent: async (id) => {
    const response = await api.delete(`/admin/students/${id}`)
    return response.data
  },
  deleteEnrolledStudent: async (id) => {
    const response = await api.delete(`/api/admin/enrolled-students/${id}`)
    return response.data
  },

  // Departments
  getDepartments: async (search = null) => {
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    const response = await api.get(`/departments?${params.toString()}`)
    return response.data
  },
  getActiveDepartments: async () => {
    const response = await api.get("/departments/active")
    return response.data
  },
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`)
    return response.data
  },
  createDepartment: async (data) => {
    const response = await api.post("/departments", data)
    return response.data
  },
  updateDepartment: async (id, data) => {
    const response = await api.put(`/departments/${id}`, data)
    return response.data
  },
  deleteDepartment: async (id) => {
    const response = await api.delete(`/departments/${id}`)
    return response.data
  }
}

export default adminService
