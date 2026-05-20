import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import PageWrapper from '../components/PageWrapper';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand to-purple-500 opacity-80 mb-4 animate-pulse-slow">
            404
          </h1>
          <h2 className="text-3xl font-bold text-white mb-6">Page Not Found</h2>
          <p className="text-navy-300 mb-8 max-w-md mx-auto">
            The page you are looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-brand/25"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
