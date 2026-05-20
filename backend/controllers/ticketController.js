const Ticket = require('../models/Ticket');
const Book = require('../models/Book');
const User = require('../models/User');
const geminiService = require('../services/geminiService');

// Create a new support ticket
const createTicket = async (req, res) => {
  const { bookId, subject, description } = req.body;
  const authorId = req.user.authorId;

  if (!authorId) {
    return res.status(400).json({ message: 'User must be an author to submit tickets' });
  }

  if (!subject || !description) {
    return res.status(400).json({ message: 'Subject and description are required' });
  }

  try {
    // 1. Run Gemini AI classification & priority scoring
    const aiResult = await geminiService.classifyAndPrioritize(subject, description);

    // 2. Query book detail for AI Response Draft context (if applicable)
    let referencedBook = null;
    if (bookId && bookId !== 'General / Account Level') {
      referencedBook = await Book.findOne({ bookId });
    }

    // 3. Create Ticket skeleton for AI draft generator
    const ticketData = {
      authorId,
      bookId: bookId && bookId !== 'General / Account Level' ? bookId : null,
      subject,
      description,
      status: 'Open',
      category: aiResult.category,
      priority: aiResult.priority,
      aiSuggestedCategory: aiResult.category,
      aiSuggestedPriority: aiResult.priority,
    };

    // 4. Generate AI Draft Response
    const aiDraft = await geminiService.generateDraftResponse(ticketData, referencedBook, req.user.name);
    ticketData.aiDraftResponse = aiDraft;

    // 5. Save Ticket to DB
    const ticket = new Ticket(ticketData);
    await ticket.save();

    // 6. Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Broadcast to admins
      io.to('admins').emit('newTicket', ticket);
      // Broadcast to author's channel
      io.to(authorId).emit('ticketUpdated', ticket);
    }

    return res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get tickets (Author gets their own, Admin gets all with optional filtering)
const getTickets = async (req, res) => {
  const { status, category, priority, search } = req.query;

  try {
    const query = {};

    // RBAC: authors only see their own tickets
    if (req.user.role === 'author') {
      query.authorId = req.user.authorId;
    }

    // Apply Admin Filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { authorId: { $regex: search, $options: 'i' } },
      ];
    }

    let tickets = await Ticket.find(query);

    // Sort: Urgent & oldest unresolved first
    // Unresolved statuses: Open, In Progress
    // Resolved statuses: Resolved, Closed
    const statusScore = {
      'Open': 4,
      'In Progress': 3,
      'Resolved': 2,
      'Closed': 1,
    };

    const priorityScore = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1,
    };

    tickets.sort((a, b) => {
      // 1. Sort unresolved first
      const aIsUnresolved = ['Open', 'In Progress'].includes(a.status);
      const bIsUnresolved = ['Open', 'In Progress'].includes(b.status);

      if (aIsUnresolved !== bIsUnresolved) {
        return aIsUnresolved ? -1 : 1;
      }

      // 2. Sort by status detail rank
      if (statusScore[a.status] !== statusScore[b.status]) {
        return statusScore[b.status] - statusScore[a.status];
      }

      // 3. Sort by priority
      if (priorityScore[a.priority] !== priorityScore[b.priority]) {
        return priorityScore[b.priority] - priorityScore[a.priority];
      }

      // 4. Sort by date (oldest first for unresolved)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return res.json(tickets);
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get single ticket by ID
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // RBAC check
    if (req.user.role === 'author' && ticket.authorId !== req.user.authorId) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    // Fetch author details and book details if needed
    const authorUser = await User.findOne({ authorId: ticket.authorId }).select('name email phone city');
    let book = null;
    if (ticket.bookId) {
      book = await Book.findOne({ bookId: ticket.bookId });
    }

    return res.json({
      ticket,
      author: authorUser,
      book,
    });
  } catch (error) {
    console.error('Fetch ticket details error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update ticket (Admin overrides and management)
const updateTicket = async (req, res) => {
  const { status, category, priority, internalNotes, assignedTo } = req.body;

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if category or priority is being overridden
    if (category && category !== ticket.category) {
      ticket.category = category;
      if (category !== ticket.aiSuggestedCategory) {
        ticket.isCategoryOverridden = true;
      } else {
        ticket.isCategoryOverridden = false;
      }
    }

    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      if (priority !== ticket.aiSuggestedPriority) {
        ticket.isPriorityOverridden = true;
      } else {
        ticket.isPriorityOverridden = false;
      }
    }

    if (status) ticket.status = status;
    if (internalNotes !== undefined) ticket.internalNotes = internalNotes;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;

    await ticket.save();

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(ticket.authorId).emit('ticketUpdated', ticket);
      io.to('admins').emit('ticketUpdated', ticket);
    }

    return res.json(ticket);
  } catch (error) {
    console.error('Update ticket error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add a reply message to the ticket
const addReply = async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // RBAC check
    if (req.user.role === 'author' && ticket.authorId !== req.user.authorId) {
      return res.status(403).json({ message: 'Not authorized to reply to this ticket' });
    }

    // Prepare message
    const newMessage = {
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      content,
      timestamp: new Date(),
    };

    ticket.messages.push(newMessage);

    // Auto-update ticket status when admin replies
    if (req.user.role === 'admin') {
      if (ticket.status === 'Open') {
        ticket.status = 'In Progress';
      }
    } else {
      // If author replies and ticket was Resolved/Closed, we could reopen it
      if (['Resolved', 'Closed'].includes(ticket.status)) {
        ticket.status = 'In Progress';
      }
    }

    await ticket.save();

    // Broadcast updated ticket
    const io = req.app.get('io');
    if (io) {
      io.to(ticket.authorId).emit('ticketUpdated', ticket);
      io.to('admins').emit('ticketUpdated', ticket);
    }

    return res.json(ticket);
  } catch (error) {
    console.error('Add reply error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Regenerate AI Response Draft
const generateAiDraft = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Fetch context
    const authorUser = await User.findOne({ authorId: ticket.authorId });
    let referencedBook = null;
    if (ticket.bookId) {
      referencedBook = await Book.findOne({ bookId: ticket.bookId });
    }

    const aiDraft = await geminiService.generateDraftResponse(
      ticket,
      referencedBook,
      authorUser ? authorUser.name : 'Author'
    );

    ticket.aiDraftResponse = aiDraft;
    await ticket.save();

    return res.json({ aiDraftResponse: aiDraft });
  } catch (error) {
    console.error('Regenerate AI Draft error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addReply,
  generateAiDraft,
};
