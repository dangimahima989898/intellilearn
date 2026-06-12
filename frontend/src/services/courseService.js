import api from "./api"

const courseService = {
  getCourses: async () => {
    const response = await api.get("/courses")
    return response.data
  },
  getSemesters: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/semesters`)
    return response.data
  },
  getStudentCount: async (courseId, semester) => {
    const params = new URLSearchParams()
    if (courseId) params.append("course_id", courseId)
    if (semester) params.append("semester", semester)
    const response = await api.get(`/courses/students/count?${params.toString()}`)
    return response.data
  }
}

export default courseService
