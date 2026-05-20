import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Book,
  Coins,
  Wallet,
  AlertCircle,
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Calendar,
  X
} from 'lucide-react';

const AuthorDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('tickets'); // 'books' or 'tickets'

  // Data states
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Form states
  const [newTicketBook, setNewTicketBook] = useState('General / Account Level');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  // Interaction states
  const [chatMessage, setChatMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Financial aggregates
  const [finStats, setFinStats] = useState({ earned: 0, paid: 0, pending: 0 });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [booksRes, ticketsRes] = await Promise.all([
          axios.get('/api/books'),
          axios.get('/api/tickets'),
        ]);

        setBooks(booksRes.data);
        setTickets(ticketsRes.data);

        // Aggregate statistics
        const stats = booksRes.data.reduce(
          (acc, book) => {
            acc.earned += book.totalRoyaltyEarned || 0;
            acc.paid += book.royaltyPaid || 0;
            acc.pending += book.royaltyPending || 0;
            return acc;
          },
          { earned: 0, paid: 0, pending: 0 }
        );
        setFinStats(stats);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // WebSockets Real-Time Sync
  useEffect(() => {
    if (!socket) return;

    // Listen for ticket additions / replies
    socket.on('ticketUpdated', (updatedTicket) => {
      // 1. Update tickets list
      setTickets((prevTickets) => {
        const exists = prevTickets.some((t) => t._id === updatedTicket._id);
        if (exists) {
          return prevTickets.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
        } else {
          return [updatedTicket, ...prevTickets];
        }
      });

      // 2. Update active chat pane if it matches
      setSelectedTicket((prevSelected) => {
        if (prevSelected?._id === updatedTicket._id) {
          return updatedTicket;
        }
        return prevSelected;
      });

      // 3. Show micro-notification alert
      showToast('Real-time updates synced.', 'success');
    });

    return () => {
      socket.off('ticketUpdated');
    };
  }, [socket]);

  const showToast = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 4000);
  };

  // Submit support ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketDescription.trim()) {
      showToast('Subject and description cannot be empty.', 'error');
      return;
    }

    setSubmittingTicket(true);
    try {
      const ticketPayload = {
        subject: newTicketSubject,
        description: newTicketDescription,
      };
      if (newTicketBook && newTicketBook !== 'General / Account Level') {
        ticketPayload.bookId = newTicketBook;
      }
      const res = await axios.post('/api/tickets', ticketPayload);

      setTickets((prev) => [res.data, ...prev]);
      showToast('Ticket submitted! AI classification complete.', 'success');
      
      // Reset form
      setNewTicketSubject('');
      setNewTicketDescription('');
      setNewTicketBook('General / Account Level');
      setAttachments([]);
    } catch (error) {
      console.error('Error creating ticket:', error);
      showToast('Failed to submit ticket.', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Send a chat message reply
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const res = await axios.post(`/api/tickets/${selectedTicket._id}/reply`, {
        content: chatMessage,
      });

      // Local update
      setSelectedTicket(res.data);
      setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      setChatMessage('');
    } catch (err) {
      console.error('Error sending reply:', err);
      showToast('Failed to send reply.', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      'Open': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
      'In Progress': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      'Resolved': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      'Closed': 'bg-slate-700/30 text-slate-400 border border-slate-700/20',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider ${classes[status] || 'bg-slate-800'}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const classes = {
      'Critical': 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse',
      'High': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      'Medium': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      'Low': 'bg-slate-800 text-slate-400 border border-slate-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${classes[priority]}`}>
        {priority}
      </span>
    );
  };

  const getBookStatusColor = (status) => {
    if (status.includes('Live')) return 'text-emerald-400';
    if (status.includes('Production')) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-8 relative">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-5 py-4 rounded-2xl border shadow-2xl glass-panel-heavy transition-all duration-300 transform translate-y-0 ${
          notification.type === 'success' ? 'border-emerald-500/30 text-emerald-300' : 
          notification.type === 'error' ? 'border-rose-500/30 text-rose-300' : 'border-indigo-500/30 text-indigo-300'
        }`}>
          <Info className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Greeting Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">Author Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back, <span className="text-indigo-400 font-semibold">{user?.name}</span>. Manage your published works and communication.
          </p>
        </div>
        
        {/* View Switcher Tabs */}
        <div className="flex space-x-2 p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/40 w-fit">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition duration-200 ${
              activeTab === 'books'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Book className="w-4 h-4" />
            <span>My Books</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition duration-200 ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Support Tickets</span>
            {tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                {tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Tabs View Contents */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <span className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'books' ? (
        /* ==================== TAB: BOOKS ==================== */
        <div className="space-y-8 animate-fadeIn">
          
          {/* Financial Aggregates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Total Earned */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Royalties Earned</p>
                  <p className="text-2xl font-bold text-white mt-1">₹{finStats.earned.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Total Paid */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-600/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Royalties Paid</p>
                  <p className="text-2xl font-bold text-white mt-1">₹{finStats.paid.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Total Pending */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-600/10 rounded-xl border border-amber-500/20 text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Payout</p>
                  <p className="text-2xl font-bold text-white mt-1">₹{finStats.pending.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Book Catalog Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-200">Catalog &amp; Sales Summary ({books.length} books)</h2>
            
            {books.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-2xl text-slate-500">
                No book records found on your account.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {books.map((book) => (
                  <div key={book._id} className="glass-panel p-6 rounded-2xl glass-card-hover flex flex-col justify-between space-y-5">
                    
                    {/* Header: Title, Genre & Status */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white truncate max-w-[280px] md:max-w-md">{book.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{book.genre} • ISBN: {book.isbn || 'Pending'}</p>
                      </div>
                      <span className={`text-xs font-bold ${getBookStatusColor(book.status)}`}>
                        {book.status}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sold</p>
                        <p className="text-sm font-bold text-slate-200">{book.totalCopiesSold} copies</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">MRP</p>
                        <p className="text-sm font-bold text-slate-200">{book.mrp ? `₹${book.mrp}` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Earned</p>
                        <p className="text-sm font-bold text-indigo-400">₹{book.totalRoyaltyEarned}</p>
                      </div>
                    </div>

                    {/* Metadata & Distribution Details */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-400 gap-2 border-t border-slate-800/40 pt-4">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pub Date: {book.publicationDate ? new Date(book.publicationDate).toLocaleDateString('en-IN') : 'In Production'}</span>
                      </div>
                      {book.availableOn && book.availableOn.length > 0 ? (
                        <div className="flex items-center space-x-1 truncate max-w-[300px]">
                          <span className="text-slate-500 font-semibold shrink-0">Stores:</span>
                          <span className="truncate" title={book.availableOn.join(', ')}>{book.availableOn.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Distribution Pending</span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ==================== TAB: SUPPORT TICKETS ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          
          {/* Column Left: Submission Form & Ticket list */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Create Ticket Panel */}
            <div className="glass-panel p-6 rounded-2xl space-y-5">
              <h2 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <span>Submit Support Ticket</span>
              </h2>

              <form onSubmit={handleSubmitTicket} className="space-y-4">
                {/* Book Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Book Focus</label>
                  <select
                    value={newTicketBook}
                    onChange={(e) => setNewTicketBook(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-300 text-xs focus-glow transition duration-200 cursor-pointer"
                  >
                    <option value="General / Account Level">General / Account Level</option>
                    {books.map((b) => (
                      <option key={b._id} value={b.bookId}>
                        {b.title} (ISBN: {b.isbn || 'Pending'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Line */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject</label>
                  <input
                    type="text"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    placeholder="e.g. My royalties for Q3 haven't arrived yet"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-200 placeholder-slate-650 focus-glow transition duration-200 text-xs font-medium"
                    required
                  />
                </div>

                {/* Detailed Query Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Describe the issue</label>
                  <textarea
                    rows={4}
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    placeholder="Include detailed timeline, screenshots descriptors, or copies values..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-200 placeholder-slate-650 focus-glow transition duration-200 resize-none text-xs leading-relaxed"
                    required
                  />
                </div>

                {/* Attachment UI (Bonus Spec Support) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attachment (Optional)</span>
                  
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-300">
                          <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-indigo-400 hover:text-indigo-200 ml-1 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center justify-center space-x-2 py-3 border border-dashed border-slate-800 hover:border-slate-700/60 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 cursor-pointer transition text-xs font-semibold text-slate-400 hover:text-slate-350">
                    <Paperclip className="w-4 h-4 text-indigo-400 animate-pulse-subtle" />
                    <span>Attach Screenshot / Documents</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setAttachments(prev => [...prev, ...files]);
                      }}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-650/15 hover:shadow-indigo-600/30 transition duration-200 text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {submittingTicket ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Support Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Tickets History List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Ticket History ({tickets.length})</h3>
              
              {tickets.length === 0 ? (
                <div className="glass-panel p-6 text-center text-slate-500 rounded-2xl text-xs">
                  You have not submitted any tickets yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left p-4 rounded-2xl transition duration-200 border flex flex-col justify-between space-y-3 ${
                        selectedTicket?._id === ticket._id
                          ? 'bg-indigo-950/20 border-indigo-500/40'
                          : 'glass-panel hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 truncate max-w-[200px]">{ticket.subject}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Focus: {ticket.bookId ? `Book ID ${ticket.bookId}` : 'General / Account'}
                          </p>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900/80 pt-2.5">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column Right: Active Chat Conversation Timeline */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="glass-panel rounded-3xl flex flex-col h-[700px] border border-slate-800/80">
                
                {/* Chat Panel Header */}
                <div className="p-5 border-b border-slate-800/60 bg-slate-950/20 rounded-t-3xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white tracking-wide truncate max-w-[280px] sm:max-w-md">{selectedTicket.subject}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40">
                        {selectedTicket.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Submitted: {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                {/* Chat Message Scrollport */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Initial Query Description (Base Message) */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl p-4 bg-slate-900/80 border border-slate-800/40 text-slate-300">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">{user?.name} (Author - Initial Query)</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                    </div>
                  </div>

                  {/* Reply Messages Thread */}
                  {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 ${
                          isAdmin 
                            ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-100' 
                            : 'bg-slate-900/80 border border-slate-800/40 text-slate-300'
                        }`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                            isAdmin ? 'text-indigo-400' : 'text-slate-500'
                          }`}>
                            {msg.senderName} ({isAdmin ? 'Operations' : 'Author'})
                          </p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <span className="text-[9px] text-slate-500 mt-2 block text-right">
                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Text Input Area */}
                <div className="p-4 border-t border-slate-800/60 bg-slate-950/20 rounded-b-3xl">
                  {['Closed', 'Resolved'].includes(selectedTicket.status) ? (
                    <div className="text-center p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-center space-x-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                      <span>This ticket has been marked as <strong>{selectedTicket.status}</strong>. Sending replies will reopen it.</span>
                    </div>
                  ) : null}

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2 mt-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-200 placeholder-slate-650 text-xs focus-glow transition duration-200"
                      required
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !chatMessage.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 rounded-xl transition duration-200"
                    >
                      {sendingMessage ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="glass-panel rounded-3xl h-[700px] flex flex-col items-center justify-center text-center p-8 border border-slate-800/60">
                <MessageSquare className="w-12 h-12 text-indigo-500/30 mb-4" />
                <h3 className="text-lg font-bold text-slate-300">No Ticket Selected</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-xs">
                  Choose a ticket from the history list to review administrator replies and chat in real-time.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default AuthorDashboard;
