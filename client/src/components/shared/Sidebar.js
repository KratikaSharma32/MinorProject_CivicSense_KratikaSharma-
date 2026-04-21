import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdDashboard, MdAddCircle, MdList, MdBarChart, MdPeople,
  MdPublic, MdLogout, MdAssignment, MdNotifications
} from 'react-icons/md';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const citizenLinks = [
    { path: '/citizen', icon: <MdDashboard />, label: 'Dashboard' },
    { path: '/citizen/submit', icon: <MdAddCircle />, label: 'Submit Complaint' },
    { path: '/citizen/complaints', icon: <MdList />, label: 'My Complaints' },
    { path: '/public', icon: <MdPublic />, label: 'Public Board' },
  ];

  const adminLinks = [
    { path: '/admin', icon: <MdDashboard />, label: 'Dashboard' },
    { path: '/admin/analytics', icon: <MdBarChart />, label: 'Analytics' },
    { path: '/public', icon: <MdPublic />, label: 'Public View' },
  ];

  const links = (user?.role === 'admin' || user?.role === 'officer') ? adminLinks : citizenLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>🏛️ CivicPulse</h2>
        <span>Smart Complaint System</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {links.map(link => (
          <div
            key={link.path}
            className={`nav-item ${isActive(link.path) ? 'active' : ''}`}
            onClick={() => navigate(link.path)}
          >
            {link.icon}
            {link.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <MdLogout
            style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', flexShrink: 0 }}
            onClick={() => { logout(); navigate('/login'); }}
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
