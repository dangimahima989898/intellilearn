import api from './api';

const quizService = {
  getTopics: async (subjectId) => {
    const response = await api.get('/adaptive-quiz/topics', {
      params: { subject_id: subjectId }
    });
    return response.data;
  },

  startQuiz: async (subjectId, topic, numQuestions) => {
    const response = await api.post('/adaptive-quiz/start', {
      subject_id: subjectId,
      topic,
      num_questions: numQuestions
    });
    return response.data;
  },

  getNextQuestion: async (sessionId) => {
    const response = await api.get(`/adaptive-quiz/next-question/${sessionId}`);
    return response.data;
  },

  submitAnswer: async (attemptId, questionId, selectedAnswer, timeTakenSeconds, timeoutMs) => {
    const response = await api.post('/adaptive-quiz/answer', {
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: selectedAnswer,
      time_taken_seconds: timeTakenSeconds
    }, timeoutMs ? { timeout: timeoutMs } : undefined);
    return response.data;
  },

  getReport: async (sessionId) => {
    const response = await api.get(`/adaptive-quiz/report/${sessionId}`);
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

  getAdminAnalytics: async () => {
    const response = await api.get('/adaptive-quiz/admin/quiz-analytics');
    return response.data;
  },

  getExplanation: async (questionId, studentAnswer) => {
    const response = await api.post('/adaptive-quiz/explain', {
      question_id: questionId,
      student_answer: studentAnswer
    });
    return response.data;
  }
};

export default quizService;
