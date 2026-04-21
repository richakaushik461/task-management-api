import api from './api';

export const taskService = {
  getAllTasks: (params = {}) => {
    return api.get('/tasks', { params });
  },

  getTask: (id) => {
    return api.get(`/tasks/${id}`);
  },

  createTask: (taskData) => {
    return api.post('/tasks', taskData);
  },

  updateTask: (id, taskData) => {
    return api.put(`/tasks/${id}`, taskData);
  },

  deleteTask: (id) => {
    return api.delete(`/tasks/${id}`);
  }
};