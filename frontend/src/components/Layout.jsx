import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  BookOpen, 
  MessageSquare, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Clock, 
  Layers,
  Activity
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const getNavLinkClass = (path) => {
    return `flex items-center space-x-3 px-4 py-3 rounded-r-xl rounded-l-none border-l-3 transition-all duration-300 ${
      isActive(path)
        ? 'nav-item-active border-indigo-600 font-semibold shadow-inner'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border-transparent'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#05070f] text-slate-100 font-sans relative overflow-hidden">
      {/* Premium Floating Glow Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/4 rounded-full blur-[120px] pointer-events-none animate-float" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-purple-650/3 rounded-full blur-[140px] pointer-events-none animate-float" style={{ animationDelay: '-3s' }} />

      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 glass-panel border-r border-slate-900/50 p-5 flex flex-col justify-between shrink-0 z-10">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 mb-8 px-2">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent font-display">
                BookLeaf
              </span>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Publishing Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {user?.role === 'admin' ? (
              <>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 py-2">
                  Admin System
                </div>
                <Link to="/dashboard/queue" className={getNavLinkClass('/dashboard/queue')}>
                  <MessageSquare className="w-5 h-5" />
                  <span>Ticket Queue</span>
                </Link>
                <Link to="/dashboard/books" className={getNavLinkClass('/dashboard/books')}>
                  <Layers className="w-5 h-5" />
                  <span>All Books</span>
                </Link>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-2 py-2">
                  Author Space
                </div>
                <Link to="/dashboard/books" className={getNavLinkClass('/dashboard/books')}>
                  <BookOpen className="w-5 h-5" />
                  <span>My Books</span>
                </Link>
                <Link to="/dashboard/tickets" className={getNavLinkClass('/dashboard/tickets')}>
                  <MessageSquare className="w-5 h-5" />
                  <span>Support Tickets</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer Profile Control */}
        <div className="mt-8 pt-5 border-t border-slate-800/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/20 mb-4">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800/40 flex items-center justify-center shrink-0">
                {user?.role === 'admin' ? (
                  <Shield className="w-4.5 h-4.5 text-indigo-400" />
                ) : (
                  <UserIcon className="w-4.5 h-4.5 text-indigo-400" />
                )}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            
            {/* Status indicator */}
            <div 
              title={connected ? 'Connected to live events' : 'Connecting to live events...'}
              className={`w-2 h-2 rounded-full mr-1 shrink-0 ${connected ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-amber-500 animate-pulse'}`}
            />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all duration-200 border border-transparent hover:border-rose-900/30"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
