import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const doubtService = {
  getDoubts: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subject_id) params.append('subject_id', filters.subject_id);
    if (filters.is_resolved !== undefined) params.append('is_resolved', filters.is_resolved);
    
    const response = await axios.get(`${API_URL}/doubts/?${params.toString()}`, getAuthHeaders());
    return response.data;
  },

  getDoubt: async (id) => {
    const response = await axios.get(`${API_URL}/doubts/${id}`, getAuthHeaders());
    return response.data;
  },

  createDoubt: async (subjectId, questionText) => {
    const response = await axios.post(
      `${API_URL}/doubts/`,
      { subject_id: subjectId, question_text: questionText },
      getAuthHeaders()
    );
    return response.data;
  },

  answerDoubt: async (doubtId, answerText) => {
    const response = await axios.post(
      `${API_URL}/doubts/${doubtId}/answers`,
      { answer_text: answerText },
      getAuthHeaders()
    );
    return response.data;
  },

  upvoteAnswer: async (answerId) => {
    const response = await axios.post(
      `${API_URL}/doubts/answers/${answerId}/upvote`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  resolveDoubt: async (doubtId, acceptedAnswerId) => {
    const response = await axios.put(
      `${API_URL}/doubts/${doubtId}/resolve?accepted_answer_id=${acceptedAnswerId}`,
       {}, 
       getAuthHeaders()
    );
    return response.data;
  },
};

export default doubtService;
