import api from './api'

const studentService = {
  // Analytics
  getOverview: async () => {
    const response = await api.get('/analytics/student/overview')
    return response.data
  },
  
  getScoreHistory: async () => {
    const response = await api.get('/analytics/student/score-history')
    return response.data
  },
  
  getLeaderboard: async () => {
    const response = await api.get('/analytics/leaderboard')
    return response.data
  },

  updateStreak: async () => {
    const response = await api.put('/analytics/students/update-streak')
    return response.data
  },

  // Resources
  getNotes: async (subjectId = null) => {
    const url = subjectId ? `/notes?subject_id=${subjectId}` : '/notes'
    const response = await api.get(url)
    return response.data
  },
  
  downloadNote: async (id) => {
    const response = await api.get(`/notes/download/${id}`, { responseType: 'blob' })
    return response.data
  },
  
  // Schedule
  getTimetable: async () => {
    const response = await api.get('/timetable')
    return response.data
  },
  
  getEvents: async () => {
    const response = await api.get('/events')
    return response.data
  },
  
  // Configuration
  getSubjects: async () => {
    const response = await api.get('/subjects')
    return response.data
  }
}

export default studentService
