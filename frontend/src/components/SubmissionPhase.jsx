import { useState, useRef } from 'react';
import { submitEntry } from '../utils/api';

function SubmissionPhase({ contest, entryCount, onEntrySubmitted }) {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, or HEIC)');
      return;
    }
    
    // Check file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('Image must be less than 25MB');
      return;
    }
    
    setImage(file);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!image) {
      setError('Please select an image');
      return;
    }
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('image', image);
      
      await submitEntry(contest.slug, formData);
      setSuccess(true);
      setName('');
      clearImage();
      onEntrySubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Submission Form */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold text-gray-800 mb-4">
          Submit Your Entry
        </h2>
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <span>Entry submitted successfully! Good luck!</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">Your Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input"
              maxLength={50}
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="label">Your Creation</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={loading}
            />
            
            {!preview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-warm-300 rounded-2xl p-8 
                         hover:border-warm-400 hover:bg-warm-50 transition-colors
                         focus:outline-none focus:ring-4 focus:ring-warm-500/20"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-600 font-medium">Click to upload photo</p>
                  <p className="text-sm text-gray-400 mt-1">JPEG, PNG, GIF, WebP up to 25MB</p>
                </div>
              </button>
            ) : (
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full max-h-80 object-contain rounded-2xl bg-gray-100"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2
                           hover:bg-red-600 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !name.trim() || !image}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Submit Entry
              </>
            )}
          </button>
        </form>
      </div>

      {/* Current Entry Count */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold text-gray-800 mb-4">
          Entries So Far
        </h2>
        
        <div className="text-center py-8">
          <div className="text-6xl font-display font-bold text-warm-500 mb-2">
            {entryCount}
          </div>
          <p className="text-gray-600">
            {entryCount === 1 ? 'entry submitted' : 'entries submitted'}
          </p>
        </div>
        
        <p className="text-sm text-gray-500 text-center">
          All entries remain hidden until voting begins
        </p>
      </div>
    </div>
  );
}

export default SubmissionPhase;
