import { useState, useEffect } from 'react';

function Confetti() {
  const [pieces, setPieces] = useState([]);
  
  useEffect(() => {
    const colors = ['#ed7426', '#f6b77f', '#687856', '#fad5b1', '#fbbf24', '#f87171'];
    const newPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 8
    }));
    setPieces(newPieces);
    
    // Clear confetti after animation
    const timer = setTimeout(() => setPieces([]), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute top-0"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `confetti-fall ${piece.duration}s ease-out forwards`,
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
}

function Trophy({ place }) {
  const config = {
    1: { emoji: '🏆', label: '1st Place', color: 'trophy-gold', bgColor: 'bg-gradient-to-b from-amber-100 to-amber-50' },
    2: { emoji: '🥈', label: '2nd Place', color: 'trophy-silver', bgColor: 'bg-gradient-to-b from-gray-100 to-gray-50' },
    3: { emoji: '🥉', label: '3rd Place', color: 'trophy-bronze', bgColor: 'bg-gradient-to-b from-orange-100 to-orange-50' }
  };
  
  return config[place] || null;
}

function ResultsPhase({ contest, entries }) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    // Show confetti on first load
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">😅</div>
        <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
          No Entries
        </h2>
        <p className="text-gray-600">
          This contest ended without any entries.
        </p>
      </div>
    );
  }

  // Entries should already be sorted by score from the API
  const winner = entries[0];
  const runnerUps = entries.slice(1, 3);
  const otherEntries = entries.slice(3);

  return (
    <div className="space-y-8">
      {showConfetti && <Confetti />}
      
      {/* Winner Section */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-b from-amber-100 via-amber-50 to-white p-6 sm:p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce-slow">🏆</div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-800 mb-2">
            Winner!
          </h2>
          <p className="text-amber-700 font-display text-xl">{winner.name}</p>
        </div>
        
        <div className="p-4">
          <button
            onClick={() => setLightboxImage(`/uploads/${winner.image_filename}`)}
            className="w-full aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-lg hover:shadow-xl transition-shadow"
          >
            <img
              src={`/uploads/${winner.image_filename}`}
              alt={`Winner: ${winner.name}`}
              className="w-full h-full object-contain"
            />
          </button>
          
          <div className="mt-4 flex justify-center gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-600">{winner.score}</div>
              <div className="text-sm text-gray-500">points</div>
            </div>
            <div className="border-l border-gray-200" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{winner.voteBreakdown.first}</div>
              <div className="text-sm text-gray-500">1st votes</div>
            </div>
            <div className="border-l border-gray-200" />
            <div>
              <div className="text-2xl font-bold text-gray-600">{winner.voteBreakdown.second}</div>
              <div className="text-sm text-gray-500">2nd votes</div>
            </div>
            <div className="border-l border-gray-200" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{winner.voteBreakdown.third}</div>
              <div className="text-sm text-gray-500">3rd votes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Runner Ups */}
      {runnerUps.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-bold text-gray-800 mb-4 text-center">
            Runners Up
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {runnerUps.map((entry, index) => {
              const place = index + 2;
              const trophy = Trophy({ place });
              
              return (
                <div key={entry.id} className={`card overflow-hidden ${trophy.bgColor}`}>
                  <div className="p-4 text-center">
                    <div className={`text-4xl mb-2 ${trophy.color}`}>{trophy.emoji}</div>
                    <div className="font-display font-bold text-gray-700">{trophy.label}</div>
                    <div className="text-lg font-medium text-gray-800 mt-1">{entry.name}</div>
                  </div>
                  
                  <button
                    onClick={() => setLightboxImage(`/uploads/${entry.image_filename}`)}
                    className="w-full aspect-square overflow-hidden bg-white/50"
                  >
                    <img
                      src={`/uploads/${entry.image_filename}`}
                      alt={`${trophy.label}: ${entry.name}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                  
                  <div className="p-4 bg-white/80 flex justify-center gap-4 text-sm">
                    <span><strong>{entry.score}</strong> pts</span>
                    <span>🥇 {entry.voteBreakdown.first}</span>
                    <span>🥈 {entry.voteBreakdown.second}</span>
                    <span>🥉 {entry.voteBreakdown.third}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Other Entries */}
      {otherEntries.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-bold text-gray-800 mb-4 text-center">
            All Entries
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherEntries.map((entry, index) => (
              <div key={entry.id} className="card overflow-hidden">
                <button
                  onClick={() => setLightboxImage(`/uploads/${entry.image_filename}`)}
                  className="w-full aspect-square overflow-hidden bg-gray-100"
                >
                  <img
                    src={`/uploads/${entry.image_filename}`}
                    alt={`Entry by ${entry.name}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
                <div className="p-3">
                  <p className="font-medium text-gray-800 truncate">{entry.name}</p>
                  <p className="text-sm text-gray-500">
                    {entry.score} pts
                    {entry.voteBreakdown.first > 0 && ` • 🥇${entry.voteBreakdown.first}`}
                    {entry.voteBreakdown.second > 0 && ` • 🥈${entry.voteBreakdown.second}`}
                    {entry.voteBreakdown.third > 0 && ` • 🥉${entry.voteBreakdown.third}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="card overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-display font-bold text-gray-800">Full Leaderboard</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {entries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-4 p-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${index === 0 ? 'bg-amber-400 text-amber-900' : 
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-orange-300 text-orange-800' :
                  'bg-gray-100 text-gray-600'}`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{entry.name}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-800">{entry.score} pts</div>
                <div className="text-xs text-gray-500">
                  {entry.voteBreakdown.first}·{entry.voteBreakdown.second}·{entry.voteBreakdown.third}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Explanation */}
      <div className="text-center text-sm text-gray-500">
        <p>Scoring: 🥇 1st choice = 3 points • 🥈 2nd choice = 2 points • 🥉 3rd choice = 1 point</p>
      </div>

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

export default ResultsPhase;
