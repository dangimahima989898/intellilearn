import React from 'react';

export default function PageWrapper({ children }) {
  return (
    <div className="animate-fade-in w-full h-full">
      {children}
    </div>
  );
}
