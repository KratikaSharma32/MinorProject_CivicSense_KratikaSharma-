import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MdSearch, MdEdit, MdRefresh, MdBarChart, MdPeople } from 'react-icons/md';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', page: 1, search: '' });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [actionForm, setActionForm] = useState({ status: '', note: '', officerId: '', response: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchAll(); }, [filters]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, oRes] = await Promise.all([
        API.get(`/admin/complaints?${new URLSearchParams({ ...filters, limit: 15 })}`),
        API.get('/admin/stats'),
        API.get('/admin/officers'),
      ]);
      setComplaints(cRes.data.complaints || []);
      setTotal(cRes.data.total || 0);
      setPages(cRes.data.pages || 1);
      setStats(sRes.data.stats || {});
      setOfficers(oRes.data.officers || []);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val, page: 1 }));

  const handleStatusUpdate = async () => {
    if (!actionForm.status) return toast.error('Select a status');
    setActionLoading(true);
    try {
      await API.put(`/admin/complaints/${selectedComplaint._id}/status`, { status: actionForm.status, note: actionForm.note });
      toast.success('Status updated');
      if (actionForm.response) {
        await API.post(`/admin/complaints/${selectedComplaint._id}/respond`, { message: actionForm.response });
      }
      if (actionForm.officerId) {
        await API.put(`/admin/complaints/${selectedComplaint._id}/assign`, { officerId: actionForm.officerId });
      }
      setSelectedComplaint(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setActionLoading(false); }
  };

  const statCards = [
    { label: 'Total', value: stats.total, color: 'var(--accent-primary)', bg: 'rgba(108,99,255,0.12)' },
    { label: 'Pending', value: stats.pending, color: 'var(--accent-yellow)', bg: 'rgba(255,209,102,0.12)' },
    { label: 'In Progress', value: stats.inProgress, color: 'var(--accent-orange)', bg: 'rgba(255,140,66,0.12)' },
    { label: 'Resolved', value: stats.resolved, color: 'var(--accent-green)', bg: 'rgba(0,217,166,0.12)' },
    { label: 'Critical', value: stats.critical, color: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
    { label: 'Today', value: stats.todayCount, color: 'var(--accent-primary)', bg: 'rgba(108,99,255,0.12)' },
    { label: 'Resolution Rate', value: `${stats.resolutionRate || 0}%`, color: 'var(--accent-green)', bg: 'rgba(0,217,166,0.12)' },
    { label: 'Avg Resolution', value: `${stats.avgResolutionHours || 0}h`, color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Admin Dashboard" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Admin Dashboard</h1>
              <p className="page-subtitle">Manage and resolve civic complaints</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/admin/analytics')}>
                <MdBarChart /> Analytics
              </button>
            </div>
          </div>

          <div className="grid-4" style={{ marginBottom: 28 }}>
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 18 }}>📊</div>
                <div className="stat-info">
                  <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value ?? '—'}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="filters-bar">
            <div className="search-wrapper">
              <MdSearch className="search-icon" />
              <input className="search-input" placeholder="Search complaints..." value={filters.search}
                onChange={e => setFilter('search', e.target.value)} />
            </div>
            {['status', 'category', 'priority'].map(f => (
              <select key={f} className="filter-select" value={filters[f]} onChange={e => setFilter(f, e.target.value)}>
                <option value="">All {f.charAt(0).toUpperCase() + f.slice(1)}</option>
                {f === 'status' && ['pending','under_review','in_progress','resolved','rejected','closed'].map(v => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
                {f === 'category' && ['road','water','electricity','sanitation','sewage','public_transport','parks','noise','animals','other'].map(v => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
                {f === 'priority' && ['low','medium','high','critical'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}><MdRefresh /> Refresh</button>
          </div>

          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>{total} complaints found</div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Citizen</th>
                  <th>Area</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : complaints.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No complaints found</td></tr>
                ) : (
                  complaints.map(c => (
                    <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/complaint/${c._id}`)}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.complaintId}</span></td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td>{c.category}</td>
                      <td>{c.submittedBy?.name || '—'}</td>
                      <td>{c.location?.area || '—'}</td>
                      <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                      <td><span className={`badge badge-${c.status}`}>{c.status.replace('_',' ')}</span></td>
                      <td style={{ fontSize: 12 }}>{format(new Date(c.createdAt), 'dd MMM yy')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedComplaint(c); setActionForm({ status: c.status, note: '', officerId: c.assignedTo?._id || '', response: '' }); }}>
                          <MdEdit /> Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
              <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {filters.page} of {pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Manage Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Manage Complaint</h2>
              <button className="modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedComplaint.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedComplaint.complaintId} · {selectedComplaint.category}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select className="form-select" value={actionForm.status} onChange={e => setActionForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Officer</label>
              <select className="form-select" value={actionForm.officerId} onChange={e => setActionForm(p => ({ ...p, officerId: e.target.value }))}>
                <option value="">Unassigned</option>
                {officers.map(o => <option key={o._id} value={o._id}>{o.name} ({o.role})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status Note (internal)</label>
              <input className="form-input" value={actionForm.note} onChange={e => setActionForm(p => ({ ...p, note: e.target.value }))} placeholder="Internal note about status change" />
            </div>
            <div className="form-group">
              <label className="form-label">Public Response to Citizen</label>
              <textarea className="form-textarea" style={{ minHeight: 80 }} value={actionForm.response}
                onChange={e => setActionForm(p => ({ ...p, response: e.target.value }))} placeholder="Visible response to citizen..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleStatusUpdate}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedComplaint(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
