const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

// Create Ticket
router.post('/', ticketController.createTicket);

// List Tickets
router.get('/', ticketController.listTickets);

// Get Stats
router.get('/stats', ticketController.getStats);

// Update Ticket
router.patch('/:id', ticketController.updateTicket);

// Delete Ticket
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
