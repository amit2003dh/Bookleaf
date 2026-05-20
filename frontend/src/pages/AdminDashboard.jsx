import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MessageSquare,
  Search,
  Filter,
  Shield,
  User,
  BookOpen,
  Send,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Copy,
  Save,
  CheckCircle2,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { socket } = connectionState(); // Helper function or custom hook
  
  function connectionState() {
    return useSocket() || { socket: null, connected: false };
  }

  // Data lists
  const [tickets, setTickets] = useState([]);
  const [books, setBooks] = useState([]); // Directory of all books
  
  // Selected ticket context
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null); // { ticket, author, book }
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing states
  const [editStatus, setEditStatus] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  // Loading & action states
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingMetadata, setUpdatingMetadata] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Statistics
  const [stats, setStats] = useState({ open: 0, inProgress: 0, critical: 0, total: 0 });

  const showToast = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 4500);
  };

  // Fetch ticket queue
  const fetchQueue = async () => {
    try {
      setLoadingQueue(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterPriority) params.priority = filterPriority;
      if (searchQuery) params.search = searchQuery;

      const res = await axios.get('/api/tickets', { params });
      setTickets(res.data);

      // Re-evaluate statistics based on current unfiltered database
      const allRes = await axios.get('/api/tickets');
      const allTickets = allRes.data;
      const statsObj = allTickets.reduce(
        (acc, t) => {
          if (t.status === 'Open') acc.open += 1;
          if (t.status === 'In Progress') acc.inProgress += 1;
          if (t.priority === 'Critical' && t.status !== 'Closed') acc.critical += 1;
          acc.total += 1;
          return acc;
        },
        { open: 0, inProgress: 0, critical: 0, total: 0 }
      );
      setStats(statsObj);
    } catch (err) {
      console.error('Error fetching ticket queue:', err);
      showToast('Failed to load ticket queue.', 'error');
    } finally {
      setLoadingQueue(false);
    }
  };

  // Fetch queue on filter/search change
  useEffect(() => {
    fetchQueue();
  }, [filterStatus, filterCategory, filterPriority, searchQuery]);

  // Fetch ticket detail when selected
  useEffect(() => {
    if (!selectedTicketId) {
      setTicketDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await axios.get(`/api/tickets/${selectedTicketId}`);
        setTicketDetail(res.data);

        // Pre-fill editor states
        setEditStatus(res.data.ticket.status);
        setEditCategory(res.data.ticket.category);
        setEditPriority(res.data.ticket.priority);
        setInternalNotes(res.data.ticket.internalNotes || '');
      } catch (err) {
        console.error('Error fetching ticket details:', err);
        showToast('Failed to load ticket details.', 'error');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedTicketId]);

  // WebSocket Live Sync
  useEffect(() => {
    if (!socket) return;

    socket.on('newTicket', (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
      showToast(`New support ticket raised by author: ${newTicket.authorId}`, 'info');
      
      // Update statistics
      setStats((prev) => ({
        ...prev,
        open: prev.open + 1,
        total: prev.total + 1,
        critical: newTicket.priority === 'Critical' ? prev.critical + 1 : prev.critical,
      }));
    });

    socket.on('ticketUpdated', (updatedTicket) => {
      // Update queue item
      setTickets((prev) => prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)));
      
      // Update details panel if active
      if (selectedTicketId === updatedTicket._id) {
        setTicketDetail((prev) => {
          if (!prev) return null;
          return { ...prev, ticket: updatedTicket };
        });
        setEditStatus(updatedTicket.status);
        setEditCategory(updatedTicket.category);
        setEditPriority(updatedTicket.priority);
      }
    });

    return () => {
      socket.off('newTicket');
      socket.off('ticketUpdated');
    };
  }, [socket, selectedTicketId]);

  // Update Category, Priority, Status, Assignee
  const handleUpdateMetadata = async (statusUpdateOnly = null) => {
    if (!ticketDetail) return;
    setUpdatingMetadata(true);

    try {
      const payload = {
        status: statusUpdateOnly || editStatus,
        category: editCategory,
        priority: editPriority,
      };

      const res = await axios.patch(`/api/tickets/${ticketDetail.ticket._id}`, payload);
      
      setTicketDetail((prev) => ({ ...prev, ticket: res.data }));
      setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      showToast('Ticket updated successfully.', 'success');
    } catch (err) {
      console.error('Error updating ticket properties:', err);
      showToast('Failed to update ticket details.', 'error');
    } finally {
      setUpdatingMetadata(false);
    }
  };

  // Quick action: Assign to Self
  const handleAssignToSelf = async () => {
    if (!ticketDetail) return;
    setUpdatingMetadata(true);
    try {
      const res = await axios.patch(`/api/tickets/${ticketDetail.ticket._id}`, {
        assignedTo: user._id,
      });
      setTicketDetail((prev) => ({ ...prev, ticket: res.data }));
      showToast('Assigned ticket to yourself.', 'success');
    } catch (err) {
      console.error('Error assigning ticket:', err);
      showToast('Failed to assign ticket.', 'error');
    } finally {
      setUpdatingMetadata(false);
    }
  };

  // Save Internal Notes
  const handleSaveInternalNotes = async () => {
    if (!ticketDetail) return;
    setSavingNotes(true);
    try {
      const res = await axios.patch(`/api/tickets/${ticketDetail.ticket._id}`, {
        internalNotes,
      });
      setTicketDetail((prev) => ({ ...prev, ticket: res.data }));
      showToast('Internal staff notes updated.', 'success');
    } catch (err) {
      console.error('Error saving notes:', err);
      showToast('Failed to save notes.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  // Regenerate AI Response Draft
  const handleRegenerateDraft = async () => {
    if (!ticketDetail) return;
    setRegeneratingDraft(true);
    try {
      const res = await axios.post(`/api/tickets/${ticketDetail.ticket._id}/ai-draft`);
      setTicketDetail((prev) => ({
        ...prev,
        ticket: { ...prev.ticket, aiDraftResponse: res.data.aiDraftResponse },
      }));
      showToast('Gemini response draft regenerated.', 'success');
    } catch (err) {
      console.error('Error regenerating AI draft:', err);
      showToast('Failed to regenerate AI draft.', 'error');
    } finally {
      setRegeneratingDraft(false);
    }
  };

  // Send reply message
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !ticketDetail) return;

    setSendingReply(true);
    try {
      const res = await axios.post(`/api/tickets/${ticketDetail.ticket._id}/reply`, {
        content: replyMessage,
      });

      setTicketDetail((prev) => ({ ...prev, ticket: res.data }));
      setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      setReplyMessage('');
      showToast('Reply dispatched.', 'success');
    } catch (err) {
      console.error('Error sending reply:', err);
      showToast('Failed to dispatch reply.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Copy AI Draft to reply box
  const copyDraftToReply = () => {
    if (ticketDetail?.ticket?.aiDraftResponse) {
      setReplyMessage(ticketDetail.ticket.aiDraftResponse);
      showToast('AI Draft copied to editor.', 'success');
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
      'Critical': 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse-subtle font-extrabold',
      'High': 'bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold',
      'Medium': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      'Low': 'bg-slate-800 text-slate-400 border border-slate-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${classes[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-5 py-4 rounded-2xl border shadow-2xl glass-panel-heavy transition-all duration-300 transform translate-y-0 ${
          notification.type === 'success' ? 'border-emerald-500/30 text-emerald-300' : 
          notification.type === 'error' ? 'border-rose-500/30 text-rose-300' : 'border-indigo-500/30 text-indigo-300'
        }`}>
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Info */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">Operations Portal</h1>
          <p className="text-slate-400 text-sm mt-1">BookLeaf Operations Desk. Resolve author queries with AI-assisted drafts.</p>
        </div>
      </header>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Open */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/40">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Open Tickets</p>
          <p className="text-2xl font-black text-sky-400 mt-1">{stats.open}</p>
        </div>
        {/* In Progress */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/40">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">In Progress</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.inProgress}</p>
        </div>
        {/* Critical */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/40 bg-rose-950/5 border-rose-900/10">
          <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Critical Unresolved</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.critical}</p>
        </div>
        {/* Total */}
        <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/40">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Global Tickets</p>
          <p className="text-2xl font-black text-slate-200 mt-1">{stats.total}</p>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Filterable Ticket Queue */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Queue Filters Panel */}
          <div className="glass-panel p-4.5 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-slate-400 font-semibold text-xs border-b border-slate-800/40 pb-2">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>QUEUE FILTERS</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-2 rounded-xl bg-slate-950/40 border border-slate-900 text-[11px] font-semibold text-slate-350 focus-glow transition duration-200 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Priority */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-2 py-2 rounded-xl bg-slate-950/40 border border-slate-900 text-[11px] font-semibold text-slate-350 focus-glow transition duration-200 cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Category */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2 py-2 rounded-xl bg-slate-950/40 border border-slate-900 text-[11px] font-semibold text-slate-350 focus-glow transition duration-200 cursor-pointer truncate"
              >
                <option value="">All Categories</option>
                <option value="Royalty & Payments">Royalty</option>
                <option value="ISBN & Metadata Issues">ISBN</option>
                <option value="Printing & Quality">Printing</option>
                <option value="Distribution & Availability">Distribution</option>
                <option value="Book Status & Production Updates">Production</option>
                <option value="General Inquiry">General</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search subject, description, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-xs text-slate-200 placeholder-slate-650 focus-glow transition duration-200 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Ticket Queue List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loadingQueue ? (
              <div className="py-12 flex justify-center">
                <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-panel p-8 text-center text-slate-500 rounded-2xl text-xs">
                No tickets in queue matching criteria.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isUrgent = ['Critical', 'High'].includes(ticket.priority) && ['Open', 'In Progress'].includes(ticket.status);
                return (
                  <button
                    key={ticket._id}
                    onClick={() => setSelectedTicketId(ticket._id)}
                    className={`w-full text-left p-4 rounded-2xl border transition duration-200 flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                      selectedTicketId === ticket._id
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : isUrgent
                        ? 'bg-rose-950/5 border-rose-900/10 hover:bg-rose-950/10'
                        : 'glass-panel hover:bg-slate-850/20'
                    }`}
                  >
                    {isUrgent && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                    )}

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-200 truncate max-w-[210px] md:max-w-xs">{ticket.subject}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Author: {ticket.authorId} • {ticket.category}</p>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900/60 pt-2.5">
                      <span>Submitted: {new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                      <div className="flex items-center space-x-2">
                        {ticket.assignedTo && <Shield className="w-3 h-3 text-indigo-400" />}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Detailed Ticket Hub */}
        <div className="lg:col-span-7">
          {selectedTicketId ? (
            loadingDetail ? (
              <div className="glass-panel rounded-3xl h-[650px] flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ticketDetail ? (
              <div className="space-y-6">
                
                {/* 1. Context Information (Author & Book Metadata) */}
                <div className="glass-panel p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                  
                  {/* Author Card */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Author Info</span>
                    </h3>
                    <div className="bg-slate-950/45 p-4 rounded-2xl border border-slate-900 space-y-1.5 text-xs text-slate-300">
                      <p><span className="text-slate-500 font-medium">Name:</span> <strong className="text-slate-100">{ticketDetail.author?.name}</strong></p>
                      <p><span className="text-slate-500 font-medium">Email:</span> {ticketDetail.author?.email}</p>
                      <p><span className="text-slate-500 font-medium">Phone:</span> {ticketDetail.author?.phone}</p>
                      <p><span className="text-slate-500 font-medium">City:</span> {ticketDetail.author?.city}</p>
                    </div>
                  </div>

                  {/* Reference Book Card */}
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Associated Book</span>
                    </h3>
                    {ticketDetail.book ? (
                      <div className="bg-slate-950/45 p-4 rounded-2xl border border-slate-900 space-y-1.5 text-xs text-slate-300">
                        <p className="truncate font-bold text-slate-100">{ticketDetail.book.title}</p>
                        <p><span className="text-slate-500 font-medium">Status:</span> <strong className="text-indigo-400">{ticketDetail.book.status}</strong></p>
                        <p><span className="text-slate-500 font-medium">Royalty Pending:</span> <strong className="text-emerald-400">₹{ticketDetail.book.royaltyPending}</strong></p>
                        <p><span className="text-slate-500 font-medium">Copies Sold:</span> {ticketDetail.book.totalCopiesSold}</p>
                      </div>
                    ) : (
                      <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-900/60 text-slate-500 text-xs flex items-center justify-center h-[105px]">
                        Account Level Query (No Book)
                      </div>
                    )}
                  </div>

                </div>

                {/* 2. Operations Controls: Category / Priority Overrides, Notes, Status */}
                <div className="glass-panel p-6 rounded-3xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
                    <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Ticket Administration Console</h3>
                    
                    {/* Assignment Action */}
                    {ticketDetail.ticket.assignedTo ? (
                      <span className="text-[10px] bg-indigo-950/50 text-indigo-400 px-3 py-1 rounded-full border border-indigo-900/60 font-semibold">
                        Assigned to Ops Staff
                      </span>
                    ) : (
                      <button
                        onClick={handleAssignToSelf}
                        className="flex items-center space-x-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition font-semibold"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Assign to Me</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Category Override */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Royalty & Payments">Royalty & Payments</option>
                        <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
                        <option value="Printing & Quality">Printing & Quality</option>
                        <option value="Distribution & Availability">Distribution & Availability</option>
                        <option value="Book Status & Production Updates">Production Updates</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                      {ticketDetail.ticket.isCategoryOverridden ? (
                        <span className="text-[9px] text-amber-500 flex items-center space-x-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Admin Override Active</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-indigo-500 flex items-center space-x-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Classification</span>
                        </span>
                      )}
                    </div>

                    {/* Priority Override */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      {ticketDetail.ticket.isPriorityOverridden ? (
                        <span className="text-[9px] text-amber-500 flex items-center space-x-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Admin Override Active</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-indigo-500 flex items-center space-x-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Priority Score</span>
                        </span>
                      )}
                    </div>

                    {/* Status Select */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                      <span className="text-[9px] text-slate-550 block">Current workflow status</span>
                    </div>
                  </div>

                  {/* Actions Trigger */}
                  <button
                    onClick={() => handleUpdateMetadata()}
                    disabled={updatingMetadata}
                    className="flex items-center space-x-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-4 py-2 rounded-xl border border-indigo-500/20 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Controls Configuration</span>
                  </button>

                  {/* Internal Notes Panel */}
                  <div className="space-y-2 border-t border-slate-800/40 pt-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Internal Notes (Hidden from Author payload)
                    </label>
                    <div className="flex space-x-2">
                      <textarea
                        rows={2}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Add private staff comments regarding this query..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition duration-200 resize-none"
                      />
                      <button
                        onClick={handleSaveInternalNotes}
                        disabled={savingNotes}
                        className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 p-3 rounded-xl transition duration-200 flex items-center justify-center shrink-0 self-end"
                        title="Save Notes"
                      >
                        {savingNotes ? (
                          <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                {/* 3. AI Generated Draft Response Panel */}
                <div className="glass-panel p-6 rounded-3xl border border-indigo-950/30 bg-gradient-to-br from-slate-900/30 via-slate-900/50 to-indigo-950/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-900/20 pb-3">
                    <div className="flex items-center space-x-2 text-indigo-400 font-extrabold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse-subtle" />
                      <span>GEMINI AI RESPONSE DRAFT</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleRegenerateDraft}
                        disabled={regeneratingDraft}
                        className="flex items-center space-x-1 text-[10px] bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-850 px-2 py-1.5 rounded-xl transition"
                        title="Regenerate draft using the Knowledge Base"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingDraft ? 'animate-spin' : ''}`} />
                        <span>Regenerate Draft</span>
                      </button>

                      <button
                        onClick={copyDraftToReply}
                        className="flex items-center space-x-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-xl transition"
                        title="Copy text directly into conversation reply box"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy to Editor</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-4.5 rounded-2xl border border-indigo-950/30 max-h-[180px] overflow-y-auto">
                    {ticketDetail.ticket.aiDraftResponse ? (
                      <p className="text-xs leading-relaxed text-slate-300 font-sans whitespace-pre-wrap">
                        {ticketDetail.ticket.aiDraftResponse}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 italic">No AI response draft available. Click Regenerate to request one.</p>
                    )}
                  </div>
                </div>

                {/* 4. Chat Timeline Conversation */}
                <div className="glass-panel rounded-3xl flex flex-col h-[500px]">
                  
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-850 bg-slate-950/15 rounded-t-3xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation History</span>
                    <span className="text-[10px] text-slate-500">Subject: {ticketDetail.ticket.subject}</span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Initial Query Description (Base Message) */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl p-3.5 bg-slate-900/80 border border-slate-800/40 text-slate-300">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                          {ticketDetail.author?.name} (Author - Initial Query)
                        </p>
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{ticketDetail.ticket.description}</p>
                      </div>
                    </div>

                    {/* Reply Thread */}
                    {ticketDetail.ticket.messages && ticketDetail.ticket.messages.map((msg, idx) => {
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                            isAdmin 
                              ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-100' 
                              : 'bg-slate-900/80 border border-slate-800/40 text-slate-300'
                          }`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                              isAdmin ? 'text-indigo-400' : 'text-slate-500'
                            }`}>
                              {msg.senderName} ({isAdmin ? 'Operations' : 'Author'})
                            </p>
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <span className="text-[9px] text-slate-550 mt-1.5 block text-right">
                              {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Reply Box */}
                  <div className="p-4 border-t border-slate-850 bg-slate-950/15 rounded-b-3xl">
                    <form onSubmit={handleSendReply} className="space-y-3">
                      <textarea
                        rows={3}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Draft support reply... (or copy from the AI generator draft above)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition duration-200 resize-none"
                        required
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">AI Response guidelines matched automatically.</span>
                        <button
                          type="submit"
                          disabled={sendingReply || !replyMessage.trim()}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                        >
                          {sendingReply ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Response</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                </div>

              </div>
            ) : null
          ) : (
            <div className="glass-panel rounded-3xl h-[650px] flex flex-col items-center justify-center text-center p-8 border border-slate-800/60 bg-slate-950/5">
              <Shield className="w-12 h-12 text-indigo-500/20 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Ticket Selected</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-xs">
                Select an incoming ticket query from the left queue. Review details, AI Suggestions, and reply.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
