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

const dailyChallengeService = {
  getTodayChallenge: async () => {
    const response = await axios.get(`${API_URL}/daily-challenge/today`, getAuthHeaders());
    return response.data;
  },

  submitChallenge: async (challengeId, selectedAnswer) => {
    const response = await axios.post(
      `${API_URL}/daily-challenge/submit`,
      { challenge_id: challengeId, selected_answer: selectedAnswer },
      getAuthHeaders()
    );
    return response.data;
  },

  getLeaderboard: async () => {
    const response = await axios.get(`${API_URL}/daily-challenge/leaderboard`, getAuthHeaders());
    return response.data;
  },

  getMyHistory: async () => {
    const response = await axios.get(`${API_URL}/daily-challenge/my-history`, getAuthHeaders());
    return response.data;
  },
};

export default dailyChallengeService;
