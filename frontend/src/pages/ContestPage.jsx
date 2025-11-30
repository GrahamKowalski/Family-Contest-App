import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchContest, fetchEntries, formatDate, getTimeRemaining } from '../utils/api';
import SubmissionPhase from '../components/SubmissionPhase';
import VotingPhase from '../components/VotingPhase';
import ResultsPhase from '../components/ResultsPhase';

function ContestPage() {
  const { slug } = useParams();
  const [contest, setContest] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryCount, setEntryCount] = useState(0);
  const [phase, setPhase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [contestData, entriesData] = await Promise.all([
        fetchContest(slug),
        fetchEntries(slug)
      ]);
      setContest(contestData);
      setEntries(entriesData.entries);
      setEntryCount(entriesData.entryCount ?? entriesData.entries.length);
      setPhase(entriesData.phase);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update countdown timer
  useEffect(() => {
    if (!contest) return;
    
    const updateTimer = () => {
      const deadline = contest.current_phase === 'submission' 
        ? contest.submission_deadline 
        : contest.current_phase === 'voting'
        ? contest.voting_deadline
        : null;
      
      if (deadline) {
        const remaining = getTimeRemaining(deadline);
        setTimeRemaining(remaining);
        
        // Reload data if deadline passed
        if (!remaining) {
          loadData();
        }
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [contest, loadData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-bounce text-5xl mb-4">🎃</div>
        <p className="text-gray-500">Loading contest...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
            Contest Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const phaseConfig = {
    submission: { 
      badge: 'badge-submission', 
      label: 'Submissions Open',
      icon: '📝',
      deadline: contest.submission_deadline,
      deadlineLabel: 'Submissions close'
    },
    voting: { 
      badge: 'badge-voting', 
      label: 'Voting Open',
      icon: '🗳️',
      deadline: contest.voting_deadline,
      deadlineLabel: 'Voting closes'
    },
    results: { 
      badge: 'badge-results', 
      label: 'Results',
      icon: '🏆',
      deadline: null,
      deadlineLabel: null
    }
  };

  const config = phaseConfig[phase];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Contest Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{config.icon}</span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-800">
                {contest.name}
              </h1>
            </div>
            {contest.description && (
              <p className="text-gray-600 mt-1">{contest.description}</p>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span className={config.badge}>{config.label}</span>
            <span className="text-sm font-medium text-gray-600">
              📦 {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
            </span>
            {timeRemaining && (
              <span className="text-sm text-warm-600 font-medium">
                ⏰ {timeRemaining}
              </span>
            )}
          </div>
        </div>
        
        {config.deadline && (
          <div className="mt-4 pt-4 border-t border-warm-100 text-sm text-gray-500">
            {config.deadlineLabel}: {formatDate(config.deadline)}
          </div>
        )}
        
        {/* Admin Link */}
        <div className="mt-4 pt-4 border-t border-warm-100">
          <Link 
            to={`/contest/${slug}/admin`}
            className="text-sm text-sage-600 hover:text-sage-700 hover:underline"
          >
            🔧 Contest Admin
          </Link>
        </div>
      </div>

      {/* Phase Content */}
      {phase === 'submission' && (
        <SubmissionPhase 
          contest={contest}
          entryCount={entryCount}
          onEntrySubmitted={loadData}
        />
      )}
      
      {phase === 'voting' && (
        <VotingPhase 
          contest={contest}
          entries={entries}
          onVoteSubmitted={loadData}
        />
      )}
      
      {phase === 'results' && (
        <ResultsPhase 
          contest={contest}
          entries={entries}
        />
      )}
    </div>
  );
}

export default ContestPage;
