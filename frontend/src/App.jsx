import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/tickets'
    : 'https://bajaj-task-fullstack.onrender.com/tickets');

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
    openSlaBreachedCount: 0
  });

  // Filter States
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBreached, setFilterBreached] = useState(false);

  // Form States
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [priority, setPriority] = useState('low');
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Loading States
  const [loading, setLoading] = useState(false);

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterPriority) params.append('priority', filterPriority);
      if (filterBreached) params.append('breached', 'true');

      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      const data = await response.json();
      setTickets(data);
      setGeneralError('');
    } catch (err) {
      setGeneralError('Error loading tickets. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Initial Load & On Filter Change
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filterPriority, filterBreached]);

  // Create Ticket Submission
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setGeneralError('');

    // Client-side validations
    const errors = {};
    if (!subject.trim()) errors.subject = 'Subject is required';
    if (!description.trim()) errors.description = 'Description is required';
    if (!customerEmail.trim()) {
      errors.customerEmail = 'Customer email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
      errors.customerEmail = 'Invalid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, customerEmail, priority })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error) {
          // Check for specific fields in backend error messages if returned as CSV
          if (data.error.includes('email') || data.error.includes('Email')) {
            setFormErrors({ customerEmail: data.error });
          } else {
            setGeneralError(data.error);
          }
        } else {
          setGeneralError('Failed to create ticket');
        }
        return;
      }

      // Reset form on success
      setSubject('');
      setDescription('');
      setCustomerEmail('');
      setPriority('low');

      // Refresh list and stats
      fetchTickets();
      fetchStats();
    } catch (err) {
      setGeneralError('Network error trying to submit ticket.');
    }
  };

  // Update Status
  const handleUpdateStatus = async (ticketId, newStatus) => {
    setGeneralError('');
    try {
      const response = await fetch(`${API_URL}/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        setGeneralError(data.error || 'Failed to update ticket status');
        return;
      }

      fetchTickets();
      fetchStats();
    } catch (err) {
      setGeneralError('Network error trying to update status.');
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    setGeneralError('');
    try {
      const response = await fetch(`${API_URL}/${ticketId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        setGeneralError(data.error || 'Failed to delete ticket');
        return;
      }

      fetchTickets();
      fetchStats();
    } catch (err) {
      setGeneralError('Network error trying to delete ticket.');
    }
  };

  // Format age in minutes to readable hours & minutes
  const formatAge = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Group tickets by column status
  const columns = {
    open: tickets.filter(t => t.status === 'open'),
    in_progress: tickets.filter(t => t.status === 'in_progress'),
    resolved: tickets.filter(t => t.status === 'resolved'),
    closed: tickets.filter(t => t.status === 'closed')
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '20px' }}>
      <h1>DeskFlow — Support Ticket Triage Board</h1>

      {/* STATS STRIP */}
      <fieldset style={{ marginBottom: '20px', padding: '10px' }}>
        <legend><b>System Status Stats</b></legend>
        <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center' }}>
          <thead>
            <tr>
              <th>Open Tickets</th>
              <th>In Progress Tickets</th>
              <th>Resolved Tickets</th>
              <th>Closed Tickets</th>
              <th style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Total Open SLA Breached</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{stats.statusCounts.open}</td>
              <td>{stats.statusCounts.in_progress}</td>
              <td>{stats.statusCounts.resolved}</td>
              <td>{stats.statusCounts.closed}</td>
              <td style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>
                {stats.openSlaBreachedCount}
              </td>
            </tr>
          </tbody>
        </table>
      </fieldset>

      {/* FILTERS */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="filter-priority">Filter by Priority: </label>
          <select
            id="filter-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={filterBreached}
              onChange={(e) => setFilterBreached(e.target.checked)}
            />
            Show Only SLA Breached
          </label>
        </div>

        <button onClick={() => { fetchTickets(); fetchStats(); }}>Refresh Board</button>
      </div>

      {generalError && (
        <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '20px', backgroundColor: '#fff5f5' }}>
          <strong>Error: </strong> {generalError}
        </div>
      )}

      {/* BOARD VIEW */}
      {loading && <p>Loading board data...</p>}
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', marginBottom: '40px' }}>
        
        {/* OPEN COLUMN */}
        <div style={{ flex: '1', minWidth: '250px', border: '2px solid #ccc', padding: '10px', backgroundColor: '#fcfcfc' }}>
          <h3>Open ({columns.open.length})</h3>
          <hr />
          {columns.open.map(ticket => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              formatAge={formatAge}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteTicket}
              allowedTransitions={[{ target: 'in_progress', label: 'Start Progress →' }]}
            />
          ))}
        </div>

        {/* IN PROGRESS COLUMN */}
        <div style={{ flex: '1', minWidth: '250px', border: '2px solid #ccc', padding: '10px', backgroundColor: '#f5faff' }}>
          <h3>In Progress ({columns.in_progress.length})</h3>
          <hr />
          {columns.in_progress.map(ticket => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              formatAge={formatAge}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteTicket}
              allowedTransitions={[
                { target: 'open', label: '← Move to Open' },
                { target: 'resolved', label: 'Resolve Ticket →' }
              ]}
            />
          ))}
        </div>

        {/* RESOLVED COLUMN */}
        <div style={{ flex: '1', minWidth: '250px', border: '2px solid #ccc', padding: '10px', backgroundColor: '#f6fff6' }}>
          <h3>Resolved ({columns.resolved.length})</h3>
          <hr />
          {columns.resolved.map(ticket => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              formatAge={formatAge}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteTicket}
              allowedTransitions={[
                { target: 'in_progress', label: '← Move to In Progress' },
                { target: 'closed', label: 'Close Ticket →' }
              ]}
            />
          ))}
        </div>

        {/* CLOSED COLUMN */}
        <div style={{ flex: '1', minWidth: '250px', border: '2px solid #ccc', padding: '10px', backgroundColor: '#f4f4f4' }}>
          <h3>Closed ({columns.closed.length})</h3>
          <hr />
          {columns.closed.map(ticket => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              formatAge={formatAge}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteTicket}
              allowedTransitions={[{ target: 'resolved', label: '← Reopen to Resolved' }]}
            />
          ))}
        </div>

      </div>

      {/* CREATE TICKET FORM */}
      <fieldset style={{ padding: '20px', maxWidth: '600px' }}>
        <legend><h2>Create New Support Ticket</h2></legend>
        <form onSubmit={handleCreateTicket}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }} htmlFor="subject">Subject *</label>
            <input
              id="subject"
              type="text"
              style={{ width: '100%', padding: '5px' }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            {formErrors.subject && <span style={{ color: 'red', fontSize: '0.85em' }}>{formErrors.subject}</span>}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }} htmlFor="description">Description *</label>
            <textarea
              id="description"
              rows="4"
              style={{ width: '100%', padding: '5px' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {formErrors.description && <span style={{ color: 'red', fontSize: '0.85em' }}>{formErrors.description}</span>}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }} htmlFor="customerEmail">Customer Email *</label>
            <input
              id="customerEmail"
              type="text"
              style={{ width: '100%', padding: '5px' }}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            {formErrors.customerEmail && <span style={{ color: 'red', fontSize: '0.85em' }}>{formErrors.customerEmail}</span>}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }} htmlFor="priority">Priority *</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '8px 15px', fontWeight: 'bold', cursor: 'pointer' }}>
            Submit Support Ticket
          </button>
        </form>
      </fieldset>
    </div>
  );
}

