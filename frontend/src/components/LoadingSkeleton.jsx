import React from 'react';

// CSS for shimmer effect
const shimmerBase = "relative overflow-hidden bg-navy-800 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

export function CardSkeleton() {
  return (
    <div className={`rounded-3xl p-6 border border-navy-700 ${shimmerBase}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-navy-700/50" />
        <div className="w-20 h-8 rounded-full bg-navy-700/50" />
      </div>
      <div className="w-3/4 h-6 rounded-lg bg-navy-700/50 mb-4" />
      <div className="w-1/2 h-4 rounded-lg bg-navy-700/50" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className={`w-full h-16 rounded-xl mb-4 ${shimmerBase}`} />
  );
}

export function TextSkeleton({ className = "w-full h-4" }) {
  return (
    <div className={`rounded flex-shrink-0 ${className} ${shimmerBase}`} />
  );
}

export function ChartSkeleton() {
  return (
    <div className={`w-full h-64 rounded-xl flex items-end justify-between p-4 ${shimmerBase}`}>
      <div className="w-[10%] h-[30%] bg-navy-700/50 rounded-t" />
      <div className="w-[10%] h-[50%] bg-navy-700/50 rounded-t" />
      <div className="w-[10%] h-[70%] bg-navy-700/50 rounded-t" />
      <div className="w-[10%] h-[40%] bg-navy-700/50 rounded-t" />
      <div className="w-[10%] h-[80%] bg-navy-700/50 rounded-t" />
      <div className="w-[10%] h-[60%] bg-navy-700/50 rounded-t" />
    </div>
  );
}
