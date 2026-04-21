import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'tasks'
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch users and all tasks in parallel
      const [usersRes, tasksRes] = await Promise.all([
        api.get('/users'),
        api.get('/tasks/admin/all')
      ]);
      
      setUsers(usersRes.data.data.users || []);
      setAllTasks(tasksRes.data.data.tasks || []);
      console.log('Admin data loaded:', { users: usersRes.data, tasks: tasksRes.data });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm('Change this user\'s role to ' + newRole + '?')) return;
    
    try {
      await api.put('/users/' + userId, { role: newRole });
      setSuccess('User role updated successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(action + ' this user?')) return;
    
    try {
      await api.patch('/users/' + userId + '/' + action);
      setSuccess('User ' + action + 'd successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to ' + action + ' user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm('PERMANENTLY DELETE ' + userName + '? This cannot be undone!')) return;
    
    try {
      await api.delete('/users/' + userId);
      setSuccess('User deleted successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm('Delete task: ' + taskTitle + '?')) return;
    
    try {
      await api.delete('/tasks/admin/' + taskId);
      setSuccess('Task deleted successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading">Loading admin data...</div>
      </>
    );
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter(t => t.status === 'completed').length,
    pendingTasks: allTasks.filter(t => t.status === 'pending').length
  };

  return (
    <>
      <Navbar />
      <div className="admin-panel">
        <div className="admin-header">
          <h1>👑 Admin Panel</h1>
          <p>Welcome, {user?.name} (Administrator)</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Statistics Cards */}
        <div className="admin-stats">
          <div className="stat-card">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
          <div className="stat-card">
            <h3>{stats.activeUsers}</h3>
            <p>Active Users</p>
          </div>
          <div className="stat-card">
            <h3>{stats.adminUsers}</h3>
            <p>Admins</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalTasks}</h3>
            <p>Total Tasks</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({users.length})
          </button>
          <button 
            className={activeTab === 'tasks' ? 'active' : ''}
            onClick={() => setActiveTab('tasks')}
          >
            📋 All Tasks ({allTasks.length})
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="users-table-container">
            <h2>User Management</h2>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Tasks</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className={!u.isActive ? 'inactive-user' : ''}>
                    <td>
                      <div className="user-info">
                        <span className="user-avatar">{u.name?.charAt(0).toUpperCase()}</span>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={u._id === user?.id}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {u._id === user?.id && <small className="hint">(You)</small>}
                    </td>
                    <td>
                      <span className={'status-badge ' + (u.isActive ? 'active' : 'inactive')}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{allTasks.filter(t => t.user?._id === u._id).length}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleToggleActive(u._id, u.isActive)}
                          className={'btn-toggle ' + (u.isActive ? 'deactivate' : 'activate')}
                          disabled={u._id === user?.id}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          className="btn-delete"
                          disabled={u._id === user?.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tasks Table */}
        {activeTab === 'tasks' && (
          <div className="tasks-table-container">
            <h2>All Tasks Across All Users</h2>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map(task => (
                  <tr key={task._id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <br />}
                      {task.description && <small>{task.description.substring(0, 50)}...</small>}
                    </td>
                    <td>{task.user?.name || 'Unknown'}<br /><small>{task.user?.email}</small></td>
                    <td>
                      <span className={'status-badge status-' + task.status}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <span className={'priority-badge priority-' + task.priority}>
                        {task.priority}
                      </span>
                    </td>
                    <td>{new Date(task.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => handleDeleteTask(task._id, task.title)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPanel;
