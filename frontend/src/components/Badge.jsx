import React from 'react';

const COLORS = {
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  teal: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  grey: "bg-white/10 text-white/50 border-white/20"
};

const SIZES = {
  sm: "text-[10px] px-2 py-0.5 tracking-wider",
  md: "text-xs px-2.5 py-0.5 tracking-normal"
};

export default function Badge({ 
  color = "blue", 
  size = "md", 
  children 
}) {
  const colorClass = COLORS[color] || COLORS.blue;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${colorClass} ${sizeClass} select-none`}>
      {children}
    </span>
  );
}
