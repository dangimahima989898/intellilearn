import React from 'react';

/**
 * Loading Skeleton Components
 * 
 * Usage examples:
 * // {loading ? <CardSkeleton /> : <ActualCard />}
 * // {loading ? <TableRowSkeleton /> : <ActualRow />}
 * // {loading ? <TextSkeleton width="w-32" height="h-5" /> : <ActualText />}
 * // {loading ? <ChartSkeleton /> : <ActualChart />}
 */

// CardSkeleton: glass card shape, h-40, .skeleton class
export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-40 flex flex-col justify-between relative overflow-hidden">
      <div className="skeleton w-12 h-12 rounded-xl" />
      <div className="space-y-3">
        <div className="skeleton w-3/4 h-5 rounded-lg" />
        <div className="skeleton w-1/2 h-4 rounded-lg" />
      </div>
    </div>
  );
}

// TableRowSkeleton: h-14 with 4 column-width divs inside, .skeleton
export function TableRowSkeleton() {
  return (
    <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 gap-6 w-full">
      <div className="skeleton w-1/4 h-5 rounded-lg" />
      <div className="skeleton w-1/6 h-5 rounded-lg" />
      <div className="skeleton w-1/5 h-5 rounded-lg" />
      <div className="skeleton w-1/12 h-5 rounded-lg" />
    </div>
  );
}

// TextSkeleton: props: width ("w-48"), height ("h-4"), + .skeleton class rounded-lg
export function TextSkeleton({ width = "w-48", height = "h-4" }) {
  return (
    <div className={`skeleton rounded-lg ${width} ${height}`} />
  );
}

// ChartSkeleton: h-48 glass card with .skeleton
export function ChartSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-48 flex items-end justify-between gap-3 relative overflow-hidden w-full">
      <div className="skeleton w-[10%] h-[35%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[60%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[40%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[80%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[50%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[70%] rounded-t-md" />
      <div className="skeleton w-[10%] h-[30%] rounded-t-md" />
    </div>
  );
}
