import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import Topbar from '../components/shared/Topbar';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MdArrowBack, MdThumbUp, MdStar, MdStarBorder, MdLocationOn, MdPerson } from 'react-icons/md';

const statusOrder = ['pending', 'under_review', 'in_progress', 'resolved'];

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => { fetchComplaint(); }, [id]);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
    } catch { navigate(-1); }
    finally { setLoading(false); }
  };

  const handleUpvote = async () => {
    try {
      const res = await API.post(`/complaints/${id}/upvote`);
      setComplaint(p => ({ ...p, upvotes: Array(res.data.upvotes).fill(null) }));
      toast.success('Upvoted!');
    } catch {}
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a rating');
    setFeedbackLoading(true);
    try {
      await API.post(`/complaints/${id}/feedback`, { rating, comment: feedbackComment });
      toast.success('Feedback submitted!');
      fetchComplaint();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally { setFeedbackLoading(false); }
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Complaint Details" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    </div>
  );

  if (!complaint) return null;
  const isOwner = user && complaint.submittedBy?._id === user.id;
  const currentStep = statusOrder.indexOf(complaint.status);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Complaint Details" />
        <div className="page-content" style={{ maxWidth: 900 }}>
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
            <MdArrowBack /> Back
          </button>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className={`badge badge-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
                  <span className={`badge badge-${complaint.priority}`}>{complaint.priority} priority</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{complaint.complaintId}</span>
                </div>
                <h1 style={{ fontSize: 24, marginBottom: 8 }}>{complaint.title}</h1>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span>📂 {complaint.category}</span>
                  {complaint.location?.area && <span><MdLocationOn style={{ verticalAlign: 'middle' }} /> {complaint.location.area}, {complaint.location.city}</span>}
                  <span>🕐 {format(new Date(complaint.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                  <span>👁 {complaint.viewCount} views</span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleUpvote}>
                <MdThumbUp /> {complaint.upvotes?.length || 0}
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>
              {complaint.description}
            </div>

            {complaint.aiDetectedCategory && (
              <div className="ai-chip">
                🤖 AI detected: {complaint.aiDetectedCategory} ({complaint.aiConfidence}% confidence)
              </div>
            )}
          </div>

          {/* Images */}
          {complaint.images?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>📸 Attached Images</h3>
              <div className="image-grid">
                {complaint.images.map((img, i) => (
                  <img
                    key={i}
                    src={`http://localhost:5000${img.path}`}
                    alt={`Complaint image ${i + 1}`}
                    className="image-thumb"
                    onClick={() => setLightboxImg(`http://localhost:5000${img.path}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status Progress */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 20, fontSize: 16 }}>📊 Status Progress</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
              {statusOrder.map((s, i) => (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: i <= currentStep ? 'var(--accent-primary)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: i <= currentStep ? 'white' : 'var(--text-muted)',
                      fontWeight: 700, border: '2px solid',
                      borderColor: i <= currentStep ? 'var(--accent-primary)' : 'var(--border-light)'
                    }}>
                      {i < currentStep ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 6, color: i <= currentStep ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', textTransform: 'capitalize' }}>
                      {s.replace('_', ' ')}
                    </div>
                  </div>
                  {i < statusOrder.length - 1 && (
                    <div style={{ height: 2, flex: 1, background: i < currentStep ? 'var(--accent-primary)' : 'var(--border)', marginBottom: 24 }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>History</h4>
            <div className="status-timeline">
              {complaint.statusHistory?.map((h, i) => (
                <div key={i} className="status-step">
                  <div className="step-indicator">
                    <div className={`step-dot ${i === complaint.statusHistory.length - 1 ? 'active' : 'completed'}`} />
                    {i < complaint.statusHistory.length - 1 && <div className="step-line" />}
                  </div>
                  <div className="step-content">
                    <div className="step-title" style={{ textTransform: 'capitalize' }}>{h.status.replace('_', ' ')}</div>
                    <div className="step-time">{format(new Date(h.changedAt), 'dd MMM yyyy, HH:mm')}</div>
                    {h.note && <div className="step-note">{h.note}</div>}
                    {h.changedBy && <div className="step-note">by {h.changedBy.name} ({h.changedBy.role})</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Responses */}
          {complaint.responses?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>💬 Official Responses</h3>
              {complaint.responses.map((r, i) => (
                <div key={i} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12, borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{r.message}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    — {r.respondedBy?.name || 'Official'} · {format(new Date(r.respondedAt), 'dd MMM yyyy HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feedback (citizen only, resolved only) */}
          {isOwner && complaint.status === 'resolved' && !complaint.feedback?.rating && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>⭐ Rate this Resolution</h3>
              <form onSubmit={handleFeedback}>
                <div className="stars" style={{ marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`star ${s <= rating ? 'filled' : ''}`} onClick={() => setRating(s)}>
                      {s <= rating ? <MdStar /> : <MdStarBorder />}
                    </span>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Comment (optional)</label>
                  <textarea className="form-textarea" style={{ minHeight: 80 }} value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="How was your experience?" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={feedbackLoading}>
                  {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          )}

          {complaint.feedback?.rating && (
            <div className="card alert-success" style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>⭐ Your Feedback</h4>
              <div className="stars" style={{ marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ fontSize: 20, color: s <= complaint.feedback.rating ? 'var(--accent-yellow)' : 'var(--border)' }}>★</span>
                ))}
              </div>
              {complaint.feedback.comment && <p style={{ fontSize: 14 }}>{complaint.feedback.comment}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="modal-overlay" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Full size" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, border: '1px solid var(--border)' }} />
        </div>
      )}
    </div>
  );
};

export default ComplaintDetail;
