import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Book, 
  Search, 
  Coins, 
  Wallet, 
  Clock, 
  Calendar, 
  User, 
  BarChart2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const BooksList = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Stats
  const [stats, setStats] = useState({ earned: 0, paid: 0, pending: 0, count: 0 });

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/books');
        setBooks(res.data);
        
        // Calculate statistics
        const statsObj = res.data.reduce(
          (acc, b) => {
            acc.earned += b.totalRoyaltyEarned || 0;
            acc.paid += b.royaltyPaid || 0;
            acc.pending += b.royaltyPending || 0;
            acc.count += 1;
            return acc;
          },
          { earned: 0, paid: 0, pending: 0, count: 0 }
        );
        setStats(statsObj);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const getBookStatusColor = (status) => {
    if (status.includes('Live')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status.includes('Production')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      (book.isbn && book.isbn.toLowerCase().includes(search.toLowerCase())) ||
      book.authorId.toLowerCase().includes(search.toLowerCase()) ||
      book.genre.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter ? book.status.includes(statusFilter) : true;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
          {user?.role === 'admin' ? 'Global Books Registry' : 'My Published Works'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {user?.role === 'admin' 
            ? 'Review the global catalog, print partners, distribution states, and financial ledgers across BookLeaf.'
            : 'Track your book production pipelines, print statuses, sales channels, and royalty splits.'
          }
        </p>
      </div>

      {/* Aggregate Statistics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <BarChart2 className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Book Catalog Size</p>
              <p className="text-xl font-bold text-slate-200 mt-0.5">{stats.count} titles</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Coins className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cumulative Royalty</p>
              <p className="text-xl font-bold text-white mt-0.5">₹{stats.earned.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-600/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Royalties Disbursed</p>
              <p className="text-xl font-bold text-white mt-0.5">₹{stats.paid.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-600/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Clock className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Settlement</p>
              <p className="text-xl font-bold text-white mt-0.5">₹{stats.pending.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4.5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by title, genre, ISBN, author ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition duration-200"
          />
          <Search className="w-3.5 h-3.5 text-slate-555 absolute left-3 top-3.5" />
        </div>

        <div className="flex space-x-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 focus:outline-none w-full md:w-48"
          >
            <option value="">All Production States</option>
            <option value="Live">Published &amp; Live</option>
            <option value="Production">In Production</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="min-h-[250px] flex items-center justify-center">
          <span className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="glass-panel p-10 text-center text-slate-500 rounded-2xl">
          No books matching search parameters were found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBooks.map((book) => (
            <div key={book._id} className="glass-panel p-6 rounded-2xl glass-card-hover flex flex-col justify-between space-y-4">
              
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">{book.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                    {user?.role === 'admin' && (
                      <span className="flex items-center text-indigo-400 mr-1">
                        <User className="w-3 h-3 mr-0.5" />
                        {book.authorId}
                      </span>
                    )}
                    <span>{book.genre}</span>
                    <span>•</span>
                    <span>ISBN: {book.isbn || 'Pending'}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${getBookStatusColor(book.status)}`}>
                  {book.status.split(' - ')[1] || book.status}
                </span>
              </div>

              {/* Financial Dashboard */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950/45 p-4 rounded-xl border border-slate-900 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sold</p>
                  <p className="font-bold text-slate-200 mt-0.5">{book.totalCopiesSold}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">MRP</p>
                  <p className="font-bold text-slate-200 mt-0.5">{book.mrp ? `₹${book.mrp}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Paid</p>
                  <p className="font-bold text-emerald-400 mt-0.5">₹{book.royaltyPaid}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pending</p>
                  <p className="font-bold text-amber-400 mt-0.5">₹{book.royaltyPending}</p>
                </div>
              </div>

              {/* Footer details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2 border-t border-slate-800/40 pt-4 mt-2">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-550" />
                  <span>Pub: {book.publicationDate ? new Date(book.publicationDate).toLocaleDateString('en-IN') : 'Production pipeline'}</span>
                </span>
                
                {book.printPartner && (
                  <span className="flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Printer: {book.printPartner}</span>
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BooksList;
