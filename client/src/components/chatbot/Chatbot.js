import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MdClose, MdSend, MdSmartToy } from 'react-icons/md';

const FAQ_RESPONSES = {
  'how to submit': '📋 To submit a complaint:\n1. Click "New Complaint" in the sidebar\n2. Fill in the title and description\n3. Select a category\n4. Add your location\n5. Optionally attach photos\n6. Click Submit!\n\nAI will automatically detect the category for you! 🤖',
  'track complaint': '🔍 To track your complaint:\n1. Go to "My Complaints" in the sidebar\n2. Click on any complaint to see its full status\n3. You\'ll see a progress timeline showing each stage\n\nYou\'ll also receive real-time notifications when your status changes! 🔔',
  'complaint status': '📊 Complaint statuses:\n• Pending - Just submitted, awaiting review\n• Under Review - Being assessed by officials\n• In Progress - Actively being worked on\n• Resolved - Issue has been fixed\n• Rejected - Could not be processed\n• Closed - Case closed',
  'categories': '📂 Available categories:\n🛣️ Road & Pavement\n💧 Water Supply\n⚡ Electricity\n🗑️ Sanitation & Waste\n🚰 Sewage & Drainage\n🚌 Public Transport\n🌳 Parks & Gardens\n🔊 Noise Pollution\n🐕 Stray Animals\n📋 Other',
  'contact': '📞 Contact Information:\nFor urgent civic emergencies, contact your local municipal helpline.\n\nFor platform support, use this chatbot or visit our Help Center.\n\nFor non-emergency complaints, use our platform to submit officially!',
  'feedback': '⭐ Leaving feedback:\nOnce your complaint is marked as Resolved, you can rate the resolution with 1-5 stars and leave a comment.\n\nThis helps us improve our services!',
  'priority': '🎯 Priority levels:\n• Critical - Emergency, danger to public\n• High - Serious issue needing urgent attention\n• Medium - Standard issue\n• Low - Minor inconvenience\n\nPriority is automatically calculated based on keywords and location density.',
  'upvote': '👍 Upvoting complaints:\nYou can upvote similar complaints to show they affect multiple people. More upvotes = higher priority!',
};

const getBotResponse = (message) => {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return '👋 Hello! I\'m the CivicPulse assistant. I can help you with:\n• How to submit a complaint\n• Track complaint status\n• Understanding categories\n• Leaving feedback\n• Contact information\n\nWhat would you like to know?';
  }
  if (lower.includes('help')) {
    return '🤖 I\'m here to help! You can ask me about:\n• "How to submit a complaint"\n• "How to track my complaint"\n• "Complaint status meanings"\n• "Available categories"\n• "How priority works"\n• "How to leave feedback"';
  }
  return '🤔 I\'m not sure about that. Try asking:\n• "How to submit a complaint"\n• "Track complaint status"\n• "Categories available"\n• "Contact information"\n\nOr use the sidebar to navigate the system.';
};

const QUICK_QUESTIONS = [
  'How to submit a complaint?',
  'Track my complaint',
  'Status meanings',
  'Contact info',
];

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: '👋 Hi! I\'m your CivicPulse assistant.\n\nI can help you file complaints, track their status, or answer questions.\n\nHow can I help you today?', type: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(p => [...p, { text: msg, type: 'user' }]);
    setTimeout(() => {
      const response = getBotResponse(msg);
      setMessages(p => [...p, { text: response, type: 'bot' }]);
    }, 600);
  };

  return (
    <>
      <button className="chatbot-button" onClick={() => setOpen(!open)} title="Chat Assistant">
        {open ? <MdClose size={24} /> : <MdSmartToy size={24} />}
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-avatar">🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>CivicBot</div>
              <div style={{ fontSize: 11, color: 'var(--accent-green)' }}>● Online</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.type}`} style={{ whiteSpace: 'pre-line' }}>
                {m.text}
              </div>
            ))}
            {user && messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, textAlign: 'left', transition: 'all 0.2s' }}>
                    {q}
                  </button>
                ))}
                {user?.role === 'citizen' && (
                  <button onClick={() => { navigate('/citizen/submit'); setOpen(false); }}
                    style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, padding: '8px 12px', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>
                    🚀 Submit a Complaint Now
                  </button>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..."
            />
            <button className="btn btn-primary btn-sm" onClick={() => sendMessage()}>
              <MdSend size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
