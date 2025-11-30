import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  fetchContest, 
  verifyAdminPin, 
  updateContest, 
  fetchAdminEntries,
  deleteEntry,
  formatDate,
  formatDateForInput
} from '../utils/api';

function AdminPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState(null);
  const [entries, setEntries] = useState([]);
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    submissionDeadline: '',
    votingDeadline: ''
  });

  useEffect(() => {
    loadContest();
  }, [slug]);

  async function loadContest() {
    try {
      setLoading(true);
      const data = await fetchContest(slug);
      setContest(data);
      setEditForm({
        submissionDeadline: formatDateForInput(data.submission_deadline),
        votingDeadline: formatDateForInput(data.voting_deadline)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    
    try {
      await verifyAdminPin(slug, pin);
      setAuthenticated(true);
      loadEntries();
    } catch (err) {
      setError('Invalid PIN');
    }
  }

  async function loadEntries() {
    try {
      const data = await fetchAdminEntries(slug, pin);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateDeadlines(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    try {
      const updated = await updateContest(slug, pin, {
        submissionDeadline: editForm.submissionDeadline,
        votingDeadline: editForm.votingDeadline
      });
      setContest(updated);
      setMessage('Deadlines updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePhaseChange(newPhase) {
    setError(null);
    setMessage(null);
    
    if (!confirm(`Are you sure you want to change the phase to "${newPhase}"?`)) {
      return;
    }
    
    try {
      const updated = await updateContest(slug, pin, { currentPhase: newPhase });
      setContest(updated);
      setMessage(`Phase changed to ${newPhase}!`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteEntry(entryId, entryName) {
    setError(null);
    setMessage(null);
    
    if (!confirm(`Are you sure you want to delete the entry from "${entryName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteEntry(slug, entryId, pin);
      setEntries(entries.filter(e => e.id !== entryId));
      setMessage('Entry deleted successfully.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-bounce text-4xl mb-4">🔧</div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
            Contest Not Found
          </h1>
          <Link to="/" className="btn-primary mt-4">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // PIN Entry Screen
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="font-display text-2xl font-bold text-gray-800">
              Admin Access
            </h1>
            <p className="text-gray-600 mt-1">{contest.name}</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <label htmlFor="pin" className="label">Admin PIN</label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="input mb-4"
              autoFocus
            />
            <button type="submit" className="btn-primary w-full">
              Access Admin Panel
            </button>
          </form>
          
          <Link 
            to={`/contest/${slug}`}
            className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            ← Back to Contest
          </Link>
        </div>
      </div>
    );
  }

  const phaseConfig = {
    submission: { badge: 'badge-submission', label: 'Submissions Open', icon: '📝' },
    voting: { badge: 'badge-voting', label: 'Voting Open', icon: '🗳️' },
    results: { badge: 'badge-results', label: 'Results', icon: '🏆' }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-800">
          Admin Panel
        </h1>
        <Link to={`/contest/${slug}`} className="btn-outline btn-sm">
          View Contest
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
          {message}
        </div>
      )}

      {/* Contest Info */}
      <div className="card p-6 mb-6">
        <h2 className="font-display font-bold text-lg text-gray-800 mb-4">
          {contest.name}
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <span className={phaseConfig[contest.current_phase].badge}>
            {phaseConfig[contest.current_phase].icon} {phaseConfig[contest.current_phase].label}
          </span>
          <span className="text-sm text-gray-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Phase Controls */}
      <div className="card p-6 mb-6">
        <h3 className="font-display font-semibold text-gray-800 mb-4">Phase Controls</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manually change the contest phase. This overrides automatic deadline transitions.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePhaseChange('submission')}
            disabled={contest.current_phase === 'submission'}
            className={`btn-sm ${contest.current_phase === 'submission' ? 'btn-primary' : 'btn-outline'}`}
          >
            📝 Open Submissions
          </button>
          <button
            onClick={() => handlePhaseChange('voting')}
            disabled={contest.current_phase === 'voting'}
            className={`btn-sm ${contest.current_phase === 'voting' ? 'btn-primary' : 'btn-outline'}`}
          >
            🗳️ Start Voting
          </button>
          <button
            onClick={() => handlePhaseChange('results')}
            disabled={contest.current_phase === 'results'}
            className={`btn-sm ${contest.current_phase === 'results' ? 'btn-primary' : 'btn-outline'}`}
          >
            🏆 Show Results
          </button>
        </div>
      </div>

      {/* Deadline Editor */}
      <div className="card p-6 mb-6">
        <h3 className="font-display font-semibold text-gray-800 mb-4">Deadlines</h3>
        <form onSubmit={handleUpdateDeadlines} className="space-y-4">
          <div>
            <label className="label">Submissions Close</label>
            <input
              type="datetime-local"
              value={editForm.submissionDeadline}
              onChange={(e) => setEditForm(prev => ({ ...prev, submissionDeadline: e.target.value }))}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {formatDate(contest.submission_deadline)}
            </p>
          </div>
          <div>
            <label className="label">Voting Closes</label>
            <input
              type="datetime-local"
              value={editForm.votingDeadline}
              onChange={(e) => setEditForm(prev => ({ ...prev, votingDeadline: e.target.value }))}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {formatDate(contest.voting_deadline)}
            </p>
          </div>
          <button type="submit" className="btn-secondary">
            Update Deadlines
          </button>
        </form>
      </div>

      {/* Entries Management */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-gray-800 mb-4">
          Manage Entries ({entries.length})
        </h3>
        
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No entries yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div 
                key={entry.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
              >
                <img
                  src={`/uploads/${entry.image_filename}`}
                  alt={entry.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{entry.name}</p>
                  <p className="text-xs text-gray-500">
                    Submitted {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id, entry.name)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete entry"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Link */}
      <div className="card p-6 mt-6">
        <h3 className="font-display font-semibold text-gray-800 mb-4">Share Link</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${window.location.origin}/contest/${slug}`}
            className="input flex-1 text-sm"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/contest/${slug}`);
              setMessage('Link copied to clipboard!');
            }}
            className="btn-primary btn-sm"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
