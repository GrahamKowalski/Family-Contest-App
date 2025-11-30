import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-8xl mb-6">🎃</div>
      <h1 className="font-display text-4xl font-bold text-gray-800 mb-4">
        Page Not Found
      </h1>
      <p className="text-gray-600 mb-8">
        Oops! This page seems to have wandered off. Let's get you back on track.
      </p>
      <Link to="/" className="btn-primary">
        <span className="mr-2">🏠</span>
        Back to Home
      </Link>
    </div>
  );
}

export default NotFoundPage;
