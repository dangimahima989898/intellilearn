import api from './api';

const placementService = {
  getTests: async (filters = {}) => {
    const response = await api.get('/api/placement-tests', { params: filters });
    return response.data;
  },

  getTestDetail: async (id) => {
    const response = await api.get(`/api/placement-tests/${id}`);
    return response.data;
  },

  startOrResumeTest: async (id) => {
    const response = await api.post(`/api/placement-tests/${id}/start`);
    return response.data;
  },

  getQuestions: async (id) => {
    const response = await api.get(`/api/placement-tests/${id}/questions`);
    return response.data;
  },

  saveAnswer: async (id, payload) => {
    const response = await api.post(`/api/placement-tests/${id}/save-answer`, payload);
    return response.data;
  },

  submitTest: async (id, payload) => {
    const response = await api.post(`/api/placement-tests/${id}/submit`, payload);
    return response.data;
  },

  getResult: async (id, attemptId) => {
    const response = await api.get(`/api/placement-tests/${id}/result/${attemptId}`);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/placement-tests/dashboard/my-tests');
    return response.data;
  },

  adminCreateTest: async (payload) => {
    const response = await api.post('/api/placement-tests/admin/create', payload);
    return response.data;
  },

  adminCreateQuestion: async (id, payload) => {
    const response = await api.post(`/api/placement-tests/admin/${id}/questions`, payload);
    return response.data;
  },

  adminImportCSV: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/placement-tests/admin/${id}/csv-import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default placementService;
