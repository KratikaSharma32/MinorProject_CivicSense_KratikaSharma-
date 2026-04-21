import React, { useState, useEffect } from 'react';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import API from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#6c63ff', '#ff6584', '#00d9a6', '#ffd166', '#ff8c42', '#4ecdc4', '#a29bfe', '#fd79a8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1a1a35', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        {label && <div style={{ marginBottom: 4, fontWeight: 600 }}>{label}</div>}
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsDashboard = () => {
  const [monthly, setMonthly] = useState([]);
  const [category, setCategory] = useState([]);
  const [resolution, setResolution] = useState([]);
  const [priority, setPriority] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/analytics/monthly'),
      API.get('/analytics/category'),
      API.get('/analytics/resolution-time'),
      API.get('/analytics/priority'),
    ]).then(([m, c, r, p]) => {
      setMonthly(m.data.data || []);
      setCategory(c.data.data?.map(d => ({ name: d._id, total: d.total, resolved: d.resolved })) || []);
      setResolution(r.data.data?.map(d => ({ name: d._id, days: Math.round(d.avgDays * 10) / 10, count: d.count })) || []);
      setPriority(p.data.data?.map(d => ({ name: d._id, value: d.count })) || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Analytics" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
          Loading analytics...
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Analytics Dashboard" />
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Analytics</h1>
              <p className="page-subtitle">Complaint trends and performance metrics</p>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>📈 Monthly Complaints (Last 12 Months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="month" stroke="#5a5a8a" tick={{ fontSize: 12 }} />
                <YAxis stroke="#5a5a8a" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#6c63ff" strokeWidth={2} dot={{ fill: '#6c63ff', r: 4 }} name="Total" />
                <Line type="monotone" dataKey="resolved" stroke="#00d9a6" strokeWidth={2} dot={{ fill: '#00d9a6', r: 4 }} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Category Distribution */}
            <div className="card">
              <h3 style={{ marginBottom: 20, fontSize: 18 }}>📂 By Category</h3>
              {category.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={category} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="name" stroke="#5a5a8a" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                    <YAxis stroke="#5a5a8a" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#6c63ff" radius={[4,4,0,0]} name="Total" />
                    <Bar dataKey="resolved" fill="#00d9a6" radius={[4,4,0,0]} name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Priority Distribution */}
            <div className="card">
              <h3 style={{ marginBottom: 20, fontSize: 18 }}>🎯 Priority Distribution</h3>
              {priority.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={priority} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {priority.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Resolution Time */}
          <div className="card">
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>⏱️ Avg Resolution Time by Category (days)</h3>
            {resolution.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No resolved complaints yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resolution} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis type="number" stroke="#5a5a8a" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#5a5a8a" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="days" fill="#ffd166" radius={[0,4,4,0]} name="Avg Days" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
