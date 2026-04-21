import React from 'react';
import TaskItem from './TaskItem';

const TaskList = ({ tasks, filter, setFilter, onUpdateTask, onDeleteTask }) => {
  const filteredTasks = tasks.filter(task => 
    filter === 'all' ? true : task.status === filter
  );

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  return (
    <div className="task-list-container">
      <div className="filter-buttons">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            className={filter === opt.value ? 'active' : ''}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <p className="no-tasks">No tasks found. Create your first task above!</p>
        ) : (
          filteredTasks.map(task => (
            <TaskItem 
              key={task._id} 
              task={task} 
              onUpdate={onUpdateTask} 
              onDelete={onDeleteTask} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
