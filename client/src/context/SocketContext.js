import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      if (user) {
        s.emit('join', user.id);
        if (user.role === 'admin' || user.role === 'officer') {
          s.emit('join-admin');
        }
      }
    });

    s.on('notification', (notif) => {
      toast(notif.message, {
        icon: notif.type === 'success' ? '✅' : notif.type === 'error' ? '❌' : 'ℹ️',
        style: {
          background: '#1a1a35',
          color: '#f0f0ff',
          border: '1px solid #2a2a4a',
          borderRadius: '12px',
        },
        duration: 5000,
      });
    });

    s.on('admin-notification', (data) => {
      toast(data.message, {
        icon: '🔔',
        style: {
          background: '#1a1a35',
          color: '#f0f0ff',
          border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: '12px',
        },
        duration: 5000,
      });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
