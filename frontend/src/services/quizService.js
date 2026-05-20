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

const quizService = {
  startQuiz: async (subjectId, topic) => {
    const response = await axios.post(
      `${API_URL}/adaptive-quiz/start`,
      { subject_id: subjectId, topic },
      getAuthHeaders()
    );
    return response.data;
  },

  submitQuiz: async (attemptId, answers) => {
    const response = await axios.post(
      `${API_URL}/adaptive-quiz/submit`,
      { attempt_id: attemptId, answers },
      getAuthHeaders()
    );
    return response.data;
  },

  getHistory: async () => {
    const response = await axios.get(
      `${API_URL}/adaptive-quiz/history`,
      getAuthHeaders()
    );
    return response.data;
  },

  getWeakAreas: async () => {
    const response = await axios.get(
      `${API_URL}/adaptive-quiz/weak-areas`,
      getAuthHeaders()
    );
    return response.data;
  },
};

export default quizService;
