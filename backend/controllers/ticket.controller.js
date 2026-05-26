const Ticket = require('../models/ticket.model');

// Valid status flows
const VALID_FORWARD = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed'
};

const VALID_BACKWARD = {
  in_progress: 'open',
  resolved: 'in_progress',
  closed: 'resolved'
};

// Create Ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;

    // Validate inputs
    if (!subject || !description || !customerEmail || !priority) {
      return res.status(400).json({ error: 'All fields (subject, description, customerEmail, priority) are required' });
    }

    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority
    });

    await ticket.save();
    return res.status(201).json(ticket);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    return res.status(500).json({ error: 'Server error creating ticket' });
  }
};

// Get Tickets
exports.listTickets = async (req, res) => {
  try {
    const { status, priority, breached } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    let tickets = await Ticket.find(query).sort({ createdAt: -1 });

    // Filter in-memory for derived breached field if queried
    if (breached !== undefined) {
      const isBreached = breached === 'true';
      tickets = tickets.filter(t => t.slaBreached === isBreached);
    }

    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ error: 'Server error listing tickets' });
  }
};

// Update Ticket
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, subject, description, priority } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // If updating status, enforce the rules
    if (newStatus !== undefined && newStatus !== ticket.status) {
      const currentStatus = ticket.status;
      const isForward = VALID_FORWARD[currentStatus] === newStatus;
      const isBackward = VALID_BACKWARD[currentStatus] === newStatus;

      if (!isForward && !isBackward) {
        return res.status(400).json({
          error: `Invalid transition from "${currentStatus}" to "${newStatus}". Allowed steps are sequential (e.g. open -> in_progress -> resolved -> closed) or backward one step (e.g. resolved -> in_progress).`
        });
      }

      // Update state-based timestamps
      if (newStatus === 'resolved') {
        ticket.resolvedAt = new Date();
      } else if (currentStatus === 'resolved' && newStatus !== 'resolved') {
        ticket.resolvedAt = null;
      }

      ticket.status = newStatus;
    }

    // Update other fields if provided
    if (subject !== undefined) ticket.subject = subject;
    if (description !== undefined) ticket.description = description;
    if (priority !== undefined) ticket.priority = priority;

    await ticket.save();
    return res.json(ticket);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    return res.status(500).json({ error: 'Server error updating ticket' });
  }
};

// Delete Ticket
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndDelete(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    return res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error deleting ticket' });
  }
};

// Get Ticket Stats
exports.getStats = async (req, res) => {
  try {
    // Get all tickets to compute virtual/derived properties properly
    const tickets = await Ticket.find({});

    const stats = {
      statusCounts: {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0
      },
      priorityCounts: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      },
      openSlaBreachedCount: 0
    };

    tickets.forEach(ticket => {
      // Increment status count
      if (stats.statusCounts[ticket.status] !== undefined) {
        stats.statusCounts[ticket.status]++;
      }

      // Increment priority count
      if (stats.priorityCounts[ticket.priority] !== undefined) {
        stats.priorityCounts[ticket.priority]++;
      }

      // SLA breached and currently open (i.e. status is open or in_progress)
      const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';
      if (isOpen && ticket.slaBreached) {
        stats.openSlaBreachedCount++;
      }
    });

    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching ticket stats' });
  }
};
