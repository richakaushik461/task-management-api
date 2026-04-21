import React, { useState } from 'react';
import api from '../services/api';

const TaskForm = ({ onTaskCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!formData.title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }
    
    try {
      const res = await api.post('/tasks', {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'pending'
      });
      console.log('Task created:', res.data);
      onTaskCreated(res.data.data.task);
      setFormData({ title: '', description: '', priority: 'medium' });
    } catch (error) {
      console.error('Task creation error:', error);
      setError(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}
      <input
        type="text"
        placeholder="Task title (required)"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <div className="form-row">
        <select 
          value={formData.priority} 
          onChange={(e) => setFormData({...formData, priority: e.target.value})}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : '+ Add Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
