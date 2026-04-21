import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useOnlineStatus } from './hooks/useApi';
import './styles/global.css';

import LoginPage from './pages/LoginPage';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PublicDashboard from './pages/PublicDashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import MyComplaints from './pages/MyComplaints';
import NotFound from './pages/NotFound';
import Chatbot from './components/chatbot/Chatbot';

const OnlineStatusBanner = () => {
  const online = useOnlineStatus();
  useEffect(() => {
    if (!online) {
      toast.error('You are offline. Some features may be unavailable.', {
        id: 'offline-toast', duration: Infinity,
        style: { background: '#2d1b1b', color: '#ff6b6b', border: '1px solid #e74c3c', borderRadius: 12 }
      });
    } else { toast.dismiss('offline-toast'); }
  }, [online]);
  return null;
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--accent-primary)', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color:'var(--text-muted)', fontSize:14 }}>Loading...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' || user.role === 'officer' ? '/admin' : '/citizen'} replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <ErrorBoundary>
      <OnlineStatusBanner />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/" element={<ProtectedRoute>{user?.role === 'admin' || user?.role === 'officer' ? <Navigate to="/admin" replace /> : <Navigate to="/citizen" replace />}</ProtectedRoute>} />
        <Route path="/citizen" element={<ProtectedRoute roles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/citizen/submit" element={<ProtectedRoute roles={['citizen']}><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/citizen/complaints" element={<ProtectedRoute roles={['citizen']}><MyComplaints /></ProtectedRoute>} />
        <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin','officer']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin','officer']}><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Chatbot />
    </ErrorBoundary>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:12, fontSize:14 },
          success: { iconTheme: { primary:'var(--accent-green)', secondary:'var(--bg-primary)' } },
          error: { iconTheme: { primary:'#e74c3c', secondary:'var(--bg-primary)' } },
          duration: 4000
        }} />
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
