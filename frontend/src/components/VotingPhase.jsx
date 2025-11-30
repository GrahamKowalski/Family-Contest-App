import { useState, useEffect } from 'react';
import { submitVotes, fetchMyVotes, getVoterId } from '../utils/api';

function VotingPhase({ contest, entries, onVoteSubmitted }) {
  const [selectedVotes, setSelectedVotes] = useState([]); // [{entryId, rank}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const voterId = getVoterId();

  useEffect(() => {
    // Check if user has already voted
    fetchMyVotes(contest.slug, voterId)
      .then(votes => {
        if (votes.length > 0) {
          setSelectedVotes(votes);
          setHasVoted(true);
        }
      })
      .catch(() => {});
  }, [contest.slug, voterId]);

  function handleVote(entryId, rank) {
    setSelectedVotes(prev => {
      // Remove any existing vote for this rank
      let newVotes = prev.filter(v => v.rank !== rank);
      // Remove any existing vote for this entry
      newVotes = newVotes.filter(v => v.entryId !== entryId);
      // Add new vote
      newVotes.push({ entryId, rank });
      return newVotes;
    });
    setSuccess(false);
  }

  function removeVote(entryId) {
    setSelectedVotes(prev => prev.filter(v => v.entryId !== entryId));
    setSuccess(false);
  }

  function getVoteRank(entryId) {
    const vote = selectedVotes.find(v => v.entryId === entryId);
    return vote ? vote.rank : null;
  }

  async function handleSubmit() {
    if (selectedVotes.length === 0) {
      setError('Please select at least one entry');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await submitVotes(contest.slug, voterId, selectedVotes);
      setSuccess(true);
      setHasVoted(true);
      onVoteSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rankLabels = {
    1: { label: '1st', emoji: '🥇', color: 'bg-amber-400 text-amber-900' },
    2: { label: '2nd', emoji: '🥈', color: 'bg-gray-300 text-gray-700' },
    3: { label: '3rd', emoji: '🥉', color: 'bg-orange-300 text-orange-800' }
  };

  return (
    <div className="space-y-6">
      {/* Voting Instructions */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
          Cast Your Votes
        </h2>
        <p className="text-gray-600">
          Select up to 3 favorites. Tap an entry to view it full-size, then use the buttons to rank it.
        </p>
        
        {hasVoted && !success && (
          <div className="mt-3 bg-warm-50 border border-warm-200 text-warm-700 px-4 py-2 rounded-xl text-sm">
            You've already voted. You can change your votes until voting closes.
          </div>
        )}
        
        {success && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>Your votes have been recorded!</span>
          </div>
        )}
        
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Selected Votes Summary */}
      {selectedVotes.length > 0 && (
        <div className="card p-4">
          <h3 className="font-display font-semibold text-gray-700 mb-3">Your Selections:</h3>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(rank => {
              const vote = selectedVotes.find(v => v.rank === rank);
              const entry = vote ? entries.find(e => e.id === vote.entryId) : null;
              const config = rankLabels[rank];
              
              return (
                <div 
                  key={rank}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                    entry ? config.color : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <span>{config.emoji}</span>
                  <span className="font-medium">
                    {entry ? `Entry #${entries.indexOf(entry) + 1}` : `${config.label} choice`}
                  </span>
                  {entry && (
                    <button
                      onClick={() => removeVote(entry.id)}
                      className="ml-1 hover:opacity-70"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading || selectedVotes.length === 0}
            className="btn-primary w-full mt-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : hasVoted ? (
              'Update Votes'
            ) : (
              <>
                <span className="mr-2">🗳️</span>
                Submit Votes
              </>
            )}
          </button>
        </div>
      )}

      {/* Entry Gallery */}
      {entries.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No entries to vote on.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {entries.map((entry, index) => {
            const voteRank = getVoteRank(entry.id);
            const rankConfig = voteRank ? rankLabels[voteRank] : null;
            
            return (
              <div 
                key={entry.id} 
                className={`card overflow-hidden transition-all duration-200 ${
                  voteRank ? 'ring-4 ring-warm-400 ring-offset-2' : ''
                }`}
              >
                {/* Entry Number Badge */}
                <div className="relative">
                  <button
                    onClick={() => setLightboxImage(`/uploads/${entry.image_filename}`)}
                    className="w-full aspect-square overflow-hidden bg-gray-100"
                  >
                    <img
                      src={`/uploads/${entry.image_filename}`}
                      alt={`Entry #${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                  
                  {/* Entry number */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-sm font-bold px-2 py-1 rounded-lg">
                    #{index + 1}
                  </div>
                  
                  {/* Vote badge */}
                  {voteRank && (
                    <div className={`absolute top-2 right-2 ${rankConfig.color} text-lg font-bold px-2 py-1 rounded-lg shadow-lg`}>
                      {rankConfig.emoji}
                    </div>
                  )}
                </div>
                
                {/* Vote Buttons */}
                <div className="p-3">
                  <div className="flex gap-2">
                    {[1, 2, 3].map(rank => {
                      const config = rankLabels[rank];
                      const isSelected = voteRank === rank;
                      const isRankTaken = selectedVotes.some(v => v.rank === rank && v.entryId !== entry.id);
                      
                      return (
                        <button
                          key={rank}
                          onClick={() => handleVote(entry.id, rank)}
                          disabled={isRankTaken}
                          className={`flex-1 py-2 px-2 rounded-xl text-sm font-semibold transition-all
                            ${isSelected 
                              ? config.color + ' scale-105 shadow-md' 
                              : isRankTaken
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {config.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:opacity-70"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default VotingPhase;
