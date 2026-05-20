import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, backendUrl } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Establish WebSocket connection
    const newSocket = io(backendUrl, {
      transports: ['websocket'],
      upgrade: false,
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time notification socket:', newSocket.id);
      setConnected(true);

      // Join the correct Socket.io room based on user role
      if (user.role === 'admin') {
        newSocket.emit('joinRoom', 'admins');
      } else if (user.authorId) {
        newSocket.emit('joinRoom', user.authorId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from real-time socket');
      setConnected(false);
    });

    setSocket(newSocket);

    // Clean up connection on unmount or authentication revoke
    return () => {
      newSocket.disconnect();
    };
  }, [token, user, backendUrl]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
