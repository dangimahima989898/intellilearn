import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="aurora-orb w-96 h-96 bg-blue-500 top-10 left-10" style={{ animationDelay: '0s' }} />
        <div className="aurora-orb w-80 h-80 bg-violet-500 bottom-20 right-5" style={{ animationDelay: '3s' }} />
        <div className="aurora-orb w-64 h-64 bg-teal-500 top-1/2 left-1/2" style={{ animationDelay: '5s' }} />
      </div>

      {/* Main Card Content */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 text-center max-w-md w-full backdrop-blur-md shadow-2xl relative z-10 space-y-6 select-none scale-in">
        <div className="space-y-2">
          {/* large "404" (text-8xl font-outfit font-bold gradient-text) */}
          <h1 className="text-8xl font-outfit font-extrabold gradient-text tracking-tighter animate-pulse-slow">
            404
          </h1>
          {/* "Oops! Page not found" (text-2xl text-white mt-4) */}
          <h2 className="text-2xl font-outfit font-bold text-white tracking-tight">
            Oops! Page not found
          </h2>
          {/* "The page you're looking for doesn't exist or has been moved." (text-white/50 text-center max-w-sm mt-2) */}
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Two buttons: "← Go Back" (ghost) + "Go to Dashboard" (gradient) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
