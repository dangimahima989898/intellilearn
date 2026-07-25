import api from './api';

const doubtService = {
  getDoubts: async (filters = {}) => {
    const params = {};
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.is_resolved !== undefined && filters.is_resolved !== null) {
      params.is_resolved = filters.is_resolved;
    }
    if (filters.page) params.page = filters.page;
    if (filters.size) params.size = filters.size;
    const response = await api.get('/doubts/', { params });
    return response.data;
  },

  getDoubt: async (id) => {
    const response = await api.get(`/doubts/${id}`);
    return response.data;
  },

  createDoubt: async (subjectId, questionText) => {
    const response = await api.post('/doubts/', {
      subject_id: subjectId,
      question_text: questionText,
    });
    return response.data;
  },

  answerDoubt: async (doubtId, answerText) => {
    const response = await api.post(`/doubts/${doubtId}/answers`, {
      answer_text: answerText,
    });
    return response.data;
  },

  upvoteAnswer: async (answerId) => {
    const response = await api.post(`/doubts/answers/${answerId}/upvote`);
    return response.data;
  },

  upvoteDoubt: async (doubtId) => {
    const response = await api.post(`/doubts/${doubtId}/upvote`);
    return response.data;
  },

  resolveDoubt: async (doubtId, acceptedAnswerId) => {
    const response = await api.put(`/doubts/${doubtId}/resolve`, {}, {
      params: { accepted_answer_id: acceptedAnswerId },
    });
    return response.data;
  },

  resolveDoubtAdmin: async (doubtId) => {
    const response = await api.put(`/doubts/${doubtId}/admin-resolve`);
    return response.data;
  },

  toggleAnswerVerification: async (answerId) => {
    const response = await api.put(`/doubts/answers/${answerId}/verify`);
    return response.data;
  },

  flagAnswer: async (answerId, flagReason) => {
    const response = await api.post(`/doubts/answers/${answerId}/flag`, {
      flag_reason: flagReason,
    });
    return response.data;
  },
};

export default doubtService;
