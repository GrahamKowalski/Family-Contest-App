const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const slugify = require('slugify');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;

// Ensure directories exist
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/app/uploads' : path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initialize database
const db = new Database(path.join(DATA_DIR, 'contests.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    admin_pin_hash TEXT NOT NULL,
    submission_deadline TEXT NOT NULL,
    voting_deadline TEXT NOT NULL,
    current_phase TEXT DEFAULT 'submission' CHECK(current_phase IN ('submission', 'voting', 'results')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    image_filename TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
    UNIQUE(contest_id, name)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    voter_id TEXT NOT NULL,
    entry_id INTEGER NOT NULL,
    rank INTEGER NOT NULL CHECK(rank >= 1 AND rank <= 3),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
    UNIQUE(contest_id, voter_id, rank),
    UNIQUE(contest_id, voter_id, entry_id)
  );

  CREATE INDEX IF NOT EXISTS idx_contests_slug ON contests(slug);
  CREATE INDEX IF NOT EXISTS idx_entries_contest ON entries(contest_id);
  CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id);
  CREATE INDEX IF NOT EXISTS idx_votes_entry ON votes(entry_id);
`);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${nanoid(12)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, HEIC)'));
    }
  }
});

// Helper functions
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function generateUniqueSlug(name) {
  const baseSlug = slugify(name, { lower: true, strict: true });
  const existing = db.prepare('SELECT slug FROM contests WHERE slug LIKE ?').all(`${baseSlug}%`);
  
  if (existing.length === 0) return baseSlug;
  
  const existingSlugs = new Set(existing.map(r => r.slug));
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;
  while (existingSlugs.has(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }
  return newSlug;
}

function updateContestPhase(contest) {
  const now = new Date();
  const submissionDeadline = new Date(contest.submission_deadline);
  const votingDeadline = new Date(contest.voting_deadline);
  
  let newPhase = contest.current_phase;
  
  if (contest.current_phase === 'submission' && now >= submissionDeadline) {
    newPhase = 'voting';
  }
  if ((contest.current_phase === 'submission' || contest.current_phase === 'voting') && now >= votingDeadline) {
    newPhase = 'results';
  }
  
  if (newPhase !== contest.current_phase) {
    db.prepare('UPDATE contests SET current_phase = ? WHERE id = ?').run(newPhase, contest.id);
    contest.current_phase = newPhase;
  }
  
  return contest;
}

function getContestWithPhase(slug) {
  const contest = db.prepare('SELECT * FROM contests WHERE slug = ?').get(slug);
  if (!contest) return null;
  return updateContestPhase(contest);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get server timezone
app.get('/api/timezone', (req, res) => {
  res.json({ timezone: process.env.TZ || 'UTC' });
});

// List all contests
app.get('/api/contests', (req, res) => {
  try {
    const contests = db.prepare(`
      SELECT c.*, COUNT(e.id) as entry_count
      FROM contests c
      LEFT JOIN entries e ON c.id = e.contest_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();
    
    // Update phases for all contests
    const updatedContests = contests.map(c => {
      const updated = updateContestPhase(c);
      // Don't send admin pin hash to client
      delete updated.admin_pin_hash;
      return updated;
    });
    
    res.json(updatedContests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

// Create new contest
app.post('/api/contests', (req, res) => {
  try {
    const { name, description, adminPin, submissionDeadline, votingDeadline } = req.body;
    
    if (!name || !adminPin || !submissionDeadline || !votingDeadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (adminPin.length < 4) {
      return res.status(400).json({ error: 'Admin PIN must be at least 4 characters' });
    }
    
    const subDeadline = new Date(submissionDeadline);
    const voteDeadline = new Date(votingDeadline);
    
    if (subDeadline >= voteDeadline) {
      return res.status(400).json({ error: 'Voting deadline must be after submission deadline' });
    }
    
    const slug = generateUniqueSlug(name);
    const pinHash = hashPin(adminPin);
    
    const result = db.prepare(`
      INSERT INTO contests (slug, name, description, admin_pin_hash, submission_deadline, voting_deadline)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, name, description || '', pinHash, submissionDeadline, votingDeadline);
    
    const contest = db.prepare('SELECT * FROM contests WHERE id = ?').get(result.lastInsertRowid);
    delete contest.admin_pin_hash;
    
    res.status(201).json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ error: 'Failed to create contest' });
  }
});

// Get single contest
app.get('/api/contests/:slug', (req, res) => {
  try {
    const contest = getContestWithPhase(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    delete contest.admin_pin_hash;
    
    // Get entry count
    const entryCount = db.prepare('SELECT COUNT(*) as count FROM entries WHERE contest_id = ?').get(contest.id);
    contest.entry_count = entryCount.count;
    
    res.json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ error: 'Failed to fetch contest' });
  }
});

// Get entries for a contest
app.get('/api/contests/:slug/entries', (req, res) => {
  try {
    const contest = getContestWithPhase(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const entries = db.prepare('SELECT * FROM entries WHERE contest_id = ? ORDER BY created_at ASC').all(contest.id);
    
    // In submission phase, hide names (anonymous until results)
    // In voting phase, hide names (anonymous)
    // In results phase, show everything including votes
    
    if (contest.current_phase === 'submission') {
      // Only send count, no image data - keep entries completely hidden
      return res.json({ entries: [], entryCount: entries.length, phase: contest.current_phase });
    }
    
    if (contest.current_phase === 'voting') {
      // Shuffle entries and hide names
      const shuffled = entries
        .map(e => ({ ...e, sortKey: Math.random() }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, name, ...rest }) => rest);
      return res.json({ entries: shuffled, phase: contest.current_phase });
    }
    
    if (contest.current_phase === 'results') {
      // Calculate votes for each entry
      const entriesWithVotes = entries.map(entry => {
        const votes = db.prepare(`
          SELECT rank, COUNT(*) as count 
          FROM votes 
          WHERE entry_id = ? 
          GROUP BY rank
        `).all(entry.id);
        
        // Calculate score: 1st = 3 points, 2nd = 2 points, 3rd = 1 point
        let score = 0;
        let voteBreakdown = { first: 0, second: 0, third: 0 };
        votes.forEach(v => {
          if (v.rank === 1) { score += 3; voteBreakdown.first = v.count; }
          if (v.rank === 2) { score += 2; voteBreakdown.second = v.count; }
          if (v.rank === 3) { score += 1; voteBreakdown.third = v.count; }
        });
        
        return { ...entry, score, voteBreakdown };
      });
      
      // Sort by score descending
      entriesWithVotes.sort((a, b) => b.score - a.score);
      
      return res.json({ entries: entriesWithVotes, phase: contest.current_phase });
    }
    
    // Fallback (shouldn't reach here normally)
    res.json({ entries, phase: contest.current_phase });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Submit entry
app.post('/api/contests/:slug/entries', upload.single('image'), (req, res) => {
  try {
    const contest = getContestWithPhase(req.params.slug);
    if (!contest) {
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    if (contest.current_phase !== 'submission') {
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'Submissions are closed for this contest' });
    }
    
    const { name } = req.body;
    if (!name || !req.file) {
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'Name and image are required' });
    }
    
    // Check for duplicate name
    const existing = db.prepare('SELECT id FROM entries WHERE contest_id = ? AND LOWER(name) = LOWER(?)').get(contest.id, name);
    if (existing) {
      fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'An entry with this name already exists' });
    }
    
    const result = db.prepare(`
      INSERT INTO entries (contest_id, name, image_filename)
      VALUES (?, ?, ?)
    `).run(contest.id, name.trim(), req.file.filename);
    
    const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    if (req.file) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)); } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Submit votes
app.post('/api/contests/:slug/votes', (req, res) => {
  try {
    const contest = getContestWithPhase(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    if (contest.current_phase !== 'voting') {
      return res.status(400).json({ error: 'Voting is not open for this contest' });
    }
    
    const { voterId, votes } = req.body;
    // votes should be an array like [{ entryId: 1, rank: 1 }, { entryId: 2, rank: 2 }]
    
    if (!voterId || !votes || !Array.isArray(votes)) {
      return res.status(400).json({ error: 'Invalid vote data' });
    }
    
    if (votes.length > 3) {
      return res.status(400).json({ error: 'You can only vote for up to 3 entries' });
    }
    
    // Validate ranks and entries
    const ranks = new Set();
    const entryIds = new Set();
    for (const vote of votes) {
      if (vote.rank < 1 || vote.rank > 3) {
        return res.status(400).json({ error: 'Invalid rank value' });
      }
      if (ranks.has(vote.rank)) {
        return res.status(400).json({ error: 'Duplicate rank' });
      }
      if (entryIds.has(vote.entryId)) {
        return res.status(400).json({ error: 'Cannot vote for the same entry twice' });
      }
      ranks.add(vote.rank);
      entryIds.add(vote.entryId);
      
      // Verify entry exists in this contest
      const entry = db.prepare('SELECT id FROM entries WHERE id = ? AND contest_id = ?').get(vote.entryId, contest.id);
      if (!entry) {
        return res.status(400).json({ error: 'Invalid entry' });
      }
    }
    
    // Delete any existing votes from this voter
    db.prepare('DELETE FROM votes WHERE contest_id = ? AND voter_id = ?').run(contest.id, voterId);
    
    // Insert new votes
    const insertVote = db.prepare('INSERT INTO votes (contest_id, voter_id, entry_id, rank) VALUES (?, ?, ?, ?)');
    for (const vote of votes) {
      insertVote.run(contest.id, voterId, vote.entryId, vote.rank);
    }
    
    res.json({ success: true, message: 'Votes recorded successfully' });
  } catch (error) {
    console.error('Error recording votes:', error);
    res.status(500).json({ error: 'Failed to record votes' });
  }
});

// Get voter's existing votes
app.get('/api/contests/:slug/votes/:voterId', (req, res) => {
  try {
    const contest = getContestWithPhase(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const votes = db.prepare(`
      SELECT entry_id as entryId, rank 
      FROM votes 
      WHERE contest_id = ? AND voter_id = ?
    `).all(contest.id, req.params.voterId);
    
    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Admin: Verify PIN
app.post('/api/contests/:slug/admin/verify', (req, res) => {
  try {
    const contest = db.prepare('SELECT * FROM contests WHERE slug = ?').get(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN required' });
    }
    
    const pinHash = hashPin(pin);
    if (pinHash !== contest.admin_pin_hash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// Admin: Update contest
app.put('/api/contests/:slug/admin', (req, res) => {
  try {
    const contest = db.prepare('SELECT * FROM contests WHERE slug = ?').get(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const { pin, submissionDeadline, votingDeadline, currentPhase } = req.body;
    
    // Verify PIN
    const pinHash = hashPin(pin);
    if (pinHash !== contest.admin_pin_hash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    // Update fields
    if (submissionDeadline && votingDeadline) {
      const subDeadline = new Date(submissionDeadline);
      const voteDeadline = new Date(votingDeadline);
      
      if (subDeadline >= voteDeadline) {
        return res.status(400).json({ error: 'Voting deadline must be after submission deadline' });
      }
      
      db.prepare('UPDATE contests SET submission_deadline = ?, voting_deadline = ? WHERE id = ?')
        .run(submissionDeadline, votingDeadline, contest.id);
    }
    
    if (currentPhase && ['submission', 'voting', 'results'].includes(currentPhase)) {
      db.prepare('UPDATE contests SET current_phase = ? WHERE id = ?').run(currentPhase, contest.id);
    }
    
    const updated = db.prepare('SELECT * FROM contests WHERE id = ?').get(contest.id);
    delete updated.admin_pin_hash;
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ error: 'Failed to update contest' });
  }
});

// Admin: Delete entry
app.delete('/api/contests/:slug/admin/entries/:entryId', (req, res) => {
  try {
    const contest = db.prepare('SELECT * FROM contests WHERE slug = ?').get(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const { pin } = req.body;
    const pinHash = hashPin(pin);
    if (pinHash !== contest.admin_pin_hash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND contest_id = ?').get(req.params.entryId, contest.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Delete image file
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, entry.image_filename));
    } catch (e) {
      console.warn('Could not delete image file:', e.message);
    }
    
    // Delete votes for this entry
    db.prepare('DELETE FROM votes WHERE entry_id = ?').run(entry.id);
    
    // Delete entry
    db.prepare('DELETE FROM entries WHERE id = ?').run(entry.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Admin: Get entries with names (for admin view during any phase)
app.post('/api/contests/:slug/admin/entries', (req, res) => {
  try {
    const contest = db.prepare('SELECT * FROM contests WHERE slug = ?').get(req.params.slug);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    
    const { pin } = req.body;
    const pinHash = hashPin(pin);
    if (pinHash !== contest.admin_pin_hash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    const entries = db.prepare('SELECT * FROM entries WHERE contest_id = ? ORDER BY created_at ASC').all(contest.id);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching admin entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Catch-all for SPA routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎃 Family Contest server running on port ${PORT}`);
  console.log(`   Timezone: ${process.env.TZ || 'UTC'}`);
  console.log(`   Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
});
