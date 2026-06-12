import api from './api';

const quizService = {
  startQuiz: async (subjectId, topic) => {
    const response = await api.post('/adaptive-quiz/start', {
      subject_id: subjectId,
      topic,
    });
    return response.data;
  },

  submitQuiz: async (attemptId, answers) => {
    const response = await api.post('/adaptive-quiz/submit', {
      attempt_id: attemptId,
      answers,
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/adaptive-quiz/history');
    return response.data;
  },

  getWeakAreas: async () => {
    const response = await api.get('/adaptive-quiz/weak-areas');
    return response.data;
  },
};

export default quizService;