// TicketCard Subcomponent
function TicketCard({ ticket, formatAge, onUpdateStatus, onDelete, allowedTransitions }) {
  // Pure basic styles for priority badge
  const priorityStyles = {
    urgent: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' },
    high: { backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fb923c' },
    medium: { backgroundColor: '#fef9c3', color: '#a16207', border: '1px solid #facc15' },
    low: { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #4ade80' }
  };

  const badgeStyle = priorityStyles[ticket.priority] || {};

  return (
    <div style={{
      border: '1px solid #bbb',
      margin: '10px 0',
      padding: '10px',
      backgroundColor: '#fff',
      boxShadow: '1px 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 5px 0' }}>{ticket.subject}</h4>
      <p style={{ fontSize: '0.9em', color: '#555', margin: '0 0 8px 0', wordBreak: 'break-word' }}>
        {ticket.description}
      </p>
      
      <div style={{ fontSize: '0.85em', margin: '5px 0' }}>
        <b>Email:</b> {ticket.customerEmail}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', margin: '8px 0' }}>
        <span style={{
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '0.8em',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          ...badgeStyle
        }}>
          {ticket.priority}
        </span>

        <span style={{ fontSize: '0.85em', color: '#666' }}>
          🕒 Age: {formatAge(ticket.ageMinutes)}
        </span>
      </div>

      {ticket.slaBreached && (
        <div style={{
          color: '#b91c1c',
          backgroundColor: '#fef2f2',
          padding: '4px',
          border: '1px solid #fee2e2',
          fontSize: '0.8em',
          fontWeight: 'bold',
          margin: '8px 0',
          textAlign: 'center'
        }}>
          ⚠️ SLA BREACHED
        </div>
      )}

      <hr />

      {/* Transition control buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
        {allowedTransitions.map((t, idx) => (
          <button
            key={idx}
            style={{ fontSize: '0.85em', padding: '3px 6px', cursor: 'pointer' }}
            onClick={() => onUpdateStatus(ticket._id, t.target)}
          >
            {t.label}
          </button>
        ))}
        
        <button
          style={{
            fontSize: '0.8em',
            padding: '3px 6px',
            cursor: 'pointer',
            backgroundColor: '#fff1f1',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            marginTop: '5px'
          }}
          onClick={() => onDelete(ticket._id)}
        >
          Delete Ticket 🗑️
        </button>
      </div>
    </div>
  );
}

export default App;
