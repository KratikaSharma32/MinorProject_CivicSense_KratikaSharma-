import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { MdAddCircle, MdList, MdCheckCircle, MdPending, MdError, MdRefresh } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  pending: 'var(--accent-yellow)',
  under_review: 'var(--accent-orange)',
  in_progress: 'var(--accent-primary)',
  resolved: 'var(--accent-green)',
  rejected: '#e74c3c',
  closed: 'var(--text-muted)'
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/complaints/my?limit=5');
      const all = res.data.complaints || [];
      setComplaints(all);
      setStats({
        total: res.data.total || 0,
        pending: all.filter(c => c.status === 'pending').length,
        inProgress: all.filter(c => c.status === 'in_progress').length,
        resolved: all.filter(c => c.status === 'resolved').length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Complaints', value: stats.total, icon: <MdList />, color: 'var(--accent-primary)', bg: 'rgba(108,99,255,0.12)' },
    { label: 'Pending', value: stats.pending, icon: <MdPending />, color: 'var(--accent-yellow)', bg: 'rgba(255,209,102,0.12)' },
    { label: 'In Progress', value: stats.inProgress, icon: <MdRefresh />, color: 'var(--accent-orange)', bg: 'rgba(255,140,66,0.12)' },
    { label: 'Resolved', value: stats.resolved, icon: <MdCheckCircle />, color: 'var(--accent-green)', bg: 'rgba(0,217,166,0.12)' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Citizen Dashboard" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="page-subtitle">Track and manage your civic complaints</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/citizen/submit')}>
              <MdAddCircle size={18} /> New Complaint
            </button>
          </div>

          <div className="grid-4" style={{ marginBottom: 32 }}>
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                <div className="stat-info">
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18 }}>Recent Complaints</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/citizen/complaints')}>View All</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <MdList />
                <h3>No complaints yet</h3>
                <p>Submit your first complaint to get started</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/citizen/submit')}>
                  <MdAddCircle /> Submit Complaint
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {complaints.map(c => (
                  <div key={c._id} className="complaint-card" onClick={() => navigate(`/complaint/${c._id}`)}>
                    <div className="complaint-header">
                      <div>
                        <div className="complaint-title">{c.title}</div>
                        <div className="complaint-id">{c.complaintId}</div>
                      </div>
                      <span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span>
                    </div>
                    <div className="complaint-meta">
                      <span>📂 {c.category}</span>
                      {c.location?.area && <span>📍 {c.location.area}</span>}
                      <span>🕐 {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      <span style={{ color: statusColors[c.status], fontWeight: 600 }}>● {c.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, padding: 20, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 32 }}>💡</div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Quick Tip</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Use the chatbot (bottom-right 🤖) to get help filing a complaint or find answers to common questions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
