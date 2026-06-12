import React from 'react';
import { FileText, MessageCircle, TrendingUp, Calendar } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction, 
  size = "md" 
}) {
  // Size-dependent icon and title sizes
  const sizes = {
    sm: {
      iconContainer: "w-12 h-12 mb-3",
      icon: "w-6 h-6",
      title: "text-md"
    },
    md: {
      iconContainer: "w-16 h-16 mb-4",
      icon: "w-8 h-8",
      title: "text-xl"
    },
    lg: {
      iconContainer: "w-20 h-20 mb-5",
      icon: "w-10 h-10",
      title: "text-2xl"
    }
  };

  const selectedSize = sizes[size] || sizes.md;

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md max-w-lg mx-auto w-full">
      {Icon && (
        <div className={`rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/10 shadow-lg shadow-blue-500/5 ${selectedSize.iconContainer}`}>
          <Icon className={`text-blue-400 opacity-80 ${selectedSize.icon}`} />
        </div>
      )}
      
      <h3 className={`text-white font-outfit font-semibold tracking-tight ${selectedSize.title}`}>
        {title}
      </h3>
      
      {description && (
        <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto text-center leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Pre-built named instances
export const NoNotes = () => (
  <EmptyState 
    icon={FileText} 
    title="No Notes Yet" 
    description="Admin will upload study materials soon." 
    size="md"
  />
);

export const NoDoubts = () => (
  <EmptyState 
    icon={MessageCircle} 
    title="No Doubts Yet" 
    description="Be the first to ask a question!" 
    size="md"
  />
);

export const NoHistory = ({ onAction }) => (
  <EmptyState 
    icon={TrendingUp} 
    title="No Quiz History" 
    description="Take your first quiz to see your progress here." 
    actionLabel="Start a Quiz"
    onAction={onAction}
    size="md"
  />
);

export const NoEvents = () => (
  <EmptyState 
    icon={Calendar} 
    title="No Events" 
    description="No upcoming events scheduled." 
    size="md"
  />
);
