import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/tasks');
      console.log('Tasks fetched:', res.data);
      setTasks(res.data.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError(error.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTaskCreated = (newTask) => {
    setTasks([newTask, ...tasks]);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(tasks.filter(t => t._id !== taskId));
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading">Loading your tasks...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome, {user?.name || 'User'}!</h1>
          {error && <div className="error-message">{error}</div>}
          <div className="stats">
            <div className="stat-card">
              <h3>{stats.total}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card">
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
            <div className="stat-card">
              <h3>{stats.inProgress}</h3>
              <p>In Progress</p>
            </div>
            <div className="stat-card">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
        </div>
        <TaskForm onTaskCreated={handleTaskCreated} />
        <TaskList 
          tasks={tasks} 
          filter={filter} 
          setFilter={setFilter}
          onUpdateTask={handleTaskUpdated}
          onDeleteTask={handleTaskDeleted}
        />
      </div>
    </>
  );
};

export default Dashboard;
