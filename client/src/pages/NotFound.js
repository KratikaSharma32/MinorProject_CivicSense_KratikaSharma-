import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleHome = () => {
    if (!user) navigate('/login');
    else if (user.role === 'admin' || user.role === 'officer') navigate('/admin');
    else navigate('/citizen');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      flexDirection: 'column',
      gap: 24,
      textAlign: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
        borderRadius: '50%', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none'
      }} />

      <div style={{ fontSize: 96, lineHeight: 1 }}>🏛️</div>

      <div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 80,
          fontWeight: 800,
          color: 'var(--accent-primary)',
          lineHeight: 1,
          letterSpacing: -4,
          marginBottom: 8
        }}>404</h1>
        <h2 style={{ fontSize: 24, fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={handleHome}>
          🏠 Go Home
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>
          ← Go Back
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/public')}>
          🌍 Public Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
