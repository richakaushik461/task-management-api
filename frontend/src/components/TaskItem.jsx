import React from 'react';
import api from '../services/api';

const TaskItem = ({ task, onUpdate, onDelete }) => {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await api.patch('/tasks/' + task._id, { status: newStatus });
      onUpdate(res.data.data.task);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task status');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this task?')) {
      try {
        await api.delete('/tasks/' + task._id);
        onDelete(task._id);
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task');
      }
    }
  };

  return (
    <div className="task-item">
      <div className="task-header">
        <h3>{task.title}</h3>
        <span 
          className="priority-badge" 
          style={{ backgroundColor: priorityColors[task.priority] || '#999' }}
        >
          {task.priority}
        </span>
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-footer">
        <select value={task.status} onChange={handleStatusChange}>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={handleDelete} className="delete-btn">Delete</button>
      </div>
    </div>
  );
};

export default TaskItem;
