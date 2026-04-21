import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import API from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { MdAddCircle, MdSearch, MdRefresh } from 'react-icons/md';

const MyComplaints = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', page: 1 });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => { fetchComplaints(); }, [filters]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, limit: 10 });
      const res = await API.get(`/complaints/my?${params}`);
      setComplaints(res.data.complaints || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val, page: 1 }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Complaints" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">My Complaints</h1>
              <p className="page-subtitle">{total} complaints total</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/citizen/submit')}>
              <MdAddCircle /> New Complaint
            </button>
          </div>

          <div className="filters-bar">
            <select className="filter-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="filter-select" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              <option value="road">Road</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="sanitation">Sanitation</option>
              <option value="sewage">Sewage</option>
              <option value="public_transport">Public Transport</option>
              <option value="parks">Parks</option>
              <option value="noise">Noise</option>
              <option value="animals">Animals</option>
              <option value="other">Other</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchComplaints}>
              <MdRefresh /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <MdSearch style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 16 }} />
              <h3>No complaints found</h3>
              <p>Try adjusting filters or submit a new complaint</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {complaints.map(c => (
                  <div key={c._id} className="complaint-card" onClick={() => navigate(`/complaint/${c._id}`)}>
                    <div className="complaint-header">
                      <div style={{ flex: 1 }}>
                        <div className="complaint-title">{c.title}</div>
                        <div className="complaint-id">{c.complaintId}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                        <span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="complaint-meta">
                      <span>📂 {c.category}</span>
                      {c.location?.area && <span>📍 {c.location.area}</span>}
                      {c.assignedTo && <span>👤 {c.assignedTo.name}</span>}
                      <span>🕐 {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      {c.images?.length > 0 && <span>🖼️ {c.images.length} image(s)</span>}
                    </div>
                  </div>
                ))}
              </div>

              {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                  <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
                  <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {filters.page} of {pages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={filters.page >= pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyComplaints;
