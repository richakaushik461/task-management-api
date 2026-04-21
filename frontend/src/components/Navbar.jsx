import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-brand">📋 TaskManager</Link>
        <div className="nav-menu">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {isAdmin && (
            <Link to="/admin" className="nav-link admin-link">👑 Admin Panel</Link>
          )}
          <div className="nav-user">
            <span className="user-name">{user?.name}</span>
            <span className={'badge ' + (user?.role || '')}>{user?.role}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
