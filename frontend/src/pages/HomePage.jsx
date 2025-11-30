import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchContests, formatDate, getTimeRemaining } from '../utils/api';

function ContestCard({ contest }) {
  const timeRemaining = contest.current_phase === 'submission' 
    ? getTimeRemaining(contest.submission_deadline)
    : contest.current_phase === 'voting'
    ? getTimeRemaining(contest.voting_deadline)
    : null;

  const phaseConfig = {
    submission: { badge: 'badge-submission', label: '📝 Submissions Open', icon: '✍️' },
    voting: { badge: 'badge-voting', label: '🗳️ Voting Open', icon: '🗳️' },
    results: { badge: 'badge-results', label: '🏆 Results', icon: '🎉' }
  };

  const config = phaseConfig[contest.current_phase];

  return (
    <Link to={`/contest/${contest.slug}`} className="card-hover p-6 block">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xl text-gray-800 truncate">
            {contest.name}
          </h3>
          {contest.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
              {contest.description}
            </p>
          )}
        </div>
        <span className="text-3xl flex-shrink-0">{config.icon}</span>
      </div>
      
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={config.badge}>{config.label}</span>
        <span className="text-sm text-gray-500">
          {contest.entry_count} {contest.entry_count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      
      {timeRemaining && (
        <div className="mt-3 text-sm text-warm-600 font-medium">
          ⏰ {timeRemaining}
        </div>
      )}
      
      {contest.current_phase === 'results' && (
        <div className="mt-3 text-sm text-sage-600 font-medium">
          🎊 Contest complete!
        </div>
      )}
    </Link>
  );
}

function HomePage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadContests();
  }, []);

  async function loadContests() {
    try {
      setLoading(true);
      const data = await fetchContests();
      setContests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const activeContests = contests.filter(c => c.current_phase !== 'results');
  const pastContests = contests.filter(c => c.current_phase === 'results');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
          Family <span className="text-gradient">Contest</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Run fun family competitions for pumpkin carving, gingerbread houses, 
          egg dyeing, and more! Easy to create, simple to vote.
        </p>
        <Link to="/create" className="btn-primary btn-lg">
          <span className="mr-2">✨</span>
          Create New Contest
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-bounce text-4xl mb-4">🎃</div>
          <p className="text-gray-500">Loading contests...</p>
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadContests} className="btn-outline">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Active Contests */}
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>🔥</span> Active Contests
            </h2>
            {activeContests.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500 mb-4">No active contests right now.</p>
                <Link to="/create" className="btn-outline">
                  Start the first one!
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            )}
          </section>

          {/* Past Contests */}
          {pastContests.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>📜</span> Past Contests
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pastContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* How It Works */}
      <section className="mt-16 card p-8">
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-6 text-center">
          How It Works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-display font-semibold text-lg mb-2">1. Submit</h3>
            <p className="text-gray-600 text-sm">
              Upload your creation with your name during the submission phase
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🗳️</div>
            <h3 className="font-display font-semibold text-lg mb-2">2. Vote</h3>
            <p className="text-gray-600 text-sm">
              Browse anonymous entries and pick your top 3 favorites
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-display font-semibold text-lg mb-2">3. Celebrate</h3>
            <p className="text-gray-600 text-sm">
              See who won and celebrate the creative winners!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
