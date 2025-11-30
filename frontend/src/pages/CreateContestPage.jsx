import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createContest, fetchTimezone } from '../utils/api';

function CreateContestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [timezone, setTimezone] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    adminPin: '',
    confirmPin: '',
    submissionDeadline: '',
    votingDeadline: ''
  });

  useEffect(() => {
    // Get server timezone
    fetchTimezone().then(data => setTimezone(data.timezone)).catch(() => {});
    
    // Set default deadlines (3 days for submissions, 5 days for voting)
    const now = new Date();
    const submissionDefault = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const votingDefault = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    
    setFormData(prev => ({
      ...prev,
      submissionDeadline: formatDateTimeLocal(submissionDefault),
      votingDeadline: formatDateTimeLocal(votingDefault)
    }));
  }, []);

  function formatDateTimeLocal(date) {
    return date.toISOString().slice(0, 16);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.name.trim()) {
      setError('Contest name is required');
      return;
    }
    
    if (formData.adminPin.length < 4) {
      setError('Admin PIN must be at least 4 characters');
      return;
    }
    
    if (formData.adminPin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    const subDeadline = new Date(formData.submissionDeadline);
    const voteDeadline = new Date(formData.votingDeadline);
    
    if (subDeadline <= new Date()) {
      setError('Submission deadline must be in the future');
      return;
    }
    
    if (voteDeadline <= subDeadline) {
      setError('Voting deadline must be after submission deadline');
      return;
    }
    
    try {
      setLoading(true);
      const contest = await createContest({
        name: formData.name.trim(),
        description: formData.description.trim(),
        adminPin: formData.adminPin,
        submissionDeadline: formData.submissionDeadline,
        votingDeadline: formData.votingDeadline
      });
      
      setSuccess(contest);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const contestUrl = `${window.location.origin}/contest/${success.slug}`;
    
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce-slow">🎉</div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-4">
            Contest Created!
          </h1>
          <p className="text-gray-600 mb-6">
            Your contest <strong>{success.name}</strong> is ready to go!
          </p>
          
          <div className="bg-warm-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Share this link with your family:</p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={contestUrl}
                className="input text-sm flex-1"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contestUrl);
                  alert('Link copied!');
                }}
                className="btn-primary btn-sm flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="bg-sage-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-sage-700 mb-1">
              <strong>Admin URL:</strong>
            </p>
            <p className="text-sm text-sage-600 break-all">
              {contestUrl}/admin
            </p>
            <p className="text-xs text-sage-500 mt-2">
              Use your PIN to manage the contest
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(`/contest/${success.slug}`)}
              className="btn-primary"
            >
              Go to Contest
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-outline"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
          Create a Contest
        </h1>
        <p className="text-gray-600">
          Set up a new family competition in just a few steps
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Contest Name */}
          <div>
            <label htmlFor="name" className="label">
              Contest Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Pumpkin Carving 2024"
              className="input"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add some fun details about the contest..."
              className="input min-h-[100px] resize-y"
              maxLength={500}
            />
          </div>

          {/* Deadlines */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="submissionDeadline" className="label">
                Submissions End *
              </label>
              <input
                type="datetime-local"
                id="submissionDeadline"
                name="submissionDeadline"
                value={formData.submissionDeadline}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="votingDeadline" className="label">
                Voting Ends *
              </label>
              <input
                type="datetime-local"
                id="votingDeadline"
                name="votingDeadline"
                value={formData.votingDeadline}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
          
          {timezone && (
            <p className="text-sm text-gray-500 -mt-3">
              Times are in {timezone} timezone
            </p>
          )}

          {/* Admin PIN */}
          <div className="border-t border-warm-100 pt-6">
            <p className="text-sm text-gray-500 mb-4">
              Create an admin PIN to manage this contest later. You'll need this to edit deadlines, remove entries, or change phases.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="adminPin" className="label">
                  Admin PIN *
                </label>
                <input
                  type="password"
                  id="adminPin"
                  name="adminPin"
                  value={formData.adminPin}
                  onChange={handleChange}
                  placeholder="At least 4 characters"
                  className="input"
                  minLength={4}
                />
              </div>
              <div>
                <label htmlFor="confirmPin" className="label">
                  Confirm PIN *
                </label>
                <input
                  type="password"
                  id="confirmPin"
                  name="confirmPin"
                  value={formData.confirmPin}
                  onChange={handleChange}
                  placeholder="Re-enter PIN"
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Create Contest
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateContestPage;
