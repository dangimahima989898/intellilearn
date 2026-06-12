import api from './api';

const dailyChallengeService = {
  getTodayChallenge: async () => {
    const response = await api.get('/daily-challenge/today');
    return response.data;
  },

  submitChallenge: async (challengeId, selectedAnswer) => {
    const response = await api.post('/daily-challenge/submit', {
      challenge_id: challengeId,
      selected_answer: selectedAnswer,
    });
    return response.data;
  },

  getLeaderboard: async () => {
    const response = await api.get('/daily-challenge/leaderboard');
    return response.data;
  },

  getMyHistory: async () => {
    const response = await api.get('/daily-challenge/my-history');
    return response.data;
  },
};

export default dailyChallengeService;
