const API_BASE = '/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  
  return data;
}

export async function fetchContests() {
  return fetchApi('/contests');
}

export async function fetchContest(slug) {
  return fetchApi(`/contests/${slug}`);
}

export async function createContest(data) {
  return fetchApi('/contests', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchEntries(slug) {
  return fetchApi(`/contests/${slug}/entries`);
}

export async function submitEntry(slug, formData) {
  const response = await fetch(`${API_BASE}/contests/${slug}/entries`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit entry');
  }
  
  return data;
}

export async function submitVotes(slug, voterId, votes) {
  return fetchApi(`/contests/${slug}/votes`, {
    method: 'POST',
    body: JSON.stringify({ voterId, votes })
  });
}

export async function fetchMyVotes(slug, voterId) {
  return fetchApi(`/contests/${slug}/votes/${voterId}`);
}

export async function verifyAdminPin(slug, pin) {
  return fetchApi(`/contests/${slug}/admin/verify`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}

export async function updateContest(slug, pin, data) {
  return fetchApi(`/contests/${slug}/admin`, {
    method: 'PUT',
    body: JSON.stringify({ pin, ...data })
  });
}

export async function fetchAdminEntries(slug, pin) {
  return fetchApi(`/contests/${slug}/admin/entries`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}

export async function deleteEntry(slug, entryId, pin) {
  return fetchApi(`/contests/${slug}/admin/entries/${entryId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
}

export async function fetchTimezone() {
  return fetchApi('/timezone');
}

// Generate a unique voter ID stored in localStorage
export function getVoterId() {
  let voterId = localStorage.getItem('familyContestVoterId');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('familyContestVoterId', voterId);
  }
  return voterId;
}

// Format date for display
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Format date for input fields
export function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

// Calculate time remaining
export function getTimeRemaining(deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
