import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertCircle, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoggingIn(true);

    const result = await login(email, password);
    setLoggingIn(false);

    if (result.success) {
      // Fetch details from local storage or context to route
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser?.role === 'admin') {
        navigate('/dashboard/queue');
      } else {
        navigate('/dashboard/books');
      }
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    
    setLoggingIn(true);
    const result = await login(quickEmail, quickPassword);
    setLoggingIn(false);

    if (result.success) {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser?.role === 'admin') {
        navigate('/dashboard/queue');
      } else {
        navigate('/dashboard/books');
      }
    } else {
      setError(result.message || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#05070f] selection:bg-indigo-650 selection:text-white">
      {/* Background Orbs */}
      <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-indigo-600/10 rounded-full filter blur-[100px] animate-float pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-violet-650/8 rounded-full filter blur-[100px] animate-float pointer-events-none" style={{ animationDelay: '-3s' }} />

      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-center relative z-10 animate-fadeIn">
        
        {/* Branding & Product Presentation Column */}
        <div className="md:col-span-6 space-y-6 text-left hidden md:block pr-8">
          <div className="flex items-center space-x-3.5">
            <div className="bg-indigo-650 p-3 rounded-2xl shadow-xl shadow-indigo-650/20 border border-indigo-500/20">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent font-display">
                BookLeaf
              </span>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase mt-0.5">Publishing Portal</p>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight font-display">
            Author Support &amp; <br />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              Operations Portal
            </span>
          </h1>
          
          <p className="text-slate-400 leading-relaxed max-w-md text-sm">
            Manage your books, review royalty earnings, and resolve metadata, printing, or distribution tickets with our operations team, assisted by real-time AI responses.
          </p>
 
          {/* Value points */}
          <div className="space-y-4 pt-5 border-t border-slate-900 max-w-sm">
            <div className="flex items-center space-x-3.5 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-sm font-medium">80/20 Royalty Split Ledger</span>
            </div>
            <div className="flex items-center space-x-3.5 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span className="text-sm font-medium">AI-Powered Ticket Auto-Pilot</span>
            </div>
            <div className="flex items-center space-x-3.5 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-sm font-medium">Real-Time Sync via WebSockets</span>
            </div>
          </div>
        </div>
 
        {/* Login Form Panel */}
        <div className="md:col-span-6 w-full space-y-6">
          <div className="glass-panel-heavy p-8 rounded-3xl shadow-2xl relative border border-slate-900">
            {/* Header */}
            <div className="space-y-1.5 mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Sign In</h2>
              <p className="text-xs text-slate-400">Enter your credentials to access your portal</p>
            </div>
 
            {error && (
              <div className="flex items-start space-x-3 p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
 
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-900 text-slate-200 placeholder-slate-650 focus-glow transition duration-200 text-sm"
                  required
                />
              </div>
 
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-900 text-slate-200 placeholder-slate-650 focus-glow transition duration-200 text-sm"
                  required
                />
              </div>
 
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full mt-4 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition duration-250 shadow-lg shadow-indigo-650/15 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-600/30 border border-indigo-500/20 text-sm"
              >
                {loggingIn ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Portal</span>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                  </>
                )}
              </button>
            </form>
 
            {/* Quick Login Section (Product Evaluation UX Bonus) */}
            <div className="mt-8 pt-6 border-t border-slate-900 space-y-3.5">
              <div className="flex items-center space-x-2 text-slate-400 px-1">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Testing Sign In</span>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* Author Option */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('priya.sharma@email.com', 'password123')}
                  className="p-3 text-left rounded-2xl bg-slate-950/30 hover:bg-indigo-950/15 border border-slate-900 hover:border-indigo-900/30 transition duration-200 group"
                >
                  <p className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">Author Account</p>
                  <p className="text-[9px] text-slate-500 mt-1 truncate">priya.sharma@email.com</p>
                  <p className="text-[9px] text-slate-650 mt-0.5">pwd: password123</p>
                </button>
 
                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@bookleafpub.com', 'admin123')}
                  className="p-3 text-left rounded-2xl bg-slate-950/30 hover:bg-indigo-950/15 border border-slate-900 hover:border-indigo-900/30 transition duration-200 group"
                >
                  <p className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">Admin Staff</p>
                  <p className="text-[9px] text-slate-500 mt-1 truncate">admin@bookleafpub.com</p>
                  <p className="text-[9px] text-slate-650 mt-0.5">pwd: admin123</p>
                </button>
 
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
