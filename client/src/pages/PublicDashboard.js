import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MdLogin, MdRefresh, MdLocationOn, MdSearch } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';

const COLORS = ['#6c63ff','#ff6584','#00d9a6','#ffd166','#ff8c42','#4ecdc4','#a29bfe','#fd79a8','#55efc4','#b2bec3'];
const CATEGORY_ICONS = { road:'🛣️', water:'💧', electricity:'⚡', sanitation:'🗑️', sewage:'🚰', public_transport:'🚌', parks:'🌳', noise:'🔊', animals:'🐕', other:'📋' };
const STATUS_ICONS = { pending:'🟡', under_review:'🟠', in_progress:'🔵', resolved:'✅', rejected:'❌', closed:'⬛' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div style={{ background:'#1a1a35', border:'1px solid #2a2a4a', borderRadius:8, padding:'10px 14px', fontSize:13 }}>
      {label && <div style={{ marginBottom:4, fontWeight:600 }}>{label}</div>}
      {payload.map((p,i) => <div key={i} style={{ color:p.fill || p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
  return null;
};

const PublicDashboard = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        API.get(`/public/complaints?${new URLSearchParams({ ...filters, limit: 20 })}`),
        API.get('/public/stats')
      ]);
      setComplaints(cRes.data.complaints || []);
      setStats(sRes.data.stats || {});
    } catch {} finally { setLoading(false); }
  };

  const categoryData = stats.byCategory?.map(c => ({ name: c._id, value: c.count })) || [];
  const areaData = stats.byArea?.map(a => ({ name: a._id || 'Unknown', count: a.count })) || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav className="public-nav">
        <div className="public-nav-logo">🏛️ CivicPulse</div>
        <div className="public-nav-links">
          {['list','map','analytics'].map(t => (
            <span key={t} className={`public-nav-link ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
              {t === 'list' ? '📋 Complaints' : t === 'map' ? '🗺️ Map' : '📊 Analytics'}
            </span>
          ))}
        </div>
        <div className="public-nav-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}><MdLogin /> Login</button>
        </div>
      </nav>

      <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Banner */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Complaints', value: stats.total || 0, color: 'var(--accent-primary)' },
            { label: 'Resolved', value: stats.resolved || 0, color: 'var(--accent-green)' },
            { label: 'Resolution Rate', value: `${stats.resolutionRate || 0}%`, color: 'var(--accent-yellow)' },
          ].map((s,i) => (
            <div key={i} className="card" style={{ flex: 1, minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {activeTab === 'list' && (
          <>
            <div className="filters-bar">
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Public Transparency Board</span>
              <select className="filter-select" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_ICONS).map(([v,icon]) => <option key={v} value={v}>{icon} {v.replace('_',' ')}</option>)}
              </select>
              <select className="filter-select" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                <option value="">All Status</option>
                {Object.entries(STATUS_ICONS).map(([v,icon]) => <option key={v} value={v}>{icon} {v.replace('_',' ')}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}><MdRefresh /></button>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading complaints...</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
                {complaints.map(c => (
                  <div key={c._id} className="complaint-card">
                    <div className="complaint-header">
                      <div style={{ flex:1 }}>
                        <div className="complaint-title">{c.title}</div>
                        <div className="complaint-id">{c.complaintId}</div>
                      </div>
                      <span className={`badge badge-${c.status}`}>{c.status.replace('_',' ')}</span>
                    </div>
                    <div className="complaint-meta">
                      <span>{CATEGORY_ICONS[c.category] || '📋'} {c.category}</span>
                      {c.location?.area && <span><MdLocationOn style={{ verticalAlign:'middle' }} />{c.location.area}</span>}
                      <span>🕐 {formatDistanceToNow(new Date(c.createdAt), { addSuffix:true })}</span>
                    </div>
                    <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
                      <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                      {c.upvotes?.length > 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>👍 {c.upvotes.length}</span>}
                    </div>
                  </div>
                ))}
                {complaints.length === 0 && (
                  <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'var(--text-muted)' }}>No complaints found</div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'map' && (
          <div className="card">
            <h3 style={{ marginBottom:16, fontSize:18 }}>🗺️ Complaint Locations</h3>
            <div style={{ padding:40, textAlign:'center', background:'var(--bg-secondary)', borderRadius:12 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🗺️</div>
              <h4 style={{ marginBottom:8 }}>Interactive Map</h4>
              <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:16 }}>
                Map visualization shows complaint density by location.
                GPS coordinates are collected when citizens use location tagging.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginTop:20 }}>
                {areaData.map((a,i) => (
                  <div key={i} style={{ padding:'12px 16px', background:'var(--bg-card)', borderRadius:8, border:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:14 }}>{a.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--accent-primary)' }}>{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="grid-2" style={{ gap:24 }}>
              <div className="card">
                <h3 style={{ marginBottom:20, fontSize:18 }}>📂 Category Distribution</h3>
                {categoryData.length === 0 ? (
                  <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {categoryData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="card">
                <h3 style={{ marginBottom:20, fontSize:18 }}>📍 Top Complaint Areas</h3>
                {areaData.length === 0 ? (
                  <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No area data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={areaData} margin={{ top:5, right:20, left:0, bottom:40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                      <XAxis dataKey="name" stroke="#5a5a8a" tick={{ fontSize:11 }} angle={-30} textAnchor="end" />
                      <YAxis stroke="#5a5a8a" tick={{ fontSize:11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#6c63ff" radius={[4,4,0,0]} name="Complaints" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDashboard;
