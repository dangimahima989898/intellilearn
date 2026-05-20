import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-navy-800/50 rounded-3xl border border-navy-700/50">
      {Icon && (
        <div className="w-20 h-20 bg-navy-900 rounded-full flex items-center justify-center mb-6 shadow-inset">
          <Icon className="w-10 h-10 text-navy-400" />
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-navy-300 max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
