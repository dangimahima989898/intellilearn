import api from "./api"

const hodService = {
  // Dashboard stats
  getDashboardStats: async () => {
    const response = await api.get("/api/v1/hod/dashboard/stats")
    return response.data
  },

  // Student registrations approval
  getPendingStudents: async () => {
    const response = await api.get("/api/v1/hod/students/pending-approvals")
    return response.data
  },
  reviewStudentRegistration: async (enrollmentId, action, note = "") => {
    const response = await api.post(`/api/v1/hod/students/${enrollmentId}/review`, {
      action,
      note
    })
    return response.data
  },
  getAllStudents: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append("search", params.search)
    if (params.courseId || params.department) query.append("department", params.courseId || params.department)
    if (params.semesterId || params.semester) query.append("semester", params.semesterId || params.semester)
    if (params.approvalStatus || params.status) query.append("status", params.approvalStatus || params.status)
    if (params.limit) query.append("limit", params.limit)
    if (params.offset) query.append("offset", params.offset)
    
    const response = await api.get(`/api/v1/hod/students/all?${query.toString()}`)
    return response.data
  },
  getStudentsSummaryCounts: async () => {
    const response = await api.get("/api/v1/hod/students/summary-counts")
    return response.data
  },

  // Faculty workload & assignment
  getFacultyList: async () => {
    const response = await api.get("/api/v1/hod/faculty/all")
    return response.data
  },
  registerFaculty: async (data) => {
    const response = await api.post("/api/v1/hod/faculty/register", data)
    return response.data
  },
  assignSubject: async (facultyId, subjectId, role = "primary") => {
    const response = await api.post("/api/v1/hod/faculty/assign-subject", {
      faculty_id: facultyId,
      subject_id: subjectId,
      role
    })
    return response.data
  },
  unassignSubject: async (assignmentId) => {
    const response = await api.delete(`/api/v1/hod/faculty/unassign-subject/${assignmentId}`)
    return response.data
  },
  getUnassignedSubjects: async () => {
    const response = await api.get("/api/v1/hod/faculty/unassigned-subjects")
    return response.data
  },
  getFacultyWorkload: async (facultyId) => {
    const response = await api.get(`/api/v1/hod/faculty/${facultyId}/workload`)
    return response.data
  },

  // Leave Management
  getPendingLeaves: async () => {
    const response = await api.get("/api/v1/hod/leave/pending")
    return response.data
  },
  reviewLeave: async (leaveId, status, rejectionReason = "", substitutions = []) => {
    if (status === "approved") {
      const response = await api.post(`/api/v1/hod/leave/${leaveId}/approve`, { substitutions })
      return response.data
    } else {
      const response = await api.post(`/api/v1/hod/leave/${leaveId}/reject`, { rejection_reason: rejectionReason })
      return response.data
    }
  },
  getLeaveImpact: async (leaveId) => {
    const response = await api.get(`/api/v1/hod/leave/${leaveId}/impact`)
    return response.data
  },
  assignSubstitutions: async (leaveId, substitutions) => {
    const response = await api.post(`/api/v1/hod/leave/${leaveId}/substitute`, { substitutions })
    return response.data
  },
  getAllLeaves: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.append("status", params.status)
    if (params.month) query.append("month", params.month)
    if (params.year) query.append("year", params.year)
    if (params.branch || params.dept) query.append("dept", params.branch || params.dept)
    
    const response = await api.get(`/api/v1/hod/leave/all?${query.toString()}`)
    return response.data
  },
  getLeaveCalendar: async () => {
    const response = await api.get("/api/v1/hod/leave/calendar")
    return response.data
  },

  // Moderation Hub
  getFlaggedAnswers: async (status = "pending") => {
    const response = await api.get(`/api/v1/hod/moderation/flagged-answers?status=${status}`)
    return response.data
  },
  getFlaggedAnswerCounts: async () => {
    const response = await api.get("/api/v1/hod/moderation/flagged-answers/counts")
    return response.data
  },
  reviewFlaggedAnswer: async (flagId, action, adminNote = "", correctAnswer = "") => {
    const response = await api.post(`/api/v1/hod/moderation/flagged-answers/${flagId}/review`, {
      action,
      admin_note: adminNote,
      correct_answer: correctAnswer
    })
    return response.data
  },
  getAccessRequests: async (status = "pending") => {
    const response = await api.get(`/api/v1/hod/moderation/access-requests?status=${status}`)
    return response.data
  },
  reviewAccessRequest: async (requestId, action, note = "") => {
    const response = await api.post(`/api/v1/hod/moderation/access-requests/${requestId}/review`, {
      action,
      note
    })
    return response.data
  },
  getModerationHistory: async () => {
    const response = await api.get("/api/v1/hod/moderation/history")
    return response.data
  },

  // Announcements / Notifications
  sendAnnouncement: async (data) => {
    const response = await api.post("/api/v1/hod/notifications/create", {
      title: data.title,
      message: data.body,
      target_type: data.target_type,
      target_dept: data.target_dept,
      target_semester_id: data.target_semester_id,
      target_subject_id: data.target_subject_id,
      send_now: data.sendMode !== "schedule",
      scheduled_for: data.scheduled_for
    })
    return response.data
  },
  getSentAnnouncements: async () => {
    const response = await api.get("/api/v1/hod/notifications/sent")
    return response.data
  },
  getAnnouncementStats: async (id) => {
    const response = await api.get(`/api/v1/hod/notifications/${id}/delivery-stats`)
    return response.data
  },
  getAnnouncementHistory: async () => {
    const response = await api.get("/api/v1/hod/notifications/sent")
    return response.data
  },

  // Department Analytics
  getAnalyticsSummary: async () => {
    const response = await api.get("/api/v1/hod/analytics/summary")
    return response.data
  },
  getPerformanceHeatmap: async () => {
    const response = await api.get("/api/v1/hod/analytics/heatmap")
    return response.data
  },
  getStudentProgress: async () => {
    const response = await api.get("/api/v1/hod/analytics/student-progress")
    return response.data
  },
  getFacultyPerformance: async () => {
    const response = await api.get("/api/v1/hod/analytics/faculty-performance")
    return response.data
  },
  getComparativeReport: async () => {
    const response = await api.get("/api/v1/hod/analytics/comparative")
    return response.data
  },
  getMissedQuestions: async () => {
    const response = await api.get("/api/v1/hod/analytics/missed-questions")
    return response.data
  },

  // AI Suggestions
  getAiSuggestion: async () => {
    const response = await api.get("/api/v1/hod/dashboard/ai-suggestion")
    return response.data
  },

  // Archive / Trash
  getArchivedItems: async () => {
    const response = await api.get("/api/v1/hod/archive")
    return response.data
  },
  getArchiveActivityLog: async () => {
    const response = await api.get("/api/v1/hod/archive/activity-log")
    return response.data
  },
  bulkRestoreItems: async (ids) => {
    const response = await api.post("/api/v1/hod/archive/bulk-restore", { ids })
    return response.data
  },
  bulkDeleteItems: async (ids) => {
    const response = await api.post("/api/v1/hod/archive/bulk-delete", { ids })
    return response.data
  },
  exportArchiveActivityLog: async () => {
    const response = await api.get("/api/v1/hod/archive/activity-log/export")
    return response.data
  },

  // Department Management
  getDepartments: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append("search", params.search)
    if (params.status) query.append("status", params.status)
    if (params.sort) query.append("sort", params.sort)
    if (params.page) query.append("page", params.page)
    if (params.limit) query.append("limit", params.limit)
    if (params.academic_year) query.append("academic_year", params.academic_year)
    const response = await api.get(`/api/hod/departments?${query.toString()}`)
    return response.data
  },
  createDepartment: async (data) => {
    const response = await api.post("/api/hod/departments", data)
    return response.data
  },
  updateDepartment: async (id, data) => {
    const response = await api.put(`/api/hod/departments/${id}`, data)
    return response.data
  },
  deleteDepartment: async (id) => {
    const response = await api.delete(`/api/hod/departments/${id}`)
    return response.data
  },
  patchDepartmentStatus: async (id, status) => {
    const response = await api.patch(`/api/hod/departments/${id}/status?status=${status}`)
    return response.data
  },
  getEligibleHods: async () => {
    const response = await api.get("/api/hod/faculty/hod-list")
    return response.data
  },

  // ── Subject Management (v2) ──────────────────────────────────────────────────
  getSubjects: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append("search", params.search)
    if (params.department_id) query.append("department_id", params.department_id)
    if (params.semester_no) query.append("semester_no", params.semester_no)
    if (params.status) query.append("status", params.status)
    if (params.subject_type) query.append("subject_type", params.subject_type)
    if (params.page) query.append("page", params.page)
    if (params.limit) query.append("limit", params.limit)
    const response = await api.get(`/api/hod/subjects?${query.toString()}`)
    return response.data
  },

  getSubjectStats: async () => {
    const response = await api.get("/api/hod/subjects/stats")
    return response.data
  },

  getSubjectDepartments: async () => {
    const response = await api.get("/api/hod/subjects/departments")
    return response.data
  },

  getDeptSemesters: async (deptId) => {
    const response = await api.get(`/api/hod/subjects/departments/${deptId}/semesters`)
    return response.data
  },

  getSubjectFaculty: async (departmentId) => {
    const query = departmentId ? `?department_id=${departmentId}` : ""
    const response = await api.get(`/api/hod/subjects/faculty${query}`)
    return response.data
  },

  createSubject: async (data) => {
    const response = await api.post("/api/hod/subjects", data)
    return response.data
  },

  updateSubject: async (id, data) => {
    const response = await api.put(`/api/hod/subjects/${id}`, data)
    return response.data
  },

  patchSubjectStatus: async (id, status) => {
    const response = await api.patch(`/api/hod/subjects/${id}/status`, { status })
    return response.data
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/api/hod/subjects/${id}`)
    return response.data
  }
}

export default hodService
