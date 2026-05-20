const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addReply,
  generateAiDraft,
} = require('../controllers/ticketController');
const { protect, requireRole } = require('../middleware/auth');

router.route('/')
  .post(protect, createTicket)
  .get(protect, getTickets);

router.route('/:id')
  .get(protect, getTicketById)
  .patch(protect, requireRole(['admin']), updateTicket);

router.route('/:id/reply')
  .post(protect, addReply);

router.route('/:id/ai-draft')
  .post(protect, requireRole(['admin']), generateAiDraft);

module.exports = router;
