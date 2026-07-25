import api from './api'

const summaryService = {
  uploadSummaryNote: async (formData) => {
    const response = await api.post('/notes/summary-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  getDraftSummaries: async () => {
    const response = await api.get('/notes/draft-summaries')
    return response.data
  },

  approveSummary: async (summaryId, summaryText) => {
    const response = await api.post(`/notes/approve/${summaryId}`, { summary_text: summaryText })
    return response.data
  },

  rejectSummary: async (summaryId, reason) => {
    const response = await api.post(`/notes/reject/${summaryId}`, { reason })
    return response.data
  },

  getApprovedSummaries: async (subjectId) => {
    const response = await api.get(`/notes/summaries/${subjectId}`)
    return response.data
  },

  incrementSummaryViews: async (summaryId) => {
    const response = await api.post(`/notes/summaries/view/${summaryId}`)
    return response.data
  },

  submitSummaryFeedback: async (summaryId, isHelpful, timeSpentSeconds) => {
    const response = await api.post(`/notes/feedback/${summaryId}`, {
      is_helpful: isHelpful,
      time_spent_seconds: timeSpentSeconds
    })
    return response.data
  },

  getSummaryVersions: async (summaryId) => {
    const response = await api.get(`/notes/versions/${summaryId}`)
    return response.data
  },

  regenerateSummary: async (noteId) => {
    const response = await api.post(`/notes/regenerate/${noteId}`)
    return response.data
  },

  downloadSummaryPdf: async (summaryId) => {
    const response = await api.get(`/notes/download-summary-pdf/${summaryId}`, {
      responseType: 'blob'
    })
    return response.data
  },

  getAdminNotesAnalytics: async () => {
    const response = await api.get('/notes/admin/analytics')
    return response.data
  }
}

export default summaryService
